import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Play, CheckCircle, Clock, Heart, Users, Activity, Thermometer, UserCheck, Save, X, AlertCircle, Video } from 'lucide-react';
import { AuthButton } from '../auth/AuthButton';
import { AddMedicalRecordModal } from '../patients/AddMedicalRecordModal';
import { TelehealthRoom } from '../telehealth/TelehealthRoom';

interface VitalSigns {
  temperature_f: number | null;
  pulse_bpm: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  weight_kg: number | null;
  spo2_percent: number | null;
  respiratory_rate_bpm: number | null;
}

interface QueueItem {
  id: string;
  slot_start: string;
  status: 'confirmed' | 'checked_in' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  doctor_id: string;
  patients: {
    id: string;
    name: string;
    phone: string;
    dob: string | null;
    gender: string | null;
  } | null;
  profiles: {
    id: string;
    name: string;
  } | null;
  opd_vitals: VitalSigns | null;
}

export const OpdQueue: React.FC = () => {
  const { profile } = useAuth();
  const isDoctor = profile?.role === 'doctor';
  const isStaffOrAdmin = profile?.role === 'staff' || profile?.role === 'admin';

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Vitals entry modal
  const [selectedVitalsAppt, setSelectedVitalsAppt] = useState<QueueItem | null>(null);
  const [tempF, setTempF] = useState('');
  const [pulse, setPulse] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [weight, setWeight] = useState('');
  const [spo2, setSpo2] = useState('');
  const [respRate, setRespRate] = useState('');
  
  // Vitals display modal
  const [viewVitalsAppt, setViewVitalsAppt] = useState<QueueItem | null>(null);

  // EMR prescription write modal
  const [consultAppt, setConsultAppt] = useState<QueueItem | null>(null);
  const [telehealthAppt, setTelehealthAppt] = useState<QueueItem | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBaselineData = useCallback(async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true);
      setDoctors(data || []);

      // If logged in as doctor, default the filter to self
      if (isDoctor) {
        setSelectedDoctorFilter(profile.id);
      }
    } catch (err) {
      console.error('Error fetching baseline data:', err);
    }
  }, [profile, isDoctor]);

  const fetchQueue = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().substring(0, 10);
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      let query = supabase
        .from('appointments')
        .select(`
          id,
          slot_start,
          status,
          notes,
          doctor_id,
          patients (id, name, phone, dob, gender),
          profiles!appointments_doctor_id_fkey (id, name),
          opd_vitals (
            temperature_f,
            pulse_bpm,
            systolic_bp,
            diastolic_bp,
            weight_kg,
            spo2_percent,
            respiratory_rate_bpm
          )
        `)
        .eq('clinic_id', profile.clinic_id)
        .gte('slot_start', startOfDay)
        .lte('slot_start', endOfDay)
        .order('slot_start', { ascending: true });

      if (selectedDoctorFilter !== 'all') {
        query = query.eq('doctor_id', selectedDoctorFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setQueue((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching OPD queue:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id, selectedDoctorFilter]);

  useEffect(() => {
    fetchBaselineData();
  }, [fetchBaselineData]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleStatusChange = async (apptId: string, newStatus: QueueItem['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', apptId);

      if (error) throw error;
      fetchQueue();
    } catch (err) {
      console.error('Error modifying queue status:', err);
    }
  };

  const openVitalsEntry = (appt: QueueItem) => {
    setSelectedVitalsAppt(appt);
    const existing = appt.opd_vitals;
    setTempF(existing?.temperature_f?.toString() || '');
    setPulse(existing?.pulse_bpm?.toString() || '');
    setSystolic(existing?.systolic_bp?.toString() || '');
    setDiastolic(existing?.diastolic_bp?.toString() || '');
    setWeight(existing?.weight_kg?.toString() || '');
    setSpo2(existing?.spo2_percent?.toString() || '');
    setRespRate(existing?.respiratory_rate_bpm?.toString() || '');
    setErrorMsg('');
  };

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVitalsAppt || !profile?.clinic_id) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const vitalsPayload = {
        clinic_id: profile.clinic_id,
        appointment_id: selectedVitalsAppt.id,
        temperature_f: tempF ? Number(tempF) : null,
        pulse_bpm: pulse ? Number(pulse) : null,
        systolic_bp: systolic ? Number(systolic) : null,
        diastolic_bp: diastolic ? Number(diastolic) : null,
        weight_kg: weight ? Number(weight) : null,
        spo2_percent: spo2 ? Number(spo2) : null,
        respiratory_rate_bpm: respRate ? Number(respRate) : null,
      };

      // Perform upsert (since appointment_id is unique)
      const { error } = await supabase
        .from('opd_vitals')
        .upsert(vitalsPayload, { onConflict: 'appointment_id' });

      if (error) throw error;

      // Automatically move patient status to checked_in (arrived) when vitals are saved
      if (selectedVitalsAppt.status === 'confirmed') {
        await supabase
          .from('appointments')
          .update({ status: 'checked_in' })
          .eq('id', selectedVitalsAppt.id);
      }

      setSelectedVitalsAppt(null);
      fetchQueue();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save patient vitals.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Filters Toolbar */}
      <div style={toolbarStyle}>
        <div style={queueHeadingStyle}>
          <Users size={24} className="accent-color" />
          <h2 style={{ fontSize: '1.25rem' }}>OPD Consultation Queue</h2>
        </div>

        {/* Doctor filter (hidden if logged-in user is doctor) */}
        {!isDoctor && (
          <div style={filterStyle}>
            <FilterIcon size={16} />
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              style={selectFilterStyle}
            >
              <option value="all">All Doctors' Queues</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Queue Listing Dashboard */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading consultation queue...</div>
      ) : queue.length === 0 ? (
        <div className="dashboard-card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <Activity size={48} style={{ color: 'var(--border-color)', margin: '0 auto 1.5rem', display: 'block' }} />
          <h3>Consultation Queue Empty</h3>
          <p style={{ marginTop: '0.5rem' }}>There are no patients scheduled or checked-in for consultation today.</p>
        </div>
      ) : (
        <div style={queueListStyle}>
          
          {/* Waiting / Checked-In Group */}
          <div style={queueSectionStyle}>
            <h3 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              Checked-In & Vitals Registered
            </h3>
            
            <div style={cardGridStyle}>
              {queue
                .filter((item) => item.status === 'checked_in')
                .map((item) => (
                  <div key={item.id} style={queueCardStyle('#f59e0b')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.patients?.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Time: {new Date(item.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setViewVitalsAppt(item)}
                        style={vitalsBadgeStyle(!!item.opd_vitals)}
                      >
                        <Thermometer size={14} /> Vitals
                      </button>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      Consulting: Dr. {item.profiles?.name}
                    </p>

                    <div style={cardActionsStyle}>
                      {isDoctor && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => {
                              handleStatusChange(item.id, 'in_consultation');
                              setConsultAppt(item);
                            }}
                            className="btn btn-primary"
                            style={actionBtnStyle}
                          >
                            <Play size={14} /> Start Consult
                          </button>
                          <button
                            onClick={() => {
                              handleStatusChange(item.id, 'in_consultation');
                              setTelehealthAppt(item);
                            }}
                            className="btn btn-secondary"
                            style={{ ...actionBtnStyle, backgroundColor: '#6366f1', color: '#ffffff' }}
                          >
                            <Video size={14} /> Video Call
                          </button>
                        </div>
                      )}
                      {isStaffOrAdmin && (
                        <button
                          onClick={() => openVitalsEntry(item)}
                          className="btn btn-secondary"
                          style={actionBtnStyle}
                        >
                          Update Vitals
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {queue.filter((item) => item.status === 'checked_in').length === 0 && (
                <p style={emptySectionTextStyle}>No patients waiting.</p>
              )}
            </div>
          </div>

          {/* In Consultation Group */}
          <div style={queueSectionStyle}>
            <h3 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
              Active Consultation
            </h3>

            <div style={cardGridStyle}>
              {queue
                .filter((item) => item.status === 'in_consultation')
                .map((item) => (
                  <div key={item.id} style={queueCardStyle('var(--accent-primary)')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.patients?.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Start Time: {new Date(item.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setViewVitalsAppt(item)}
                        style={vitalsBadgeStyle(!!item.opd_vitals)}
                      >
                        <Thermometer size={14} /> Vitals
                      </button>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      Consulting: Dr. {item.profiles?.name}
                    </p>

                    <div style={cardActionsStyle}>
                      {isDoctor && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => setConsultAppt(item)}
                            className="btn btn-primary"
                            style={actionBtnStyle}
                          >
                            <CheckCircle size={14} /> Write Rx
                          </button>
                          <button
                            onClick={() => setTelehealthAppt(item)}
                            className="btn btn-secondary"
                            style={{ ...actionBtnStyle, backgroundColor: '#6366f1', color: '#ffffff' }}
                          >
                            <Video size={14} /> Telehealth
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => handleStatusChange(item.id, 'checked_in')}
                        className="btn btn-secondary"
                        style={actionBtnStyle}
                      >
                        Send Back to Queue
                      </button>
                    </div>
                  </div>
                ))}
              {queue.filter((item) => item.status === 'in_consultation').length === 0 && (
                <p style={emptySectionTextStyle}>No active consultations.</p>
              )}
            </div>
          </div>

          {/* Appointments Awaiting Check-In Group */}
          <div style={queueSectionStyle}>
            <h3 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6b7280' }} />
              Scheduled Today (Awaiting Arrival)
            </h3>

            <div style={cardGridStyle}>
              {queue
                .filter((item) => item.status === 'confirmed')
                .map((item) => (
                  <div key={item.id} style={queueCardStyle('#6b7280')}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.patients?.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Slot: {new Date(item.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      Consulting: Dr. {item.profiles?.name}
                    </p>

                    <div style={cardActionsStyle}>
                      {isStaffOrAdmin && (
                        <button
                          onClick={() => openVitalsEntry(item)}
                          className="btn btn-primary"
                          style={actionBtnStyle}
                        >
                          <UserCheck size={14} /> Check In & Vitals
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(item.id, 'no_show')}
                        className="btn btn-secondary"
                        style={actionBtnStyle}
                      >
                        No Show
                      </button>
                    </div>
                  </div>
                ))}
              {queue.filter((item) => item.status === 'confirmed').length === 0 && (
                <p style={emptySectionTextStyle}>All scheduled patients checked-in.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vitals Input Dialog */}
      {selectedVitalsAppt && (
        <div className="modal-overlay" style={overlayStyle}>
          <div className="modal-content" style={{ ...contentStyle, maxWidth: '480px' }}>
            <div className="modal-header" style={headerStyle}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Patient Vitals Entry</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Record clinical parameters for <strong>{selectedVitalsAppt.patients?.name}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedVitalsAppt(null)} style={closeBtnStyle}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleVitalsSubmit}>
              <div style={formGrid2Style}>
                <div className="form-group">
                  <label>Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={tempF}
                    onChange={(e) => setTempF(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="form-group">
                  <label>Pulse Rate (BPM)</label>
                  <input
                    type="number"
                    placeholder="72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="form-group">
                  <label>Blood Pressure (Systolic)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="form-group">
                  <label>Blood Pressure (Diastolic)</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="form-group">
                  <label>Oxygen SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="form-group">
                  <label>Respiratory Rate (BPM)</label>
                  <input
                    type="number"
                    placeholder="18"
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="65.4"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedVitalsAppt(null)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Saving Vitals...">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Save size={16} /> Save Vitals
                  </div>
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Vitals Dialog */}
      {viewVitalsAppt && (
        <div className="modal-overlay" style={overlayStyle}>
          <div className="modal-content" style={{ ...contentStyle, maxWidth: '420px' }}>
            <div className="modal-header" style={headerStyle}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Patient Vital Signs</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Recorded vitals for <strong>{viewVitalsAppt.patients?.name}</strong>
                </p>
              </div>
              <button onClick={() => setViewVitalsAppt(null)} style={closeBtnStyle}>
                <X size={20} />
              </button>
            </div>

            {viewVitalsAppt.opd_vitals ? (
              <div style={vitalsGridStyle}>
                <div style={vitalCardStyle}>
                  <Thermometer size={20} className="accent-color" />
                  <div>
                    <span style={vitalLabelStyle}>Temperature</span>
                    <strong style={vitalValStyle}>{viewVitalsAppt.opd_vitals.temperature_f ? `${viewVitalsAppt.opd_vitals.temperature_f} °F` : '-'}</strong>
                  </div>
                </div>
                <div style={vitalCardStyle}>
                  <Heart size={20} style={{ color: '#ef4444' }} />
                  <div>
                    <span style={vitalLabelStyle}>Pulse Rate</span>
                    <strong style={vitalValStyle}>{viewVitalsAppt.opd_vitals.pulse_bpm ? `${viewVitalsAppt.opd_vitals.pulse_bpm} BPM` : '-'}</strong>
                  </div>
                </div>
                <div style={vitalCardStyle}>
                  <Activity size={20} style={{ color: '#10b981' }} />
                  <div>
                    <span style={vitalLabelStyle}>Blood Pressure</span>
                    <strong style={vitalValStyle}>
                      {viewVitalsAppt.opd_vitals.systolic_bp && viewVitalsAppt.opd_vitals.diastolic_bp 
                        ? `${viewVitalsAppt.opd_vitals.systolic_bp}/${viewVitalsAppt.opd_vitals.diastolic_bp} mmHg` 
                        : '-'}
                    </strong>
                  </div>
                </div>
                <div style={vitalCardStyle}>
                  <Clock size={20} style={{ color: '#06b6d4' }} />
                  <div>
                    <span style={vitalLabelStyle}>Oxygen SpO2</span>
                    <strong style={vitalValStyle}>{viewVitalsAppt.opd_vitals.spo2_percent ? `${viewVitalsAppt.opd_vitals.spo2_percent} %` : '-'}</strong>
                  </div>
                </div>
                <div style={vitalCardStyle}>
                  <Activity size={20} style={{ color: '#6366f1' }} />
                  <div>
                    <span style={vitalLabelStyle}>Respiratory Rate</span>
                    <strong style={vitalValStyle}>{viewVitalsAppt.opd_vitals.respiratory_rate_bpm ? `${viewVitalsAppt.opd_vitals.respiratory_rate_bpm} BPM` : '-'}</strong>
                  </div>
                </div>
                <div style={vitalCardStyle}>
                  <Users size={20} style={{ color: '#f59e0b' }} />
                  <div>
                    <span style={vitalLabelStyle}>Weight</span>
                    <strong style={vitalValStyle}>{viewVitalsAppt.opd_vitals.weight_kg ? `${viewVitalsAppt.opd_vitals.weight_kg} kg` : '-'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No vital signs registered for this patient consult.
              </p>
            )}

            <button
              onClick={() => setViewVitalsAppt(null)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.625rem' }}
            >
              Close Vitals
            </button>
          </div>
        </div>
      )}

      {/* Consult / Write Prescription Modal */}
      {consultAppt && consultAppt.patients && (
        <AddMedicalRecordModal
          patientId={consultAppt.patients.id}
          patientName={consultAppt.patients.name}
          onClose={() => setConsultAppt(null)}
          onSuccess={async () => {
            // Once consult record is submitted, mark the appointment status as completed automatically
            await supabase
              .from('appointments')
              .update({ status: 'completed' })
              .eq('id', consultAppt.id);
            
            setConsultAppt(null);
            fetchQueue();
          }}
        />
      )}

      {/* Telehealth Room Modal */}
      {telehealthAppt && telehealthAppt.patients && (
        <TelehealthRoom
          appointmentId={telehealthAppt.id}
          patientId={telehealthAppt.patients.id}
          patientName={telehealthAppt.patients.name}
          doctorId={telehealthAppt.doctor_id}
          doctorName={profile?.name || 'Practitioner'}
          role="doctor"
          onClose={() => {
            setTelehealthAppt(null);
            fetchQueue();
          }}
        />
      )}

    </div>
  );
};

// Custom Filter Icon component since we didn't import it
const FilterIcon: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 16, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// Style objects
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
};

const queueHeadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const filterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.875rem',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  minWidth: '200px',
};

const selectFilterStyle: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  cursor: 'pointer',
  width: '100%',
};

const queueListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
};

const queueSectionStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-sm)',
};

const cardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '1rem',
};

const queueCardStyle = (borderColor: string): React.CSSProperties => ({
  backgroundColor: 'var(--bg-primary)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  borderTop: `4px solid ${borderColor}`,
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: '0.75rem',
  boxShadow: 'var(--shadow-sm)',
});

const vitalsBadgeStyle = (hasVitals: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: '0.75rem',
  padding: '0.25rem 0.5rem',
  borderRadius: '50px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  backgroundColor: hasVitals ? '#ecfdf5' : '#fee2e2',
  color: hasVitals ? '#065f46' : '#b91c1c',
});

const cardActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  marginTop: '0.5rem',
};

const actionBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem',
  fontSize: '0.8rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.25rem',
};

const emptySectionTextStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.9rem',
  fontStyle: 'italic',
  gridColumn: 'span 3',
  padding: '1rem 0',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

const contentStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  width: '100%',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border-color)',
  padding: '2rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.75rem',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
};

const formGrid2Style: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
};

const vitalsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const vitalCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.875rem',
  backgroundColor: 'var(--bg-primary)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
};

const vitalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const vitalValStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--text-primary)',
};

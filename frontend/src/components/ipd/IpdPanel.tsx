import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Plus, Users, LogOut, Clipboard, Bed, Activity, X } from 'lucide-react';
import { AuthButton } from '../auth/AuthButton';
import { AuthInput } from '../auth/AuthInput';

interface BedInfo {
  id: string;
  room_no: string;
  bed_no: string;
  ward_type: 'general' | 'semi_private' | 'private' | 'icu';
  rate_per_day: number;
  status: 'available' | 'occupied' | 'maintenance';
}

interface Admission {
  id: string;
  admission_date: string;
  discharge_date: string | null;
  provisional_diagnosis: string;
  status: 'admitted' | 'discharged';
  treatment_logs: Array<{ date: string; note: string; type: string; writer: string }>;
  patients: {
    id: string;
    name: string;
    phone: string;
  } | null;
  profiles: {
    name: string;
  } | null;
  beds: {
    id: string;
    room_no: string;
    bed_no: string;
    ward_type: string;
  } | null;
}

export const IpdPanel: React.FC = () => {
  const { profile } = useAuth();

  const [beds, setBeds] = useState<BedInfo[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [patients, setPatients] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'admissions' | 'beds'>('admissions');

  // Add Bed Form Modal States
  const [showAddBed, setShowAddBed] = useState(false);
  const [bedRoom, setBedRoom] = useState('');
  const [bedNum, setBedNum] = useState('');
  const [bedWard, setBedWard] = useState<'general' | 'semi_private' | 'private' | 'icu'>('general');
  const [bedRate, setBedRate] = useState('');

  // Admit Patient Modal States
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitPatientId, setAdmitPatientId] = useState('');
  const [admitBedId, setAdmitBedId] = useState('');
  const [admitDoctorId, setAdmitDoctorId] = useState('');
  const [admitDiag, setAdmitDiag] = useState('');

  // Add Treatment Log Modal States
  const [activeLogAdmit, setActiveLogAdmit] = useState<Admission | null>(null);
  const [logType, setLogType] = useState('Nursing Progress');
  const [logText, setLogText] = useState('');

  // Discharge Patient Modal States
  const [dischargeAdmit, setDischargeAdmit] = useState<Admission | null>(null);
  const [dischargeNotes, setDischargeNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      // 1. Fetch beds
      const { data: dbBeds } = await supabase
        .from('beds')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('room_no', { ascending: true })
        .order('bed_no', { ascending: true });
      setBeds(dbBeds || []);

      // 2. Fetch active and past IPD admissions
      const { data: dbAdmits } = await supabase
        .from('ipd_admissions')
        .select(`
          id,
          admission_date,
          discharge_date,
          provisional_diagnosis,
          status,
          treatment_logs,
          patients (id, name, phone),
          profiles (name),
          beds (id, room_no, bed_no, ward_type)
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('status', { ascending: true }) // Admitted first
        .order('admission_date', { ascending: false });
      setAdmissions((dbAdmits || []) as any[]);

      // 3. Fetch clinic patients list
      const { data: dbPatients } = await supabase
        .from('patients')
        .select('id, name, phone')
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true });
      setPatients(dbPatients || []);

      // 4. Fetch clinic doctors list
      const { data: dbDocs } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true);
      setDoctors(dbDocs || []);
    } catch (err) {
      console.error('Error fetching IPD data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id || !bedRoom.trim() || !bedNum.trim() || !bedRate) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('beds').insert({
        clinic_id: profile.clinic_id,
        room_no: bedRoom.trim(),
        bed_no: bedNum.trim(),
        ward_type: bedWard,
        rate_per_day: Number(bedRate),
        status: 'available',
      });

      if (error) {
        if (error.message.includes('bed_unique')) {
          throw new Error('A bed with this room number and bed designation already exists.');
        }
        throw error;
      }

      setBedRoom('');
      setBedNum('');
      setBedRate('');
      setShowAddBed(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add bed profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id || !admitPatientId || !admitBedId || !admitDoctorId || !admitDiag.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('ipd_admissions').insert({
        clinic_id: profile.clinic_id,
        patient_id: admitPatientId,
        bed_id: admitBedId,
        doctor_id: admitDoctorId,
        provisional_diagnosis: admitDiag.trim(),
        status: 'admitted',
        treatment_logs: [],
      });

      if (error) throw error;

      setAdmitPatientId('');
      setAdmitBedId('');
      setAdmitDoctorId('');
      setAdmitDiag('');
      setShowAdmitModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete patient admission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLogAdmit || !logText.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const newLog = {
        date: new Date().toISOString(),
        type: logType,
        note: logText.trim(),
        writer: profile?.name || 'Staff',
      };

      const updatedLogs = [...(activeLogAdmit.treatment_logs || []), newLog];

      const { error } = await supabase
        .from('ipd_admissions')
        .update({ treatment_logs: updatedLogs })
        .eq('id', activeLogAdmit.id);

      if (error) throw error;

      setLogText('');
      setActiveLogAdmit(null);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to append nursing/progress note.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeAdmit) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('ipd_admissions')
        .update({
          status: 'discharged',
          discharge_date: new Date().toISOString(),
          discharge_notes: dischargeNotes.trim() || null,
        })
        .eq('id', dischargeAdmit.id);

      if (error) throw error;

      setDischargeNotes('');
      setDischargeAdmit(null);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to discharge patient.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Sub-Header Tabs */}
      <div style={headerNavStyle}>
        <div className="tab-container" style={{ margin: 0 }}>
          <button
            className={`tab-btn ${activeTab === 'admissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('admissions')}
          >
            <Users size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
            IPD Patient Admissions
          </button>
          <button
            className={`tab-btn ${activeTab === 'beds' ? 'active' : ''}`}
            onClick={() => setActiveTab('beds')}
          >
            <Bed size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
            Wards & Beds Registry
          </button>
        </div>

        {activeTab === 'beds' && (
          <button
            onClick={() => setShowAddBed(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem' }}
          >
            <Plus size={16} /> Configure Bed
          </button>
        )}
        {activeTab === 'admissions' && (
          <button
            onClick={() => {
              if (doctors.length > 0) setAdmitDoctorId(doctors[0].id);
              const openBed = beds.find((b) => b.status === 'available');
              if (openBed) setAdmitBedId(openBed.id);
              if (patients.length > 0) setAdmitPatientId(patients[0].id);
              setShowAdmitModal(true);
            }}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem' }}
            disabled={beds.filter((b) => b.status === 'available').length === 0}
          >
            <Plus size={16} /> Admit Patient
          </button>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="dashboard-card" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading IPD register...</div>
        ) : activeTab === 'beds' ? (
          
          /* Beds List Grid */
          beds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No ward beds registered yet. Click "Configure Bed" to add.
            </div>
          ) : (
            <div style={bedsGridStyle}>
              {beds.map((b) => (
                <div key={b.id} style={bedCardStyle(b.status)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bed size={20} className="accent-color" />
                      <strong style={{ fontSize: '1.05rem' }}>{b.room_no} - {b.bed_no}</strong>
                    </div>
                    <span style={bedStatusBadgeStyle(b.status)}>{b.status.toUpperCase()}</span>
                  </div>
                  
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div>Ward Type: <strong style={{ textTransform: 'capitalize' }}>{b.ward_type.replace('_', ' ')}</strong></div>
                    <div style={{ marginTop: '0.25rem' }}>Daily Rate: <strong>₹{b.rate_per_day}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          
          /* Admissions Timeline / List */
          admissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No patient admissions recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {admissions.map((adm) => (
                <div key={adm.id} style={admitRowStyle(adm.status)}>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{adm.patients?.name}</h4>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '50px', backgroundColor: adm.status === 'admitted' ? '#fee2e2' : '#ecfdf5', color: adm.status === 'admitted' ? '#b91c1c' : '#065f46', fontWeight: 600 }}>
                        {adm.status.toUpperCase()}
                      </span>
                      {adm.beds && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Ward Bed: <strong>{adm.beds.room_no} ({adm.beds.bed_no})</strong>
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div>Provisional Diagnosis: <strong>{adm.provisional_diagnosis}</strong></div>
                      <div>Attending Doctor: <strong>Dr. {adm.profiles?.name || 'Unknown'}</strong></div>
                      <div>Admitted: <strong>{new Date(adm.admission_date).toLocaleString()}</strong></div>
                      {adm.status === 'discharged' && adm.discharge_date && (
                        <div>Discharged: <strong>{new Date(adm.discharge_date).toLocaleString()}</strong></div>
                      )}
                    </div>

                    {/* Progress treatment logs display */}
                    {adm.treatment_logs && adm.treatment_logs.length > 0 && (
                      <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>Clinical Log Timeline:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '120px', overflowY: 'auto' }}>
                          {adm.treatment_logs.map((log, lIdx) => (
                            <div key={lIdx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--accent-primary)', minWidth: '70px' }}>{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:</span>
                              <strong>[{log.type}]</strong>
                              <span>{log.note}</span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>- {log.writer}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                    {adm.status === 'admitted' && (
                      <>
                        <button
                          onClick={() => setActiveLogAdmit(adm)}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Clipboard size={14} /> Add Log
                        </button>
                        <button
                          onClick={() => setDischargeAdmit(adm)}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                        >
                          <LogOut size={14} /> Discharge
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Add Bed Modal */}
      {showAddBed && (
        <div className="modal-overlay" style={overlayStyle}>
          <div className="modal-content" style={{ ...contentStyle, maxWidth: '420px' }}>
            <div className="modal-header" style={headerStyle}>
              <h2>Configure Clinic Bed</h2>
              <button onClick={() => setShowAddBed(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddBedSubmit} className="auth-form">
              <AuthInput
                label="Room Number / Designation *"
                icon={Bed}
                type="text"
                placeholder="Room 102"
                value={bedRoom}
                onChange={(e) => setBedRoom(e.target.value)}
                disabled={submitting}
                required
              />

              <AuthInput
                label="Bed Code / Number *"
                icon={Bed}
                type="text"
                placeholder="Bed A"
                value={bedNum}
                onChange={(e) => setBedNum(e.target.value)}
                disabled={submitting}
                required
              />

              <div className="form-group">
                <label>Ward Category *</label>
                <select
                  value={bedWard}
                  onChange={(e) => setBedWard(e.target.value as any)}
                  style={selectStyle}
                  disabled={submitting}
                >
                  <option value="general">General Ward</option>
                  <option value="semi_private">Semi-Private</option>
                  <option value="private">Private Room</option>
                  <option value="icu">ICU (Intensive Care)</option>
                </select>
              </div>

              <AuthInput
                label="Daily Charge Rate (INR) *"
                icon={Activity} // Reusing Activity for daily rate
                type="number"
                placeholder="1500"
                value={bedRate}
                onChange={(e) => setBedRate(e.target.value)}
                disabled={submitting}
                required
              />

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddBed(false)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Creating...">
                  Register Bed
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admit Patient Modal */}
      {showAdmitModal && (
        <div className="modal-overlay" style={overlayStyle}>
          <div className="modal-content" style={{ ...contentStyle, maxWidth: '480px' }}>
            <div className="modal-header" style={headerStyle}>
              <h2>IPD Patient Admission Form</h2>
              <button onClick={() => setShowAdmitModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAdmitSubmit} className="auth-form">
              <div className="form-group">
                <label>Select Patient File *</label>
                <select
                  value={admitPatientId}
                  onChange={(e) => setAdmitPatientId(e.target.value)}
                  style={selectStyle}
                  required
                >
                  <option value="" disabled>Choose Patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone || 'No phone'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Available Bed *</label>
                <select
                  value={admitBedId}
                  onChange={(e) => setAdmitBedId(e.target.value)}
                  style={selectStyle}
                  required
                >
                  <option value="" disabled>Choose Available Bed</option>
                  {beds
                    .filter((b) => b.status === 'available')
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.room_no} - {b.bed_no} ({b.ward_type.toUpperCase()} | ₹{b.rate_per_day}/day)
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Attending Doctor *</label>
                <select
                  value={admitDoctorId}
                  onChange={(e) => setAdmitDoctorId(e.target.value)}
                  style={selectStyle}
                  required
                >
                  <option value="" disabled>Choose Attending Doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Provisional Diagnosis *</label>
                <textarea
                  placeholder="Reason for ward admission..."
                  value={admitDiag}
                  onChange={(e) => setAdmitDiag(e.target.value)}
                  style={textareaStyle}
                  rows={2}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdmitModal(false)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Admitting...">
                  Admit Patient
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Treatment Log Modal */}
      {activeLogAdmit && (
        <div className="modal-overlay" style={overlayStyle}>
          <div className="modal-content" style={{ ...contentStyle, maxWidth: '420px' }}>
            <div className="modal-header" style={headerStyle}>
              <div>
                <h2>Add Patient Progress Note</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Appends to <strong>{activeLogAdmit.patients?.name}</strong>'s treatment sheet
                </p>
              </div>
              <button onClick={() => setActiveLogAdmit(null)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddLogSubmit} className="auth-form">
              <div className="form-group">
                <label>Log Type / Category</label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value)}
                  style={selectStyle}
                >
                  <option value="Nursing Progress">Nursing Progress Note</option>
                  <option value="Doctor Rounds">Doctor Rounds Note</option>
                  <option value="Medication Admin">Medication Administration</option>
                  <option value="Lab Sample Taken">Lab Sample Collection</option>
                  <option value="General Alert">General Clinical Alert</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes / Findings *</label>
                <textarea
                  placeholder="Record patient vitals checked, IV drip replacement, or attending observations..."
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  style={textareaStyle}
                  rows={4}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveLogAdmit(null)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Adding...">
                  Append Note
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discharge Patient Modal */}
      {dischargeAdmit && (
        <div className="modal-overlay" style={overlayStyle}>
          <div className="modal-content" style={{ ...contentStyle, maxWidth: '420px' }}>
            <div className="modal-header" style={headerStyle}>
              <div>
                <h2>Complete Patient Discharge</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Marking <strong>{dischargeAdmit.patients?.name}</strong> discharged from bed
                </p>
              </div>
              <button onClick={() => setDischargeAdmit(null)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleDischargeSubmit} className="auth-form">
              <div className="form-group">
                <label>Discharge Notes / Final Diagnosis</label>
                <textarea
                  placeholder="Patient clinically stable. Discharged on prescription meds (Tab Amlodipine 5mg). Regular BP monitoring advised."
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  style={textareaStyle}
                  rows={4}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDischargeAdmit(null)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                  disabled={submitting}
                >
                  Confirm Discharge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Styling
const headerNavStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
};

const bedsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '1rem',
};

const bedCardStyle = (status: string): React.CSSProperties => {
  let borderCol = '1px solid var(--border-color)';
  if (status === 'occupied') borderCol = '2px solid #fee2e2';
  else if (status === 'available') borderCol = '2px solid #dcfce7';

  return {
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: '1.25rem',
    border: borderCol,
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };
};

const bedStatusBadgeStyle = (status: string): React.CSSProperties => {
  let bg = '#f3f4f6';
  let color = '#4b5563';
  if (status === 'available') {
    bg = '#dcfce7';
    color = '#15803d';
  } else if (status === 'occupied') {
    bg = '#fee2e2';
    color = '#b91c1c';
  }

  return {
    padding: '0.2rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: 600,
    borderRadius: '50px',
    backgroundColor: bg,
    color: color,
  };
};

const admitRowStyle = (status: string): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1.5rem',
  padding: '1.25rem',
  backgroundColor: 'var(--bg-primary)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  borderLeft: status === 'admitted' ? '4px solid #ef4444' : '4px solid #10b981',
  flexWrap: 'wrap',
  boxShadow: 'var(--shadow-sm)',
});

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

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  resize: 'none',
  fontFamily: 'var(--font-family)',
};

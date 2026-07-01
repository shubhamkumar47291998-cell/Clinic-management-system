import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Calendar as CalendarIcon, Clock, Plus, Filter, User, X, Check, CheckSquare, Trash, ArrowLeft, ArrowRight, UserPlus, AlertCircle } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string | null;
  qualifications?: string[] | null;
  designation?: string | null;
}

interface AppointmentDetails {
  id: string;
  slot_start: string;
  slot_end: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string;
  payment_mode?: string | null;
  payment_status?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  patients: {
    id: string;
    name: string;
    phone: string;
  } | null;
  profiles: {
    id: string;
    name: string;
  } | null;
}

export const AppointmentCalendar: React.FC = () => {
  const { profile } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentDetails[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & navigation
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');

  // Booking Modal States
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookDoctorId, setBookDoctorId] = useState('');
  const [bookPatientId, setBookPatientId] = useState('');
  const [bookDate, setBookDate] = useState(selectedDate);
  const [bookStartTime, setBookStartTime] = useState('09:00');
  const [bookEndTime, setBookEndTime] = useState('09:15');
  const [bookNotes, setBookNotes] = useState('');

  // Quick Patient Register States (inside Booking modal)
  const [showQuickPatientRegister, setShowQuickPatientRegister] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('Male');

  // Details Modal States
  const [selectedAppt, setSelectedAppt] = useState<AppointmentDetails | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchClinicData = useCallback(async () => {
    if (!profile?.clinic_id) return;
    try {
      // 1. Fetch active doctors
      const { data: docData } = await supabase
        .from('profiles')
        .select('id, name, specialization, qualifications, designation')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true);
      setDoctors(docData || []);

      // 2. Fetch patients
      const { data: patData } = await supabase
        .from('patients')
        .select('id, name, phone')
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true });
      setPatients(patData || []);
    } catch (err) {
      console.error('Error fetching baseline clinic data:', err);
    }
  }, [profile?.clinic_id]);

  const fetchAppointments = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      // Select appointments for selectedDate
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      let query = supabase
        .from('appointments')
        .select(`
          id,
          slot_start,
          slot_end,
          status,
          notes,
          payment_mode,
          payment_status,
          amount,
          paid_amount,
          balance_amount,
          patients (id, name, phone),
          profiles!appointments_doctor_id_fkey (id, name)
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
      setAppointments((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id, selectedDate, selectedDoctorFilter]);

  useEffect(() => {
    fetchClinicData();
  }, [fetchClinicData]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().substring(0, 10));
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().substring(0, 10));
  };

  const handleQuickPatientSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          clinic_id: profile!.clinic_id!,
          name: newPatientName.trim(),
          phone: newPatientPhone.trim() || null,
          gender: newPatientGender,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPatients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        setBookPatientId(data.id);
        setShowQuickPatientRegister(false);
        setNewPatientName('');
        setNewPatientPhone('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register walk-in patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookDoctorId || !bookPatientId) {
      setErrorMsg('Please select a doctor and a patient.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const slotStart = `${bookDate}T${bookStartTime}:00.000Z`;
      const slotEnd = `${bookDate}T${bookEndTime}:00.000Z`;

      const { error } = await supabase.from('appointments').insert({
        clinic_id: profile!.clinic_id!,
        patient_id: bookPatientId,
        doctor_id: bookDoctorId,
        slot_start: slotStart,
        slot_end: slotEnd,
        status: 'confirmed',
        notes: bookNotes.trim() || null,
      });

      if (error) {
        if (error.message.includes('doctor_slot_clash')) {
          throw new Error('This slot is already booked for this doctor. Please choose a different timing.');
        }
        throw error;
      }

      setShowBookModal(false);
      setBookNotes('');
      fetchAppointments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (apptId: string, newStatus: 'confirmed' | 'completed' | 'cancelled' | 'no_show') => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', apptId);

      if (error) throw error;

      setSelectedAppt((prev) => prev ? { ...prev, status: newStatus } : null);
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment status:', err);
    }
  };

  const handleCollectPayment = async (apptId: string, collectMode: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_status: 'Paid',
          payment_mode: collectMode,
          paid_amount: 500,
          balance_amount: 0,
          payment_date: new Date().toISOString()
        })
        .eq('id', apptId);

      if (error) throw error;
      
      setSelectedAppt((prev) => prev ? {
        ...prev,
        payment_status: 'Paid',
        payment_mode: collectMode,
        paid_amount: 500,
        balance_amount: 0
      } : null);
      
      fetchAppointments();
    } catch (err) {
      console.error('Error collecting payment:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Filters Toolbar */}
      <div style={toolbarStyle}>
        
        {/* Date Navigator */}
        <div style={dateNavStyle}>
          <button onClick={handlePrevDay} className="btn btn-secondary" style={navBtnStyle}>
            <ArrowLeft size={16} />
          </button>
          <div style={dateDisplayStyle}>
            <CalendarIcon size={18} className="accent-color" />
            <span>{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={hiddenDateInputStyle}
            />
          </div>
          <button onClick={handleNextDay} className="btn btn-secondary" style={navBtnStyle}>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Doctor Filter & Add Button */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={filterContainerStyle}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="all">All Doctors</option>
              {doctors.map((d) => {
                const desc = [d.designation, d.specialization].filter(Boolean).join(' - ');
                return (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name} {desc ? `(${desc})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={() => {
              setBookDate(selectedDate);
              if (doctors.length > 0) setBookDoctorId(doctors[0].id);
              if (patients.length > 0) setBookPatientId(patients[0].id);
              setShowBookModal(true);
            }}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem' }}
          >
            <Plus size={18} /> Book Appointment
          </button>
        </div>
      </div>

      {/* Appointment Grid Timeline */}
      <div className="dashboard-card" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading calendar...</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <CalendarIcon size={48} style={{ color: 'var(--border-color)', margin: '0 auto 1.5rem', display: 'block' }} />
            <h3>No Appointments Booked</h3>
            <p style={{ marginTop: '0.5rem' }}>There are no consultations scheduled for this date.</p>
          </div>
        ) : (
          <div style={timelineContainerStyle}>
            {appointments.map((appt) => {
              const startStr = new Date(appt.slot_start).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });
              const endStr = new Date(appt.slot_end).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });
              
              let statusBg = '#e0f2fe';
              let statusColor = '#0369a1';
              if (appt.status === 'completed') {
                statusBg = '#dcfce7';
                statusColor = '#15803d';
              } else if (appt.status === 'cancelled') {
                statusBg = '#fee2e2';
                statusColor = '#b91c1c';
              } else if (appt.status === 'no_show') {
                statusBg = '#f3f4f6';
                statusColor = '#4b5563';
              }

              return (
                <div
                  key={appt.id}
                  onClick={() => setSelectedAppt(appt)}
                  style={apptCardStyle(appt.status)}
                >
                  <div style={apptTimeBoxStyle}>
                    <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600 }}>{startStr} - {endStr}</span>
                  </div>

                  <div style={apptDetailStyle}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
                      Patient: {appt.patients?.name || 'Walk-in / Unknown'}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Consulting: Dr. {appt.profiles?.name || 'Unknown'}
                    </p>
                    {appt.notes && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        "{appt.notes}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '50px',
                        backgroundColor: statusBg,
                        color: statusColor,
                      }}
                    >
                      {appt.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={{ ...modalContentStyle, maxWidth: '500px' }}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Book Appointment Slot</h2>
              <button onClick={() => { setShowBookModal(false); setShowQuickPatientRegister(false); }} style={closeBtnStyle}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {!showQuickPatientRegister ? (
              <form onSubmit={handleBookAppointment} className="auth-form">
                
                <div className="form-group">
                  <label>Consulting Doctor *</label>
                  <select
                    value={bookDoctorId}
                    onChange={(e) => setBookDoctorId(e.target.value)}
                    style={selectStyle}
                    required
                  >
                    <option value="" disabled>Select Consulting Doctor</option>
                    {doctors.map((d) => {
                      const desc = [
                        d.designation,
                        d.specialization,
                        d.qualifications && d.qualifications.length > 0 ? d.qualifications.join(', ') : null
                      ].filter(Boolean).join(' - ');
                      return (
                        <option key={d.id} value={d.id}>
                          Dr. {d.name} {desc ? `(${desc})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ margin: 0 }}>Select Registered Patient *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickPatientRegister(true)}
                      style={{ border: 'none', background: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <UserPlus size={14} /> Register Walk-in
                    </button>
                  </div>
                  <select
                    value={bookPatientId}
                    onChange={(e) => setBookPatientId(e.target.value)}
                    style={selectStyle}
                    required
                  >
                    <option value="" disabled>Select Patient File</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phone || 'No phone'})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      style={timeInputStyle}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      type="time"
                      value={bookStartTime}
                      onChange={(e) => setBookStartTime(e.target.value)}
                      style={timeInputStyle}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time *</label>
                    <input
                      type="time"
                      value={bookEndTime}
                      onChange={(e) => setBookEndTime(e.target.value)}
                      style={timeInputStyle}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Visit Notes / Reason</label>
                  <textarea
                    placeholder="General checkup, throat pain, follow-up..."
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    style={textareaStyle}
                    rows={2}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBookModal(false)}
                    style={{ flex: 1 }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <AuthButton type="submit" loading={submitting} loadingText="Booking...">
                    Book Slot
                  </AuthButton>
                </div>
              </form>
            ) : (
              <div className="auth-form">
                <h3>Quick Demographics Registration</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Quickly add a patient file to proceed with booking.
                </p>

                <AuthInput
                  label="Patient Name *"
                  icon={User}
                  type="text"
                  placeholder="Jane Doe"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  disabled={submitting}
                  required
                />

                <AuthInput
                  label="Phone Number"
                  icon={Clock} // Reusing Clock for simplicity
                  type="tel"
                  placeholder="+91 99999 88888"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  disabled={submitting}
                />

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value)}
                    style={selectStyle}
                    disabled={submitting}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowQuickPatientRegister(false)}
                    style={{ flex: 1 }}
                    disabled={submitting}
                  >
                    Back to Booking
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleQuickPatientSubmit}
                    style={{ flex: 1 }}
                    disabled={submitting || !newPatientName.trim()}
                  >
                    Create & Select
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Detail & Status Actions Modal */}
      {selectedAppt && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={{ ...modalContentStyle, maxWidth: '450px' }}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Consultation Details</h2>
              <button onClick={() => setSelectedAppt(null)} style={closeBtnStyle}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={detailRowStyle}>
                <strong>Patient Name:</strong>
                <span>{selectedAppt.patients?.name || 'Walk-in / Unknown'}</span>
              </div>
              <div style={detailRowStyle}>
                <strong>Contact:</strong>
                <span>{selectedAppt.patients?.phone || 'Not provided'}</span>
              </div>
              <div style={detailRowStyle}>
                <strong>Doctor:</strong>
                <span>Dr. {selectedAppt.profiles?.name || 'Unknown'}</span>
              </div>
              <div style={detailRowStyle}>
                <strong>Timing:</strong>
                <span>
                  {new Date(selectedAppt.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                  {new Date(selectedAppt.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={detailRowStyle}>
                  <strong>Payment Mode:</strong>
                  <span>{selectedAppt.payment_mode || 'Not Specified'}</span>
                </div>
                <div style={detailRowStyle}>
                  <strong>Payment Status:</strong>
                  <span style={{ fontWeight: 700, color: selectedAppt.payment_status === 'Paid' ? '#10b981' : '#f59e0b' }}>
                    {selectedAppt.payment_status || 'Pending'}
                  </span>
                </div>
                <div style={detailRowStyle}>
                  <strong>Amount Paid / Balance:</strong>
                  <span>₹{selectedAppt.paid_amount || 0} / ₹{selectedAppt.balance_amount ?? 500}</span>
                </div>

                {selectedAppt.payment_status !== 'Paid' && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Collect Triage Payment:</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleCollectPayment(selectedAppt.id, 'Cash')}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                      >
                        Collect Cash
                      </button>
                      <button
                        onClick={() => handleCollectPayment(selectedAppt.id, 'UPI')}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                      >
                        Collect UPI
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {selectedAppt.notes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <strong>Notes:</strong>
                  <p style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    {selectedAppt.notes}
                  </p>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Change Appointment Status:</strong>
                <div style={actionsGridStyle}>
                  {selectedAppt.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusTransition(selectedAppt.id, 'completed')}
                      className="btn"
                      style={{ ...apptActionBtnStyle, backgroundColor: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }}
                    >
                      <CheckSquare size={16} /> Mark Completed
                    </button>
                  )}
                  {selectedAppt.status !== 'confirmed' && selectedAppt.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusTransition(selectedAppt.id, 'confirmed')}
                      className="btn"
                      style={{ ...apptActionBtnStyle, backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
                    >
                      <Check size={16} /> Re-confirm Slot
                    </button>
                  )}
                  {selectedAppt.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusTransition(selectedAppt.id, 'cancelled')}
                      className="btn"
                      style={{ ...apptActionBtnStyle, backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' }}
                    >
                      <X size={16} /> Cancel Slot
                    </button>
                  )}
                  {selectedAppt.status !== 'no_show' && (
                    <button
                      onClick={() => handleStatusTransition(selectedAppt.id, 'no_show')}
                      className="btn"
                      style={{ ...apptActionBtnStyle, backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' }}
                    >
                      <Trash size={16} /> Mark No Show
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Styling Object Maps
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
};

const dateNavStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.25rem',
  boxShadow: 'var(--shadow-sm)',
};

const navBtnStyle: React.CSSProperties = {
  padding: '0.5rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--text-secondary)',
};

const dateDisplayStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0 1rem',
  fontWeight: 600,
  fontSize: '0.95rem',
  cursor: 'pointer',
};

const hiddenDateInputStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
};

const filterContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.875rem',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  minWidth: '180px',
};

const filterSelectStyle: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  cursor: 'pointer',
  width: '100%',
};

const timelineContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const apptCardStyle = (status: string): React.CSSProperties => {
  let leftBorder = '4px solid var(--accent-primary)';
  if (status === 'completed') leftBorder = '4px solid #10b981';
  else if (status === 'cancelled') leftBorder = '4px solid #ef4444';
  else if (status === 'no_show') leftBorder = '4px solid #9ca3af';

  return {
    display: 'flex',
    padding: '1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    borderLeft: leftBorder,
    backgroundColor: 'var(--bg-primary)',
    cursor: 'pointer',
    justifyContent: 'space-between',
    transition: 'var(--transition-smooth)',
    boxShadow: 'var(--shadow-sm)',
    gap: '1rem',
  };
};

const apptTimeBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  minWidth: '140px',
};

const apptDetailStyle: React.CSSProperties = {
  flexGrow: 1,
};

const modalOverlayStyle: React.CSSProperties = {
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

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  width: '100%',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border-color)',
  padding: '2rem',
};

const modalHeaderStyle: React.CSSProperties = {
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

const timeInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.9rem',
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

const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.95rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.5rem',
};

const actionsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: '0.50rem',
  marginTop: '0.5rem',
};

const apptActionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.25rem',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid',
  transition: 'var(--transition-smooth)',
};

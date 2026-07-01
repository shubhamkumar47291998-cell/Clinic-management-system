import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  FileText, Calendar, Clock, CreditCard, User, Bell, MapPin, Star, AlertCircle, Phone, 
  ShieldAlert, Printer, X, ShieldCheck, LogOut, Video
} from 'lucide-react';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { TelehealthRoom } from '../../components/telehealth/TelehealthRoom';

interface Patient {
  id: string;
  clinic_id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  blood_group?: string | null;
  emergency_contact?: string | null;
  medical_history?: string | null;
  created_at: string;
  insurance_provider?: string | null;
  insurance_policy_no?: string | null;
}

interface Appointment {
  id: string;
  slot_start: string;
  status: string;
  notes: string | null;
  doctor_id: string;
  profiles: { name: string; specialization: string } | null;
}

interface Prescription {
  id: string;
  visit_date: string;
  medicines: Array<{ name: string; dosage: string; duration: string; instructions: string }>;
  notes: string;
  profiles: { name: string } | null;
}

interface Invoice {
  id: string;
  total_amount: number;
  paid_amount?: number;
  balance_amount?: number;
  payment_status: string;
  payment_method?: string | null;
  issued_date: string;
}

interface NotificationAlert {
  id: string;
  type: string;
  channel: string;
  content: string;
  created_at: string;
}

export const PatientDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const [viewReceipt, setViewReceipt] = useState<any | null>(null);
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'prescriptions' | 'records' | 'billing' | 'profile' | 'notifications'>('overview');

  // Edit profile states
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPinCode, setEditPinCode] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editInsProvider, setEditInsProvider] = useState('');
  const [editInsPolicy, setEditInsPolicy] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewApptId, setReviewApptId] = useState('');
  const [reviewDoctorId, setReviewDoctorId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Telehealth call state
  const [telehealthAppt, setTelehealthAppt] = useState<{ id: string; doctorId: string; doctorName: string } | null>(null);

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleApptId, setRescheduleApptId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Bill payment state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('UPI');
  const [utrNumber, setUtrNumber] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const fetchPatientData = async () => {
    if (!user?.phone) {
      setLoading(false);
      return;
    }
    try {
      // 1. Fetch patient profile details
      const { data: patData, error: patErr } = await supabase
        .from('patients')
        .select('*')
        .eq('phone', user.phone)
        .limit(1);

      if (patErr) throw patErr;
      if (patData && patData.length > 0) {
        const record = patData[0] as Patient;
        setPatientRecord(record);
        
        // Populate profile inputs
        setEditAddress(record.address || '');
        setEditCity(record.city || '');
        setEditState(record.state || '');
        setEditPinCode(record.pin_code || '');
        setEditEmergency(record.emergency_contact || '');
        setEditInsProvider(record.insurance_provider || '');
        setEditInsPolicy(record.insurance_policy_no || '');

        // 2. Fetch patient appointments
        const { data: appts } = await supabase
          .from('appointments')
          .select(`
            id,
            slot_start,
            status,
            notes,
            doctor_id,
            profiles:doctor_id(name, specialization)
          `)
          .eq('patient_id', record.id)
          .order('slot_start', { ascending: false });
        setAppointments((appts || []) as any[]);

        // 3. Fetch prescriptions
        const { data: rxList } = await supabase
          .from('prescriptions')
          .select(`
            id,
            visit_date,
            medicines,
            notes,
            profiles:doctor_id(name)
          `)
          .eq('patient_id', record.id)
          .order('visit_date', { ascending: false });
        setPrescriptions((rxList || []) as any[]);

        // 4. Fetch invoices
        const { data: invList } = await supabase
          .from('invoices')
          .select('*')
          .eq('patient_id', record.id)
          .order('issued_date', { ascending: false });
        setInvoices(invList || []);

        // 4b. Fetch payments (receipts)
        const { data: payList } = await supabase
          .from('payments')
          .select(`
            id, amount, payment_mode, payment_status, transaction_id, created_at, receipt_number, receipt_pdf_url,
            invoices ( invoice_number, doctor_id, profiles:doctor_id(name) )
          `)
          .eq('patient_id', record.id)
          .order('created_at', { ascending: false });
        setPayments(payList || []);

        // 5. Fetch alerts/notifications
        const { data: alertList } = await supabase
          .from('notifications')
          .select('*')
          .eq('patient_id', record.id)
          .order('created_at', { ascending: false });
        setAlerts(alertList || []);
      }
    } catch (err) {
      console.error('Error fetching patient dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientRecord) return;
    setProfileSaving(true);
    setProfileMsg('');

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          address: editAddress,
          city: editCity,
          state: editState,
          pin_code: editPinCode,
          emergency_contact: editEmergency,
          insurance_provider: editInsProvider,
          insurance_policy_no: editInsPolicy
        })
        .eq('id', patientRecord.id);

      if (error) throw error;
      setProfileMsg('Profile updated successfully.');
      fetchPatientData();
    } catch (err: any) {
      setProfileMsg(err.message || 'Failed to save profile changes.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment slot?')) return;
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', apptId);
      if (error) throw error;
      fetchPatientData();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRescheduleSubmitting(true);
    try {
      const newSlotStart = `${rescheduleDate}T${rescheduleTime}:00Z`;
      const endHour = Number(rescheduleTime.split(':')[0]) + (rescheduleTime.split(':')[1] === '30' ? 1 : 0);
      const endMin = rescheduleTime.split(':')[1] === '30' ? '00' : '30';
      const newSlotEnd = `${rescheduleDate}T${endHour.toString().padStart(2, '0')}:${endMin}:00Z`;

      const { error } = await supabase
        .from('appointments')
        .update({
          slot_start: newSlotStart,
          slot_end: newSlotEnd
        })
        .eq('id', rescheduleApptId);

      if (error) throw error;
      setShowRescheduleModal(false);
      fetchPatientData();
    } catch (err) {
      console.error('Failed to reschedule:', err);
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientRecord) return;
    setReviewSubmitting(true);
    setReviewSuccess('');

    try {
      const { error } = await supabase.from('reviews').insert({
        clinic_id: patientRecord.clinic_id,
        patient_id: patientRecord.id,
        appointment_id: reviewApptId,
        doctor_id: reviewDoctorId,
        rating,
        comment,
        status: 'completed'
      });

      if (error) throw error;
      setReviewSuccess('Thank you! Your rating and feedback were saved.');
      setTimeout(() => {
        setShowReviewModal(false);
        setComment('');
        setReviewSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Error logging feedback rating:', err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoiceId) return;
    setPayLoading(true);

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          payment_status: 'paid',
          payment_method: payMethod
        })
        .eq('id', payInvoiceId);

      if (error) throw error;

      // Log notification
      if (patientRecord) {
        await supabase.from('notifications').insert({
          clinic_id: patientRecord.clinic_id,
          patient_id: patientRecord.id,
          type: 'Invoice Paid',
          channel: 'WhatsApp',
          status: 'sent',
          content: `Payment received: ₹${payAmount} for Invoice INV-${payInvoiceId.substring(0,4)}. Status: Paid.`
        });
      }

      setShowPayModal(false);
      setUtrNumber('');
      fetchPatientData();
    } catch (err) {
      console.error('Error paying invoice:', err);
    } finally {
      setPayLoading(false);
    }
  };

  const printPrescription = (rx: Prescription) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const medsList = rx.medicines.map((m) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${m.name}</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.dosage}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.instructions}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${m.duration}</td>
      </tr>
    `).join('');
    const html = `
      <html>
      <head>
        <title>Prescription Rx - ${patientRecord?.name}</title>
        <style>
          body { font-family: 'Inter', sans-serif; color: #333; padding: 30px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 15px; }
          .details { margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; text-align: left; padding: 10px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>AURA HEALTH CLINIC PRESCRIPTION</h2>
          <div>Date: ${new Date(rx.visit_date).toLocaleDateString()}</div>
        </div>
        <div class="details">
          <div><strong>Patient Name:</strong> ${patientRecord?.name}</div>
          <div><strong>Doctor Name:</strong> Dr. ${rx.profiles?.name}</div>
        </div>
        <h3>Ordered Rx Medication</h3>
        <table>
          <thead>
            <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
          </thead>
          <tbody>${medsList}</tbody>
        </table>
        <script>window.onload = function() { window.print(); setTimeout(window.close, 500); };</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Calculations for Overview dashboard
  const nextAppt = appointments.filter(a => a.status === 'confirmed' && new Date(a.slot_start) >= new Date()).sort((a,b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime())[0];
  const pendingInvoices = invoices.filter(inv => inv.payment_status !== 'paid');

  return (
    <div className="dashboard-container">
      {/* Patient Sidebar */}
      <aside className="sidebar" style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)' }}>
        <div className="sidebar-brand">
          <ShieldCheck size={24} className="accent-color" />
          <span>AURA Patients</span>
        </div>
        <div className="sidebar-user">
          <p className="user-name">{patientRecord?.name || user?.phone}</p>
          <p className="user-role">Patient ID: {patientRecord?.id.substring(0,8).toUpperCase()}</p>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => setActiveTab('overview')} className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} style={sidebarBtnStyle}>
            <Calendar size={18} /> Home Dashboard
          </button>
          <button onClick={() => setActiveTab('appointments')} className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} style={sidebarBtnStyle}>
            <Clock size={18} /> My Appointments
          </button>
          <button onClick={() => setActiveTab('prescriptions')} className={`nav-item ${activeTab === 'prescriptions' ? 'active' : ''}`} style={sidebarBtnStyle}>
            <FileText size={18} /> My Prescriptions
          </button>
          <button onClick={() => setActiveTab('records')} className={`nav-item ${activeTab === 'records' ? 'active' : ''}`} style={sidebarBtnStyle}>
            <Printer size={18} /> Medical Records
          </button>
          <button onClick={() => setActiveTab('billing')} className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`} style={sidebarBtnStyle}>
            <CreditCard size={18} /> Billing Invoices
          </button>
          <button onClick={() => setActiveTab('profile')} className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} style={sidebarBtnStyle}>
            <User size={18} /> My Profile File
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} style={sidebarBtnStyle}>
            <Bell size={18} /> Alerts Center
          </button>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Logout Portal
        </button>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <header className="content-header">
          <h1>Patient Health Dashboard</h1>
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>Loading Patient Profile EMR Logs...</div>
        ) : !patientRecord ? (
          <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block' }} />
            <h3>No Patient File Associated</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              We found your login authentication, but the clinic has not mapped a patient details folder for phone: <strong>{user?.phone}</strong> yet.
            </p>
          </div>
        ) : (
          <div>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {nextAppt && (
                  <div style={welcomeBannerStyle}>
                    <div style={{ flexGrow: 1 }}>
                      <span style={activeBadgeStyle}>Next Consultation Confirmed</span>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>
                        Dr. {nextAppt.profiles?.name}
                      </h2>
                      <p style={{ margin: 0, opacity: 0.9 }}>
                        {nextAppt.profiles?.specialization} — {new Date(nextAppt.slot_start).toLocaleString()}
                      </p>
                    </div>
                    <Clock size={48} style={{ opacity: 0.3 }} />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Blood Group</span>
                      <ShieldAlert size={18} />
                    </div>
                    <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{patientRecord.blood_group || 'O+'}</h3>
                    <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Verified Medical Record</span>
                  </div>

                  <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Billing Balance</span>
                      <CreditCard size={18} />
                    </div>
                    <h3 style={{ fontSize: '2rem', margin: '0.5rem 0', color: pendingInvoices.length > 0 ? '#d97706' : '#10b981' }}>
                      ₹{pendingInvoices.reduce((acc, curr) => acc + Number(curr.total_amount), 0)}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {pendingInvoices.length} invoices pending
                    </span>
                  </div>

                  <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Total Consultations</span>
                      <Calendar size={18} />
                    </div>
                    <h3 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{appointments.length}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visits logged</span>
                  </div>
                </div>

                <div className="dashboard-card" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Your Active Physician Profile</h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                      AN
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.25rem' }}>Dr. Anisha Natekar</h4>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Internal Medicine Consultant — Goa GMC</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>📍 Bicholim-Sankhalim Taluk, Goa</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. APPOINTMENTS TAB */}
            {activeTab === 'appointments' && (
              <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem' }}>Consultation Schedule History</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={thStyle}>Date / Time</th>
                        <th style={thStyle}>Consulting Doctor</th>
                        <th style={thStyle}>Specialization</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={tdStyle}>{new Date(a.slot_start).toLocaleString()}</td>
                          <td style={tdStyle}>Dr. {a.profiles?.name}</td>
                          <td style={tdStyle}>{a.profiles?.specialization}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: a.status === 'confirmed' ? '#dcfce7' : a.status === 'cancelled' ? '#fee2e2' : '#f1f5f9',
                              color: a.status === 'confirmed' ? '#15803d' : a.status === 'cancelled' ? '#b91c1c' : '#475569'
                            }}>
                              {a.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {a.status === 'confirmed' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setTelehealthAppt({
                                        id: a.id,
                                        doctorId: a.doctor_id,
                                        doctorName: a.profiles?.name || 'Practitioner'
                                      });
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#6366f1', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  >
                                    <Video size={12} /> Join Call
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRescheduleApptId(a.id);
                                      setShowRescheduleModal(true);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={() => handleCancelAppointment(a.id)}
                                    className="btn btn-danger"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {a.status === 'completed' && (
                                <button
                                  onClick={() => {
                                    setReviewApptId(a.id);
                                    setReviewDoctorId(a.doctor_id);
                                    setShowReviewModal(true);
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                                >
                                  <Star size={12} /> Rate Consult
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. PRESCRIPTIONS TAB */}
            {activeTab === 'prescriptions' && (
              <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem' }}>Your Medical Prescriptions (Rx)</h3>
                {prescriptions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No active prescriptions registered.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {prescriptions.map((rx) => (
                      <div key={rx.id} style={rxCardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                          <div>
                            <strong>Rx Date:</strong> {new Date(rx.visit_date).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Doctor:</strong> Dr. {rx.profiles?.name}
                          </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                              <th style={{ padding: '0.25rem' }}>Medicine</th>
                              <th style={{ padding: '0.25rem' }}>Dosage</th>
                              <th style={{ padding: '0.25rem' }}>Instructions</th>
                              <th style={{ padding: '0.25rem' }}>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rx.medicines.map((m, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '0.25rem' }}><strong>{m.name}</strong></td>
                                <td style={{ padding: '0.25rem' }}>{m.dosage}</td>
                                <td style={{ padding: '0.25rem' }}>{m.instructions}</td>
                                <td style={{ padding: '0.25rem' }}>{m.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                          <button
                            onClick={() => printPrescription(rx)}
                            className="btn btn-secondary"
                            style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Printer size={14} /> Print Rx
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. MEDICAL RECORDS TAB */}
            {activeTab === 'records' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>EMR Consult History & Diagnostic Diagnoses</h3>
                  {appointments.filter(a => a.status === 'completed').length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No completed consultation records found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {appointments.filter(a => a.status === 'completed').map((a) => (
                        <div key={a.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span>Consultation: {new Date(a.slot_start).toLocaleDateString()}</span>
                            <span>Doctor: Dr. {a.profiles?.name}</span>
                          </div>
                          <div style={{ marginTop: '0.5rem' }}>
                            <strong>Clinical Assessment Notes:</strong>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{a.notes || 'Routine consult checkup complete.'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Mock Vaccination Records</h3>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={thStyle}>Vaccine Name</th>
                        <th style={thStyle}>Dose Status</th>
                        <th style={thStyle}>Immunization Date</th>
                        <th style={thStyle}>Issuer</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={tdStyle}><strong>COVID-19 (Covishield)</strong></td>
                        <td style={tdStyle}><span style={{ color: '#10b981', fontWeight: 600 }}>Dose 2 Complete</span></td>
                        <td style={tdStyle}>2025-04-12</td>
                        <td style={tdStyle}>Goa Health Authority</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={tdStyle}><strong>Hepatitis B</strong></td>
                        <td style={tdStyle}><span style={{ color: '#10b981', fontWeight: 600 }}>Booster Complete</span></td>
                        <td style={tdStyle}>2024-11-05</td>
                        <td style={tdStyle}>Aura Medical Center</td>
                      </tr>
                      <tr>
                        <td style={tdStyle}><strong>Influenza (Flu shot)</strong></td>
                        <td style={tdStyle}><span style={{ color: '#d97706', fontWeight: 600 }}>Due for Renewal</span></td>
                        <td style={tdStyle}>-</td>
                        <td style={tdStyle}>-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. BILLING TAB */}
            {activeTab === 'billing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Invoices List */}
                <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.25rem', fontWeight: 700 }}>Clinic Invoices</h3>
                  {invoices.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No invoices issued.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={tableStyle}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={thStyle}>Invoice Number</th>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Total Amount</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={tdStyle}><strong>{inv.id.substring(0,8).toUpperCase()}</strong></td>
                              <td style={tdStyle}>{new Date(inv.issued_date).toLocaleDateString()}</td>
                              <td style={tdStyle}>₹{inv.total_amount}</td>
                              <td style={tdStyle}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: inv.payment_status === 'paid' ? '#dcfce7' : '#fee2e2',
                                  color: inv.payment_status === 'paid' ? '#15803d' : '#b91c1c'
                                }}>
                                  {inv.payment_status.toUpperCase()}
                                </span>
                              </td>
                              <td style={tdStyle}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => setViewInvoice(inv)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                  >
                                    View Invoice
                                  </button>
                                  {inv.payment_status !== 'paid' && (
                                    <button
                                      onClick={() => {
                                        setPayInvoiceId(inv.id);
                                        setPayAmount(inv.total_amount);
                                        setShowPayModal(true);
                                      }}
                                      className="btn btn-primary"
                                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                    >
                                      Pay Online
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Receipts List */}
                <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1.25rem', fontWeight: 700 }}>Payment Receipts</h3>
                  {payments.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No payment receipts recorded.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={tableStyle}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={thStyle}>Receipt Number</th>
                            <th style={thStyle}>Transaction Date</th>
                            <th style={thStyle}>Amount Paid</th>
                            <th style={thStyle}>Payment Mode</th>
                            <th style={thStyle}>Txn ID / UTR</th>
                            <th style={thStyle}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((pay) => (
                            <tr key={pay.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={tdStyle}><strong>{pay.receipt_number || `REC-${pay.id.substring(0,4).toUpperCase()}`}</strong></td>
                              <td style={tdStyle}>{new Date(pay.created_at).toLocaleDateString()}</td>
                              <td style={tdStyle}>₹{pay.amount}</td>
                              <td style={tdStyle}>{pay.payment_mode}</td>
                              <td style={tdStyle}>{pay.transaction_id || 'N/A'}</td>
                              <td style={tdStyle}>
                                <button
                                  onClick={() => setViewReceipt(pay)}
                                  className="btn btn-primary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  View Receipt
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* 6. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                <div className="dashboard-card" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1.25rem' }}>Personal EMR Demographics & Profile Details</h3>

                  {profileMsg && (
                    <div className={`alert ${profileMsg.includes('successfully') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1.5rem' }}>
                      <span>{profileMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="auth-form" noValidate>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Patient Name (Locked)</label>
                        <input type="text" value={patientRecord.name} disabled style={disabledInputStyle} />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Contact Mobile (Locked)</label>
                        <input type="text" value={patientRecord.phone} disabled style={disabledInputStyle} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div className="form-group">
                        <AuthInput
                          label="Emergency Contact No"
                          icon={Phone}
                          type="tel"
                          placeholder="Emergency mobile number..."
                          value={editEmergency}
                          onChange={(e) => setEditEmergency(e.target.value)}
                          disabled={profileSaving}
                        />
                      </div>

                      <div className="form-group">
                        <AuthInput
                          label="ZIP / Pin Code"
                          icon={MapPin}
                          type="text"
                          placeholder="403505"
                          value={editPinCode}
                          onChange={(e) => setEditPinCode(e.target.value)}
                          disabled={profileSaving}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div className="form-group">
                        <AuthInput
                          label="City / Town"
                          icon={MapPin}
                          type="text"
                          placeholder="Sankhalim"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          disabled={profileSaving}
                        />
                      </div>

                      <div className="form-group">
                        <AuthInput
                          label="State"
                          icon={MapPin}
                          type="text"
                          placeholder="Goa"
                          value={editState}
                          onChange={(e) => setEditState(e.target.value)}
                          disabled={profileSaving}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Residential Address</label>
                      <textarea
                        placeholder="Enter street name, house/flat number..."
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        style={textareaStyle}
                        rows={2}
                        disabled={profileSaving}
                      />
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

                    <h4 style={{ marginBottom: '1rem', fontWeight: 700 }}>Insurance Details Policy Claims</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                      <div className="form-group">
                        <AuthInput
                          label="Insurance Provider / Carrier"
                          icon={ShieldCheck}
                          type="text"
                          placeholder="Star Health / ICICI Lombard..."
                          value={editInsProvider}
                          onChange={(e) => setEditInsProvider(e.target.value)}
                          disabled={profileSaving}
                        />
                      </div>

                      <div className="form-group">
                        <AuthInput
                          label="Insurance Policy Number"
                          icon={ShieldCheck}
                          type="text"
                          placeholder="POL-12345678"
                          value={editInsPolicy}
                          onChange={(e) => setEditInsPolicy(e.target.value)}
                          disabled={profileSaving}
                        />
                      </div>
                    </div>

                    <AuthButton type="submit" loading={profileSaving} loadingText="Saving Profile Details...">
                      Save Profile Demographics
                    </AuthButton>
                  </form>
                </div>

                <div className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>QR Triage Check-In</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                    Scan this QR code at the clinic reception to check in instantly to the waiting list queue.
                  </p>
                  <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                    <svg width="150" height="150" viewBox="0 0 29 29" style={{ shapeRendering: 'crispEdges' }}>
                      <path fill="#ffffff" d="M0,0h29v29h-29z" />
                      <path fill="#1e1b4b" d="M0,0h7v7h-7z M22,0h7v7h-7z M0,22h7v7h-7z M2,2h3v3h-3z M24,2h3v3h-3z M2,24h3v3h-3z M7,10h2v2h-2z M10,7h2v2h-2z M12,12h3v3h-3z M15,15h3v3h-3z M8,8h3v3h-3z M18,18h3v3h-3z" />
                    </svg>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--accent-primary)' }}>
                    Patient ID: {patientRecord.id.substring(0,8).toUpperCase()}
                  </strong>
                </div>
              </div>
            )}

            {/* 7. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.25rem' }}>Notifications Center Alerts Log</h3>
                {alerts.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No alerts logged yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {alerts.map((a) => (
                      <div key={a.id} style={alertCardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600 }}>{a.type.toUpperCase()} ({a.channel})</span>
                          <span>{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{a.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Rate Your Doctor Consultation</h2>
              <button onClick={() => setShowReviewModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {reviewSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                <span>{reviewSuccess}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Consultation Star Rating</label>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '1rem 0' }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRating(val)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: val <= rating ? '#f59e0b' : '#cbd5e1' }}
                    >
                      <Star size={32} fill={val <= rating ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Write Service Review / Feedback</label>
                <textarea
                  placeholder="Share details of your experience with Dr. Natekar..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={textareaStyle}
                  rows={4}
                  required
                />
              </div>

              <AuthButton type="submit" loading={reviewSubmitting} loadingText="Submitting rating...">
                Submit Rating & Comments
              </AuthButton>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Reschedule Consultation</h2>
              <button onClick={() => setShowRescheduleModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Available Time Slot</label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  style={selectStyle}
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="15:30">03:30 PM</option>
                  <option value="16:00">04:00 PM</option>
                </select>
              </div>

              <AuthButton type="submit" loading={rescheduleSubmitting} loadingText="Updating slot...">
                Reschedule Slot
              </AuthButton>
            </form>
          </div>
        </div>
      )}

      {/* Payment Checkout Modal */}
      {showPayModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Online Billing Gateway</h2>
              <button onClick={() => setShowPayModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Total Bill Amount:</span>
                <strong>₹{payAmount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Service Fee:</span>
                <span>General Consult + 18% GST</span>
              </div>
            </div>

            <form onSubmit={handlePayInvoice} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Checkout Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={selectStyle}
                >
                  <option value="UPI">UPI Checkout (BHIM / PhonePe)</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Net Banking">Net Banking Retail Partners</option>
                </select>
              </div>

              {payMethod === 'UPI' && (
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem', border: '1.5px dashed var(--border-color)', borderRadius: '12px' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Scan UPI QR or pay via VPA Address</p>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>pay.aura@hdfcbank</strong>
                  <AuthInput
                    label="Enter 12-Digit UPI UTR Reference Number *"
                    icon={ShieldCheck}
                    type="text"
                    placeholder="12-digit transaction ID..."
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    required
                  />
                </div>
              )}

              {payMethod === 'Credit Card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <AuthInput label="Cardholder Full Name *" icon={User} type="text" placeholder="Rahul Naik" required />
                  <AuthInput label="16-Digit Credit Card Number *" icon={CreditCard} type="text" placeholder="4111 2222 3333 4444" required />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <AuthInput label="Expiry MM/YY *" icon={Calendar} type="text" placeholder="12/28" required />
                    <AuthInput label="CVV Security Code *" icon={ShieldCheck} type="password" placeholder="***" required />
                  </div>
                </div>
              )}

              {payMethod === 'Net Banking' && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Retail Banking Partner</label>
                  <select style={selectStyle}>
                    <option>State Bank of India (SBI)</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                    <option>Goa State Cooperative Bank</option>
                  </select>
                </div>
              )}

              <AuthButton type="submit" loading={payLoading} loadingText="Processing secure transfer...">
                Process Payment
              </AuthButton>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Clinic Invoice Statement</h2>
              <button onClick={() => setViewInvoice(null)} style={closeBtnStyle}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div><strong>Invoice Number:</strong> {viewInvoice.id.substring(0,8).toUpperCase()}</div>
              <div><strong>Issued Date:</strong> {new Date(viewInvoice.issued_date).toLocaleDateString()}</div>
              <div><strong>Patient Name:</strong> {patientRecord?.name}</div>
              <div><strong>Clinic Branch:</strong> Aura Health Clinic</div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
              <div><strong>Consultation Fee:</strong> ₹500.00</div>
              <div><strong>GST (18%):</strong> ₹90.00</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                <strong>Total Amount:</strong> ₹{viewInvoice.total_amount}
              </div>
              <div><strong>Payment Status:</strong> {viewInvoice.payment_status.toUpperCase()}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  const payload = `AURA CLINIC INVOICE STATEMENT\nInvoice #: ${viewInvoice.id.substring(0,8).toUpperCase()}\nDate: ${viewInvoice.issued_date}\nPatient: ${patientRecord?.name}\nTotal: ${viewInvoice.total_amount} INR\nStatus: ${viewInvoice.payment_status}`;
                  const blob = new Blob([payload], { type: 'text/plain' });
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.href = URL.createObjectURL(blob);
                  downloadAnchor.download = `invoice_${viewInvoice.id.substring(0,8)}.txt`;
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewReceipt && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Payment Receipt</h2>
              <button onClick={() => setViewReceipt(null)} style={closeBtnStyle}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div><strong>Receipt Number:</strong> {viewReceipt.receipt_number || `REC-${viewReceipt.id.substring(0,4).toUpperCase()}`}</div>
              <div><strong>Transaction Date:</strong> {new Date(viewReceipt.created_at).toLocaleDateString()}</div>
              <div><strong>Patient Name:</strong> {patientRecord?.name}</div>
              <div><strong>Doctor Name:</strong> Dr. Anisha Natekar</div>
              <div><strong>Payment Mode:</strong> {viewReceipt.payment_mode}</div>
              <div><strong>Transaction ID:</strong> {viewReceipt.transaction_id || 'N/A'}</div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
              <div><strong>Consultation Fee:</strong> ₹500.00</div>
              <div><strong>GST (18%):</strong> ₹90.00</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                <strong>Total Amount Paid:</strong> ₹{viewReceipt.amount}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  const html = `
                    <html>
                    <head><title>Receipt - ${viewReceipt.receipt_number}</title></head>
                    <body style="font-family: sans-serif; padding: 40px;">
                      <h2>AURA HEALTH CLINIC - PAYMENT RECEIPT</h2>
                      <p>Sankhalim, Goa - 403505</p>
                      <hr/>
                      <p><strong>Receipt #:</strong> ${viewReceipt.receipt_number || `REC-${viewReceipt.id.substring(0,4).toUpperCase()}`}</p>
                      <p><strong>Patient:</strong> ${patientRecord?.name}</p>
                      <p><strong>Amount:</strong> ₹${viewReceipt.amount}</p>
                      <p><strong>Mode:</strong> ${viewReceipt.payment_mode}</p>
                      <p><strong>Txn ID:</strong> ${viewReceipt.transaction_id || 'N/A'}</p>
                      <script>window.onload = function() { window.print(); setTimeout(window.close, 500); };</script>
                    </body>
                    </html>
                  `;
                  printWindow.document.write(html);
                  printWindow.document.close();
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Print Receipt
              </button>
              <button
                onClick={() => {
                  const payload = `AURA CLINIC PAYMENT RECEIPT\nReceipt #: ${viewReceipt.receipt_number || `REC-${viewReceipt.id.substring(0,4).toUpperCase()}`}\nDate: ${viewReceipt.created_at}\nPatient: ${patientRecord?.name}\nTotal Paid: ${viewReceipt.amount} INR\nMode: ${viewReceipt.payment_mode}\nTxn ID: ${viewReceipt.transaction_id || 'N/A'}`;
                  const blob = new Blob([payload], { type: 'text/plain' });
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.href = URL.createObjectURL(blob);
                  downloadAnchor.download = `receipt_${viewReceipt.receipt_number || viewReceipt.id}.txt`;
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telehealth Call Room */}
      {telehealthAppt && patientRecord && (
        <TelehealthRoom
          appointmentId={telehealthAppt.id}
          patientId={patientRecord.id}
          patientName={patientRecord.name}
          doctorId={telehealthAppt.doctorId}
          doctorName={telehealthAppt.doctorName}
          role="patient"
          onClose={() => {
            setTelehealthAppt(null);
            fetchPatientData();
          }}
        />
      )}

    </div>
  );
};

// Styles
const sidebarBtnStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem'
};

const welcomeBannerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #6366f1 0%, #4338ca 100%)',
  color: '#ffffff',
  padding: '2rem',
  borderRadius: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: 'var(--shadow-md)'
};

const activeBadgeStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  padding: '0.25rem 0.75rem',
  borderRadius: '50px',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.9rem'
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontWeight: 600,
  color: 'var(--text-muted)'
};

const tdStyle: React.CSSProperties = {
  padding: '0.875rem 1rem',
  color: 'var(--text-secondary)'
};

const rxCardStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '1.25rem',
  backgroundColor: 'var(--bg-primary)'
};

const disabledInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-muted)',
  cursor: 'not-allowed',
  marginTop: '0.25rem',
  fontSize: '0.9rem'
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
  fontSize: '0.9rem',
  marginTop: '0.25rem'
};

const alertCardStyle: React.CSSProperties = {
  padding: '1rem',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--bg-primary)'
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
  backdropFilter: 'blur(4px)'
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  width: '100%',
  maxWidth: '450px',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border-color)',
  padding: '2rem',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.75rem'
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.9rem',
  marginTop: '0.25rem'
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.9rem',
  marginTop: '0.25rem'
};

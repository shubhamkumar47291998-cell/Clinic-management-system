import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { AddMedicalRecordModal } from './AddMedicalRecordModal';
import { Calendar, FileText, CreditCard, Clock, User, Phone, MapPin, Plus, FileDown, ShieldAlert } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  created_at: string;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  diagnosis: string;
  prescriptions: Array<{ medication: string; dosage: string; frequency: string; duration: string }>;
  attachments: Array<{ path: string; name: string }>;
  profiles: { name: string } | null;
}

interface Appointment {
  id: string;
  slot_start: string;
  status: string;
  notes: string;
}

interface Invoice {
  id: string;
  total_amount: number;
  payment_status: string;
  issued_date: string;
}

interface PatientDetailProps {
  patient: Patient;
  onClose: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onClose }) => {
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'emr' | 'appointments' | 'invoices'>('emr');
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);

  const fetchEMRHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          id,
          visit_date,
          diagnosis,
          prescriptions,
          attachments,
          profiles (name)
        `)
        .eq('patient_id', patient.id)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setRecords((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching EMR:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, slot_start, status, notes')
        .eq('patient_id', patient.id)
        .order('slot_start', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, total_amount, payment_status, issued_date')
        .eq('patient_id', patient.id)
        .order('issued_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  useEffect(() => {
    fetchEMRHistory();
    fetchAppointments();
    fetchInvoices();
  }, [patient]);

  const handleDownloadAttachment = async (path: string) => {
    try {
      // Create a temporary 60s signed URL to view/download the private file
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, 60);

      if (error) throw error;
      if (data) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to download report.');
    }
  };

  return (
    <div style={detailBoxStyle}>
      <header style={headerStyle}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{patient.name}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered: {new Date(patient.created_at).toLocaleDateString()}</p>
        </div>
        <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
          Back to Directory
        </button>
      </header>

      {/* Demographics Summary */}
      <section style={demographicsStyle}>
        <div style={demoItemStyle}>
          <User size={16} className="accent-color" />
          <span><strong>Gender:</strong> {patient.gender || 'Not specified'}</span>
        </div>
        <div style={demoItemStyle}>
          <Calendar size={16} className="accent-color" />
          <span><strong>DOB:</strong> {patient.dob ? new Date(patient.dob).toLocaleDateString() : 'Not specified'}</span>
        </div>
        <div style={demoItemStyle}>
          <Phone size={16} className="accent-color" />
          <span><strong>Phone:</strong> {patient.phone || 'Not specified'}</span>
        </div>
        <div style={demoItemStyle} style={{ gridColumn: 'span 2' }}>
          <MapPin size={16} className="accent-color" />
          <span><strong>Address:</strong> {patient.address || 'No address provided'}</span>
        </div>
      </section>

      {/* Tab Selectors */}
      <div className="tab-container" style={{ marginTop: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'emr' ? 'active' : ''}`}
          onClick={() => setActiveTab('emr')}
        >
          <FileText size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          EMR History
        </button>
        <button
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          <Clock size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Appointments
        </button>
        <button
          className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <CreditCard size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Invoices
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ marginTop: '1.5rem' }}>
        
        {/* EMR Tab */}
        {activeTab === 'emr' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Consultation History</h3>
              {profile?.role in { admin: 1, doctor: 1 } && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowAddRecord(true)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.25rem' }}
                >
                  <Plus size={16} /> Add Consult Record
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading timeline...</div>
            ) : records.length === 0 ? (
              <div className="dashboard-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <ShieldAlert size={36} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--text-muted)' }} />
                <p>No medical consultation records found for this patient.</p>
              </div>
            ) : (
              <div style={timelineStyle}>
                {records.map((rec) => (
                  <div key={rec.id} style={timelineItemStyle}>
                    <div style={timelineBadgeStyle}>
                      {new Date(rec.visit_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={timelineCardStyle}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Diagnosis: <strong>{rec.diagnosis}</strong></span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                          By: Dr. {rec.profiles?.name || 'Unknown'}
                        </span>
                      </h4>

                      {/* Prescriptions */}
                      {rec.prescriptions && rec.prescriptions.length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Prescriptions:</p>
                          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                            {rec.prescriptions.map((p, pIdx) => (
                              <li key={pIdx}>
                                <strong>{p.medication}</strong> - {p.dosage} ({p.frequency}) | {p.duration}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Attachments */}
                      {rec.attachments && rec.attachments.length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {rec.attachments.map((att, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => handleDownloadAttachment(att.path)}
                              style={downloadBtnStyle}
                            >
                              <FileDown size={14} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Appointment Bookings</h3>
            {appointments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No appointments booked.</p>
            ) : (
              <div style={gridListStyle}>
                {appointments.map((ap) => (
                  <div key={ap.id} style={appointmentCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{new Date(ap.slot_start).toLocaleString()}</strong>
                      <span className={`badge badge-${ap.status}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '50px', backgroundColor: ap.status === 'confirmed' ? '#e0f2fe' : '#fee2e2', color: ap.status === 'confirmed' ? '#0369a1' : '#991b1b' }}>
                        {ap.status.toUpperCase()}
                      </span>
                    </div>
                    {ap.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Notes: {ap.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Invoicing History</h3>
            {invoices.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No invoices generated.</p>
            ) : (
              <div style={gridListStyle}>
                {invoices.map((inv) => (
                  <div key={inv.id} style={appointmentCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>₹{inv.total_amount}</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date: {new Date(inv.issued_date).toLocaleDateString()}</p>
                      </div>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '50px', backgroundColor: inv.payment_status === 'paid' ? '#ecfdf5' : '#fef2f2', color: inv.payment_status === 'paid' ? '#065f46' : '#991b1b' }}>
                        {inv.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Consultation Modal */}
      {showAddRecord && (
        <AddMedicalRecordModal
          patientId={patient.id}
          patientName={patient.name}
          onClose={() => setShowAddRecord(false)}
          onSuccess={() => {
            setShowAddRecord(false);
            fetchEMRHistory();
          }}
        />
      )}
    </div>
  );
};

// Styles
const detailBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: '2rem',
  boxShadow: 'var(--shadow-sm)'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '1rem',
  marginBottom: '1.5rem'
};

const demographicsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  backgroundColor: 'var(--bg-primary)',
  borderRadius: 'var(--radius-sm)',
  padding: '1rem',
  border: '1px solid var(--border-color)',
  fontSize: '0.9rem'
};

const demoItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
};

const timelineStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  position: 'relative',
  borderLeft: '2px solid var(--border-color)',
  paddingLeft: '1.5rem',
  marginLeft: '0.5rem',
  marginTop: '1rem'
};

const timelineItemStyle: React.CSSProperties = {
  position: 'relative'
};

const timelineBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  left: '-6.5rem',
  top: '0.25rem',
  width: '5.5rem',
  textAlign: 'right',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--accent-primary)',
  textTransform: 'uppercase'
};

const timelineCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '1.25rem',
  boxShadow: 'var(--shadow-sm)'
};

const downloadBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.375rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
  cursor: 'pointer',
  maxWidth: '200px',
  transition: 'var(--transition-smooth)'
};

const gridListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
};

const appointmentCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '1rem',
  boxShadow: 'var(--shadow-sm)'
};

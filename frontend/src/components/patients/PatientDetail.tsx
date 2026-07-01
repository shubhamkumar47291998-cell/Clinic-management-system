import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { AddMedicalRecordModal } from './AddMedicalRecordModal';
import { Calendar, FileText, CreditCard, Clock, User, Phone, MapPin, Plus, Mail, Printer, Clipboard, X, Edit, Trash2, ShieldAlert, History } from 'lucide-react';
import { validatePatient } from './patientValidation';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';

interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  created_at: string;
  patient_readable_id?: string | null;
  blood_group?: string | null;
  emergency_contact?: string | null;
  medical_history?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  diagnosis: string;
  prescriptions: Array<{ medication: string; dosage: string; frequency: string; duration: string }>;
  attachments: Array<{ path: string; name: string }>;
  profiles: { name: string } | null;
  doctor_signature?: string | null;
}

interface Prescription {
  id: string;
  visit_date: string;
  medicines: Array<{ name: string; dosage: string; duration: string; instructions: string }>;
  notes: string;
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
  invoice_number?: string | null;
  total_amount: number;
  paid_amount?: number;
  balance_amount?: number;
  payment_status: string;
  payment_method?: string | null;
  issued_date: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  profiles: any;
}

interface PatientDetailProps {
  patient: Patient;
  onClose: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onClose }) => {
  const { profile } = useAuth();
  
  const [currentPatient, setCurrentPatient] = useState<Patient>(patient);
  const [activeTab, setActiveTab] = useState<'emr' | 'appointments' | 'prescriptions' | 'invoices' | 'audit'>('emr');
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit Demographic states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPinCode, setEditPinCode] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editMedicalHistory, setEditMedicalHistory] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({});
  const [editErrorMsg, setEditErrorMsg] = useState('');

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
        .eq('patient_id', currentPatient.id)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setRecords((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching EMR:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          visit_date,
          medicines,
          notes,
          profiles (name)
        `)
        .eq('patient_id', currentPatient.id)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setPrescriptions((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, slot_start, status, notes')
        .eq('patient_id', currentPatient.id)
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
        .select('id, invoice_number, total_amount, paid_amount, balance_amount, payment_status, payment_method, issued_date')
        .eq('patient_id', currentPatient.id)
        .order('issued_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          profiles:actor_id (name)
        `)
        .eq('target_id', currentPatient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    setCurrentPatient(patient);
  }, [patient]);

  useEffect(() => {
    fetchEMRHistory();
    fetchPrescriptions();
    fetchAppointments();
    fetchInvoices();
    if (profile?.role && ['admin', 'staff'].includes(profile.role)) {
      fetchAuditLogs();
    }
  }, [currentPatient, profile]);

  const printPrescription = (rec: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const medsList = (rec.prescriptions || []).map((p: any) => `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee;"><strong>${p.medication}</strong></td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee;">${p.dosage}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee;">${p.frequency}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee;">${p.duration}</td>
      </tr>
    `).join('');
    
    const html = `
      <html>
      <head>
        <title>Prescription Rx - ${currentPatient.name}</title>
        <style>
          body { font-family: 'Outfit', 'Inter', sans-serif; color: #333; padding: 40px; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-title { font-size: 28px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
          .clinic-sub { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .meta-info { text-align: right; font-size: 14px; color: #555; }
          .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
          .patient-box div { font-size: 15px; }
          .section-title { font-size: 16px; font-weight: 700; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 30px 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .diagnosis-text { font-size: 16px; background: #fefcf0; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; text-align: left; padding: 12px 10px; font-weight: 600; font-size: 14px; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .signature-section { margin-top: 100px; display: flex; flex-direction: column; align-items: flex-end; }
          .sig-line { width: 220px; border-top: 1px solid #94a3b8; margin-top: 8px; }
          .sig-title { font-size: 12px; color: #64748b; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-title">AURA CLINIC PANEL</div>
            <div class="clinic-sub">Primary & Specialized Medical Care</div>
          </div>
          <div class="meta-info">
            <div><strong>Date:</strong> ${new Date(rec.visit_date).toLocaleDateString()}</div>
            <div><strong>Rx ID:</strong> Rx-${rec.id.substring(0, 8).toUpperCase()}</div>
          </div>
        </div>

        <div class="patient-box">
          <div><strong>Patient ID:</strong> ${currentPatient.patient_readable_id || '-'}</div>
          <div><strong>Patient Name:</strong> ${currentPatient.name}</div>
          <div><strong>Gender / DOB:</strong> ${currentPatient.gender || 'Not specified'} / ${currentPatient.dob ? new Date(currentPatient.dob).toLocaleDateString() : 'Not specified'}</div>
          <div><strong>Blood Group:</strong> ${currentPatient.blood_group || 'Not specified'}</div>
          <div style="grid-column: span 2;"><strong>Practice Address:</strong> ${currentPatient.address || 'Not specified'}</div>
        </div>

        <div class="section-title">Clinical Diagnosis & Notes</div>
        <div class="diagnosis-text">${rec.diagnosis}</div>

        <div class="section-title">Rx - Medication Order</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">Medication</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medsList || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No medications ordered.</td></tr>'}
          </tbody>
        </table>

        <div class="signature-section">
          <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 20px; color: #4f46e5; font-weight: 600;">
            ${rec.doctor_signature || `Dr. ${rec.profiles?.name || 'Consulting Practitioner'}`}
          </div>
          <div class="sig-line"></div>
          <div style="font-weight: 600; font-size: 13px; margin-top: 4px;">Digitally Approved Signatory</div>
          <div class="sig-title">AURA Healthcare Network</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleOpenEdit = () => {
    setEditName(currentPatient.name || '');
    setEditPhone(currentPatient.phone || '');
    setEditEmail(currentPatient.email || '');
    setEditDob(currentPatient.dob || '');
    setEditGender(currentPatient.gender || 'Male');
    setEditAddress(currentPatient.address || '');
    setEditCity(currentPatient.city || '');
    setEditState(currentPatient.state || '');
    setEditPinCode(currentPatient.pin_code || '');
    setEditBloodGroup(currentPatient.blood_group || '');
    setEditEmergencyContact(currentPatient.emergency_contact || '');
    setEditMedicalHistory(currentPatient.medical_history || '');
    setEditValidationErrors({});
    setEditErrorMsg('');
    setShowEditModal(true);
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditValidationErrors({});
    setEditErrorMsg('');

    const validation = validatePatient({
      name: editName,
      phone: editPhone,
      dob: editDob,
      gender: editGender,
      address: editAddress
    });

    if (!validation.isValid) {
      setEditValidationErrors(validation.errors);
      return;
    }

    setEditSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .update({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
          dob: editDob || null,
          gender: editGender,
          address: editAddress.trim() || null,
          city: editCity.trim() || null,
          state: editState.trim() || null,
          pin_code: editPinCode.trim() || null,
          blood_group: editBloodGroup.trim() || null,
          emergency_contact: editEmergencyContact.trim() || null,
          medical_history: editMedicalHistory.trim() || null
        })
        .eq('id', currentPatient.id)
        .select()
        .single();

      if (error) throw error;

      setCurrentPatient(data);
      setShowEditModal(false);
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Failed to update demographics.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete the patient file for ${currentPatient.name}? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', currentPatient.id);

      if (error) throw error;

      alert('Patient file deleted successfully.');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete patient file. Associated clinical records must be removed first.');
    } finally {
      setDeleting(false);
    }
  };

  const renderAuditDetails = (log: AuditLog) => {
    if (log.action === 'patient_create') {
      return <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Registered patient file.</div>;
    }
    if (log.action === 'patient_delete') {
      return <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Deleted patient file.</div>;
    }
    if (log.action === 'patient_update') {
      const oldVal = log.details?.old || {};
      const newVal = log.details?.new || {};
      const changes: string[] = [];

      const keys = ['name', 'phone', 'dob', 'gender', 'address', 'email', 'city', 'state', 'pin_code'];
      keys.forEach(k => {
        if (oldVal[k] !== newVal[k]) {
          changes.push(`${k.toUpperCase()}: "${oldVal[k] || 'none'}" ➔ "${newVal[k] || 'none'}"`);
        }
      });

      if (changes.length === 0) {
        return <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No demographics values were changed.</div>;
      }

      return (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Changed fields:</p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
            {changes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      );
    }
    return <pre style={{ fontSize: '0.75rem', margin: 0 }}>{JSON.stringify(log.details, null, 2)}</pre>;
  };

  return (
    <div style={detailBoxStyle}>
      <header style={headerStyle}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{currentPatient.name}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered: {new Date(currentPatient.created_at).toLocaleDateString()}</p>
        </div>
        <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
          Back to Directory
        </button>
      </header>

      {/* Demographics Summary */}
      <section style={demographicsStyle}>
        <div style={demoItemStyle}>
          <User size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>Patient ID:</strong> {currentPatient.patient_readable_id || '-'}</span>
        </div>
        <div style={demoItemStyle}>
          <User size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>Gender:</strong> {currentPatient.gender || 'Not specified'}</span>
        </div>
        <div style={demoItemStyle}>
          <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>DOB:</strong> {currentPatient.dob ? new Date(currentPatient.dob).toLocaleDateString() : 'Not specified'}</span>
        </div>
        <div style={demoItemStyle}>
          <Phone size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>Phone:</strong> {currentPatient.phone || 'Not specified'}</span>
        </div>
        <div style={demoItemStyle}>
          <Mail size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>Email:</strong> {currentPatient.email || 'Not specified'}</span>
        </div>
        <div style={demoItemStyle}>
          <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>Blood Group:</strong> {currentPatient.blood_group || 'Not specified'}</span>
        </div>
        <div style={demoItemStyle}>
          <Phone size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>Emergency:</strong> {currentPatient.emergency_contact || 'Not specified'}</span>
        </div>
        <div style={{ ...demoItemStyle, gridColumn: 'span 2' }}>
          <MapPin size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>Address:</strong> {currentPatient.address ? `${currentPatient.address}${currentPatient.city ? `, ${currentPatient.city}` : ''}${currentPatient.state ? `, ${currentPatient.state}` : ''}${currentPatient.pin_code ? ` - ${currentPatient.pin_code}` : ''}` : 'No address provided'}</span>
        </div>
        <div style={{ ...demoItemStyle, gridColumn: 'span 3' }}>
          <Clipboard size={16} style={{ color: 'var(--accent-primary)' }} />
          <span><strong>Medical History:</strong> {currentPatient.medical_history || 'None recorded'}</span>
        </div>
      </section>

      {/* Action Bar for Demographics */}
      {profile?.role && ['admin', 'staff'].includes(profile.role) && (
        <div style={actionBarStyle}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenEdit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <Edit size={14} /> Edit Demographics
          </button>
          
          {profile.role === 'admin' && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeletePatient}
              disabled={deleting}
              style={deleteBtnStyle}
            >
              <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete File'}
            </button>
          )}
        </div>
      )}

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
          className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          <Clipboard size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Prescriptions
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
        {profile?.role && ['admin', 'staff'].includes(profile.role) && (
          <button
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <History size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
            Audit History
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div style={{ marginTop: '1.5rem' }}>
        
        {/* EMR Tab */}
        {activeTab === 'emr' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Consultation History</h3>
              {profile?.role && ['admin', 'doctor'].includes(profile.role) && (
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
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Diagnosis: {rec.diagnosis}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dr. {rec.profiles?.name || 'Practitioner'}</span>
                      </h4>
                      
                      {rec.prescriptions && rec.prescriptions.length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Rx Order:</strong>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '0.25rem 0.5rem' }}>Medication</th>
                                <th style={{ padding: '0.25rem 0.5rem' }}>Dosage</th>
                                <th style={{ padding: '0.25rem 0.5rem' }}>Frequency</th>
                                <th style={{ padding: '0.25rem 0.5rem' }}>Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rec.prescriptions.map((p, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '0.25rem 0.5rem' }}><strong>{p.medication}</strong></td>
                                  <td style={{ padding: '0.25rem 0.5rem' }}>{p.dosage}</td>
                                  <td style={{ padding: '0.25rem 0.5rem' }}>{p.frequency}</td>
                                  <td style={{ padding: '0.25rem 0.5rem' }}>{p.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => printPrescription(rec)}
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Printer size={12} /> Print Rx
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div>
            <h3>Practitioner Prescriptions List</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading prescriptions...</div>
            ) : prescriptions.length === 0 ? (
              <div className="dashboard-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Clipboard size={36} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--text-muted)' }} />
                <p>No prescriptions registered in database for this patient.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {prescriptions.map((p) => (
                  <div key={p.id} className="dashboard-card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong>Rx Date:</strong> {new Date(p.visit_date).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Prescribed By:</strong> Dr. {p.profiles?.name || 'Practitioner'}
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: 600 }}>
                          <th style={{ padding: '0.5rem' }}>Medicine Name</th>
                          <th style={{ padding: '0.5rem' }}>Dosage</th>
                          <th style={{ padding: '0.5rem' }}>Duration</th>
                          <th style={{ padding: '0.5rem' }}>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.medicines.map((med, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.5rem' }}><strong>{med.name}</strong></td>
                            <td style={{ padding: '0.5rem' }}>{med.dosage}</td>
                            <td style={{ padding: '0.5rem' }}>{med.duration}</td>
                            <td style={{ padding: '0.5rem' }}>{med.instructions || 'After meals'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {p.notes && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong>Doctor Notes:</strong> {p.notes}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          const dummyRec = {
                            id: p.id,
                            visit_date: p.visit_date,
                            diagnosis: p.notes || 'Routine consult checkup',
                            prescriptions: p.medicines.map(m => ({ medication: m.name, dosage: m.dosage, frequency: m.instructions, duration: m.duration })),
                            doctor_signature: `Dr. ${p.profiles?.name || 'Practitioner'}`
                          };
                          printPrescription(dummyRec);
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Printer size={14} /> Print Rx Order
                      </button>
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
            <h3>Scheduled Appointments</h3>
            {appointments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>No scheduled appointments files found.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Date & Time</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => (
                      <tr key={a.id} style={tableRowStyle}>
                        <td style={tdStyle}>{new Date(a.slot_start).toLocaleString()}</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: a.status === 'confirmed' ? '#dcfce7' : a.status === 'cancelled' ? '#fee2e2' : '#f1f5f9',
                            color: a.status === 'confirmed' ? '#15803d' : a.status === 'cancelled' ? '#b91c1c' : '#475569'
                          }}>
                            {a.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={tdStyle}>{a.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div>
            <h3>Patient Invoices / Billing</h3>
            {invoices.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>No invoices issued for this patient.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Invoice Number</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Total Amount</th>
                      <th style={thStyle}>Paid</th>
                      <th style={thStyle}>Balance</th>
                      <th style={thStyle}>Payment Mode</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={tableRowStyle}>
                        <td style={tdStyle}><strong>{inv.invoice_number || `INV-${inv.id.substring(0, 4)}`}</strong></td>
                        <td style={tdStyle}>{new Date(inv.issued_date).toLocaleDateString()}</td>
                        <td style={tdStyle}>₹{inv.total_amount}</td>
                        <td style={tdStyle}>₹{inv.paid_amount ?? inv.total_amount}</td>
                        <td style={tdStyle}>₹{inv.balance_amount ?? 0}</td>
                        <td style={tdStyle}>{inv.payment_method || 'Cash'}</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: inv.payment_status === 'paid' ? '#dcfce7' : '#fef3c7',
                            color: inv.payment_status === 'paid' ? '#15803d' : '#d97706'
                          }}>
                            {inv.payment_status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div>
            <h3>Data Modification Logs</h3>
            {auditLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>No modification logs registered.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      <span>Action: <strong>{log.action.toUpperCase()}</strong></span>
                      <span>By: {log.profiles?.name || 'Staff'} ({new Date(log.created_at).toLocaleString()})</span>
                    </div>
                    {renderAuditDetails(log)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Edit Demographic Modal */}
      {showEditModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Edit Patient Demographics</h2>
              <button onClick={() => setShowEditModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {editErrorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{editErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePatient} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Patient Name *"
                    icon={User}
                    type="text"
                    placeholder="Rahul Naik"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      if (editValidationErrors.name) {
                        setEditValidationErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    disabled={editSubmitting}
                    required
                  />
                  {editValidationErrors.name && (
                    <span style={errorLabelStyle}>{editValidationErrors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <AuthInput
                    label="Phone Number *"
                    icon={Phone}
                    type="tel"
                    placeholder="9546650878"
                    value={editPhone}
                    onChange={(e) => {
                      setEditPhone(e.target.value);
                      if (editValidationErrors.phone) {
                        setEditValidationErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    disabled={editSubmitting}
                    required
                  />
                  {editValidationErrors.phone && (
                    <span style={errorLabelStyle}>{editValidationErrors.phone}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Email Address"
                    icon={Mail}
                    type="email"
                    placeholder="rahul@gmail.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    disabled={editSubmitting}
                  />
                </div>

                <div className="form-group">
                  <AuthInput
                    label="Date of Birth *"
                    icon={Calendar}
                    type="date"
                    value={editDob}
                    onChange={(e) => {
                      setEditDob(e.target.value);
                      if (editValidationErrors.dob) {
                        setEditValidationErrors(prev => ({ ...prev, dob: '' }));
                      }
                    }}
                    disabled={editSubmitting}
                  />
                  {editValidationErrors.dob && (
                    <span style={errorLabelStyle}>{editValidationErrors.dob}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Gender *</label>
                  <select
                    value={editGender}
                    onChange={(e) => {
                      setEditGender(e.target.value);
                      if (editValidationErrors.gender) {
                        setEditValidationErrors(prev => ({ ...prev, gender: '' }));
                      }
                    }}
                    style={selectStyle}
                    disabled={editSubmitting}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {editValidationErrors.gender && (
                    <span style={errorLabelStyle}>{editValidationErrors.gender}</span>
                  )}
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Blood Group</label>
                  <select
                    value={editBloodGroup}
                    onChange={(e) => setEditBloodGroup(e.target.value)}
                    style={selectStyle}
                    disabled={editSubmitting}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Emergency Contact"
                    icon={Phone}
                    type="tel"
                    placeholder="9988776655"
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                    disabled={editSubmitting}
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
                    disabled={editSubmitting}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="City / Town"
                    icon={MapPin}
                    type="text"
                    placeholder="Sankhalim"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    disabled={editSubmitting}
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
                    disabled={editSubmitting}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Address</label>
                <textarea
                  placeholder="Local address details..."
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  style={textareaStyle}
                  rows={2}
                  disabled={editSubmitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Medical History</label>
                <textarea
                  placeholder="Chronic history details..."
                  value={editMedicalHistory}
                  onChange={(e) => setEditMedicalHistory(e.target.value)}
                  style={textareaStyle}
                  rows={2}
                  disabled={editSubmitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1 }}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={editSubmitting} loadingText="Saving...">
                  Save Changes
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Consultation Modal */}
      {showAddRecord && (
        <AddMedicalRecordModal
          patientId={currentPatient.id}
          patientName={currentPatient.name}
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

const actionBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '1rem',
  marginTop: '1rem'
};

const deleteBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: '0.85rem',
  padding: '0.5rem 1rem'
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

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.875rem'
};

const tableHeaderRowStyle: React.CSSProperties = {
  borderBottom: '2px solid var(--border-color)'
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontWeight: 600,
  color: 'var(--text-primary)'
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border-color)',
  transition: 'var(--transition-smooth)'
};

const tdStyle: React.CSSProperties = {
  padding: '0.875rem 1rem',
  color: 'var(--text-secondary)'
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
  maxWidth: '650px',
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
  fontSize: '0.9rem',
  marginTop: '0.25rem'
};

const errorLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#ef4444',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
  fontWeight: 500
};

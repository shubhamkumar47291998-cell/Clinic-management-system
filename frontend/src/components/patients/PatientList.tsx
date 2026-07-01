import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, UserPlus, Phone, Calendar, User, Eye, X, ChevronLeft, ChevronRight, Filter, Mail, MapPin } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { validatePatient } from './patientValidation';

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
  last_visit?: string | null;
  next_appointment?: string | null;
  appointment_time?: string | null;
  status?: string | null;
}

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
}

export const PatientList: React.FC<PatientListProps> = ({ onSelectPatient }) => {
  const { profile } = useAuth();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Form states for new patient registration
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPatients = async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    
    try {
      const offset = (currentPage - 1) * limit;

      let dbQuery = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      if (searchQuery.trim()) {
        dbQuery = dbQuery.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      if (genderFilter !== 'All') {
        dbQuery = dbQuery.eq('gender', genderFilter);
      }

      const { data, error, count } = await dbQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const patientsList = data || [];
      const patientIds = patientsList.map(p => p.id);

      let appts: any[] = [];
      if (patientIds.length > 0) {
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('patient_id, slot_start, status')
          .in('patient_id', patientIds);
        appts = appointmentsData || [];
      }

      const now = new Date();
      const enrichedPatients = patientsList.map(p => {
        const pAppts = appts.filter(a => a.patient_id === p.id);
        
        // Last visit: latest past completed/confirmed appointment
        const pastAppts = pAppts.filter(a => new Date(a.slot_start) < now && (a.status === 'completed' || a.status === 'confirmed'));
        const lastVisitAppt = pastAppts.sort((a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime())[0];
        
        // Next appointment: earliest future confirmed appointment
        const futureAppts = pAppts.filter(a => new Date(a.slot_start) >= now && a.status === 'confirmed');
        const nextAppt = futureAppts.sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime())[0];

        return {
          ...p,
          last_visit: lastVisitAppt ? new Date(lastVisitAppt.slot_start).toLocaleDateString() : 'Never',
          next_appointment: nextAppt ? new Date(nextAppt.slot_start).toLocaleDateString() : 'None',
          appointment_time: nextAppt ? new Date(nextAppt.slot_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-',
          status: nextAppt ? 'Active' : 'Inactive'
        };
      });

      setPatients(enrichedPatients);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, genderFilter]);

  useEffect(() => {
    fetchPatients();
  }, [profile, searchQuery, genderFilter, currentPage]);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setErrorMsg('');

    // Form input validation
    const validation = validatePatient({
      name,
      phone,
      dob,
      gender,
      address
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('patients').insert({
        clinic_id: profile?.clinic_id,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        dob: dob || null,
        gender: gender,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pin_code: pinCode.trim() || null,
        blood_group: bloodGroup.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        medical_history: medicalHistory.trim() || null
      });

      if (error) throw error;

      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setDob('');
      setGender('Male');
      setAddress('');
      setCity('');
      setState('');
      setPinCode('');
      setBloodGroup('');
      setEmergencyContact('');
      setMedicalHistory('');
      
      setShowAddModal(false);
      fetchPatients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register patient file.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* List Header */}
      <div style={toolbarStyle}>
        <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap', maxWidth: '800px' }}>
          <div style={searchContainerStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>

          <div style={filterContainerStyle}>
            <Filter size={16} style={filterIconStyle} />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {profile?.role && ['admin', 'staff'].includes(profile.role) && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.625rem 1.25rem' }}
          >
            <UserPlus size={18} /> Register Patient
          </button>
        )}
      </div>

      {/* Directory Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading directory files...</div>
      ) : patients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          {searchQuery || genderFilter !== 'All' ? 'No patients match your filters.' : 'No patients registered under this clinic yet.'}
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>Patient ID</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Registration Date</th>
                  <th style={thStyle}>Last Visit</th>
                  <th style={thStyle}>Next Appointment</th>
                  <th style={thStyle}>Appointment Time</th>
                  <th style={thStyle}>Address</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} style={tableRowStyle}>
                    <td style={tdStyle}><strong>{p.patient_readable_id || '-'}</strong></td>
                    <td style={tdStyle}><strong>{p.name}</strong></td>
                    <td style={tdStyle}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>{p.last_visit}</td>
                    <td style={tdStyle}>{p.next_appointment}</td>
                    <td style={tdStyle}>{p.appointment_time}</td>
                    <td style={tdStyle}>{p.address ? `${p.address}${p.city ? `, ${p.city}` : ''}` : '-'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: p.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                        color: p.status === 'Active' ? '#15803d' : '#475569'
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onSelectPatient(p)}
                        style={{ padding: '0.375rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                      >
                        <Eye size={14} /> Open EMR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={paginationContainerStyle}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {Math.min((currentPage - 1) * limit + 1, totalCount)} to {Math.min(currentPage * limit, totalCount)} of {totalCount} patients
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={paginationBtnStyle}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ alignSelf: 'center', fontSize: '0.9rem', fontWeight: 500 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={paginationBtnStyle}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Registration Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Register New Patient File</h2>
              <button onClick={() => setShowAddModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterPatient} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Patient Full Name *"
                    icon={User}
                    type="text"
                    placeholder="Rahul Naik"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (validationErrors.name) {
                        setValidationErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.name && (
                    <span style={errorLabelStyle}>{validationErrors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <AuthInput
                    label="Contact Mobile *"
                    icon={Phone}
                    type="tel"
                    placeholder="9546650878"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (validationErrors.phone) {
                        setValidationErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.phone && (
                    <span style={errorLabelStyle}>{validationErrors.phone}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Email ID"
                    icon={Mail}
                    type="email"
                    placeholder="rahul@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <AuthInput
                    label="Date of Birth *"
                    icon={Calendar}
                    type="date"
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      if (validationErrors.dob) {
                        setValidationErrors(prev => ({ ...prev, dob: '' }));
                      }
                    }}
                    disabled={submitting}
                  />
                  {validationErrors.dob && (
                    <span style={errorLabelStyle}>{validationErrors.dob}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      setGender(e.target.value);
                      if (validationErrors.gender) {
                        setValidationErrors(prev => ({ ...prev, gender: '' }));
                      }
                    }}
                    style={selectStyle}
                    disabled={submitting}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {validationErrors.gender && (
                    <span style={errorLabelStyle}>{validationErrors.gender}</span>
                  )}
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    style={selectStyle}
                    disabled={submitting}
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
                    label="Emergency Contact No"
                    icon={Phone}
                    type="tel"
                    placeholder="9988776655"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <AuthInput
                    label="ZIP / Pin Code"
                    icon={MapPin}
                    type="text"
                    placeholder="403505"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    disabled={submitting}
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
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <AuthInput
                    label="State"
                    icon={MapPin}
                    type="text"
                    placeholder="Goa"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Local Address</label>
                <textarea
                  placeholder="Street and house number details..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={textareaStyle}
                  rows={2}
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Primary Medical History</label>
                <textarea
                  placeholder="Chronic conditions, known drug allergies, or health notes..."
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  style={textareaStyle}
                  rows={2}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Registering...">
                  Create File
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Styles
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  flexWrap: 'wrap',
  alignItems: 'center'
};

const searchContainerStyle: React.CSSProperties = {
  position: 'relative',
  flexGrow: 2,
  minWidth: '220px',
  maxWidth: '450px'
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0.875rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  pointerEvents: 'none'
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.625rem 0.625rem 2.5rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none'
};

const filterContainerStyle: React.CSSProperties = {
  position: 'relative',
  minWidth: '150px'
};

const filterIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0.875rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  pointerEvents: 'none'
};

const filterSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem 0.625rem 2.25rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  cursor: 'pointer'
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

const paginationContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '1.5rem',
  flexWrap: 'wrap',
  gap: '1rem'
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const errorLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#ef4444',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
  fontWeight: 500
};

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, UserPlus, Phone, Calendar, User, Eye, X } from 'lucide-react';
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
}

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
}

export const PatientList: React.FC<PatientListProps> = ({ onSelectPatient }) => {
  const { profile } = useAuth();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new patient registration
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPatients = async (query = '') => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    
    try {
      let dbQuery = supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true });

      if (query.trim()) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery;
      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(searchQuery);
  }, [profile, searchQuery]);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('patients').insert({
        clinic_id: profile?.clinic_id,
        name: name.trim(),
        phone: phone.trim() || null,
        dob: dob || null,
        gender: gender,
        address: address.trim() || null
      });

      if (error) throw error;

      // Reset Form
      setName('');
      setPhone('');
      setDob('');
      setGender('Male');
      setAddress('');
      
      setShowAddModal(false);
      fetchPatients(searchQuery);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register patient file.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* List Header */}
      <div style={toolbarStyle}>
        <div style={searchContainerStyle}>
          <Search size={18} style={searchIconStyle} />
          <input
            type="text"
            placeholder="Search patient by name or contact number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
        </div>

        {profile?.role in { admin: 1, staff: 1 } && (
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
          {searchQuery ? 'No patients match your search.' : 'No patients registered under this clinic yet.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Gender</th>
                <th style={thStyle}>DOB</th>
                <th style={thStyle}>Phone Number</th>
                <th style={thStyle}>Address</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} style={tableRowStyle}>
                  <td style={tdStyle}><strong>{p.name}</strong></td>
                  <td style={tdStyle}>{p.gender || '-'}</td>
                  <td style={tdStyle}>{p.dob ? new Date(p.dob).toLocaleDateString() : '-'}</td>
                  <td style={tdStyle}>{p.phone || '-'}</td>
                  <td style={tdStyle}>{p.address || '-'}</td>
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

            <form onSubmit={handleRegisterPatient} className="auth-form">
              <AuthInput
                label="Patient Name *"
                icon={User}
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
              />

              <AuthInput
                label="Phone Number"
                icon={Phone}
                type="tel"
                placeholder="+91 99999 88888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <AuthInput
                  label="Date of Birth"
                  icon={Calendar}
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={submitting}
                />

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={selectStyle}
                    disabled={submitting}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  placeholder="Home address details..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
  flexGrow: 1,
  maxWidth: '500px'
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

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.9rem'
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
  maxWidth: '450px',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border-color)',
  padding: '2rem'
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
  outline: 'none'
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
  fontSize: '0.925rem'
};

import React, { useEffect, useState, useCallback } from 'react';
import { supabase, signUpSecondaryUser } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, UserPlus, Mail, Lock, User, Activity, Edit2, Calendar, X } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { DoctorScheduleModal } from './DoctorScheduleModal';

interface DoctorProfile {
  id: string;
  name: string;
  email?: string;
  specialization: string | null;
  is_active: boolean;
  created_at: string;
  qualifications?: string[] | null;
  designation?: string | null;
  mobile?: string | null;
  address?: string | null;
  pin_code?: string | null;
}

export const DoctorList: React.FC = () => {
  const { profile } = useAuth();

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Modals & form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>('');
  
  // Registration form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialization, setSpecialization] = useState('');
  
  // Edit form state
  const [editingDoctor, setEditingDoctor] = useState<DoctorProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editQualifications, setEditQualifications] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPinCode, setEditPinCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDoctors = useCallback(async (query = '') => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      let dbQuery = supabase
        .from('profiles')
        .select('id, name, specialization, is_active, created_at, qualifications, designation, mobile, address, pin_code')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .order('name', { ascending: true });

      if (query.trim()) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }

      const { data, error } = await dbQuery;
      if (error) throw error;
      setDoctors(data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id]);

  useEffect(() => {
    fetchDoctors(searchQuery);
  }, [fetchDoctors, searchQuery]);

  const handleRegisterDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Name, email, and password are required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Sign up user via our secondary helper (avoids logging out current admin)
      const { error } = await signUpSecondaryUser(
        email.trim(),
        password,
        name.trim(),
        'doctor',
        profile!.clinic_id!,
        specialization.trim() || undefined
      );

      if (error) throw error;

      setSuccessMsg(`Doctor ${name} registered successfully!`);
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setSpecialization('');
      
      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg('');
      }, 1500);

      fetchDoctors(searchQuery);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register doctor.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor || !editName.trim()) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editName.trim(),
          specialization: editSpecialization.trim() || null,
          designation: editDesignation.trim() || null,
          qualifications: editQualifications.split(',').map(q => q.trim()).filter(Boolean),
          mobile: editMobile.trim() || null,
          address: editAddress.trim() || null,
          pin_code: editPinCode.trim() || null,
        })
        .eq('id', editingDoctor.id);

      if (error) throw error;

      setEditingDoctor(null);
      fetchDoctors(searchQuery);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update doctor details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (doc: DoctorProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !doc.is_active })
        .eq('id', doc.id);

      if (error) throw error;
      fetchDoctors(searchQuery);
    } catch (err) {
      console.error('Error toggling doctor active status:', err);
    }
  };

  const startEdit = (doc: DoctorProfile) => {
    setEditingDoctor(doc);
    setEditName(doc.name);
    setEditSpecialization(doc.specialization || '');
    setEditDesignation(doc.designation || '');
    setEditQualifications((doc.qualifications || []).join(', '));
    setEditMobile(doc.mobile || '');
    setEditAddress(doc.address || '');
    setEditPinCode(doc.pin_code || '');
  };

  const openScheduleConfig = (doc: DoctorProfile) => {
    setSelectedDoctorId(doc.id);
    setSelectedDoctorName(doc.name);
    setShowScheduleModal(true);
  };

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* Top Action Toolbar */}
      <div style={toolbarStyle}>
        <div style={searchContainerStyle}>
          <Search size={18} style={searchIconStyle} />
          <input
            type="text"
            placeholder="Search doctor by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.625rem 1.25rem' }}
        >
          <UserPlus size={18} /> Register Doctor
        </button>
      </div>

      {/* Main Grid / Table of Doctors */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          {searchQuery ? 'No doctors match your search query.' : 'No doctors onboarded under this clinic yet.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>Doctor / Designation</th>
                <th style={thStyle}>Qualifications</th>
                <th style={thStyle}>Specialization</th>
                <th style={thStyle}>Contact Details</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.id} style={tableRowStyle}>
                  <td style={tdStyle}>
                    <strong>{doc.name}</strong>
                    {doc.designation && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{doc.designation}</div>}
                  </td>
                  <td style={tdStyle}>
                    {doc.qualifications && doc.qualifications.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.8rem' }}>
                        {doc.qualifications.map((q, idx) => <li key={idx}>{q}</li>)}
                      </ul>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={tdStyle}>{doc.specialization || 'General Practice'}</td>
                  <td style={tdStyle}>
                    {doc.mobile && <div style={{ fontSize: '0.8rem' }}>📞 {doc.mobile}</div>}
                    {doc.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {doc.address} {doc.pin_code && `(${doc.pin_code})`}</div>}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleToggleActive(doc)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.8rem',
                        borderRadius: '50px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        backgroundColor: doc.is_active ? '#ecfdf5' : '#fef2f2',
                        color: doc.is_active ? '#065f46' : '#991b1b',
                      }}
                    >
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => startEdit(doc)}
                        style={{ padding: '0.375rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openScheduleConfig(doc)}
                        style={{ padding: '0.375rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                      >
                        <Calendar size={14} /> Schedule
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Doctor Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Register New Doctor</h2>
              <button onClick={() => setShowAddModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterDoctor} className="auth-form">
              <AuthInput
                label="Full Name *"
                icon={User}
                type="text"
                placeholder="Dr. Shubham Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
              />

              <AuthInput
                label="Email Address *"
                icon={Mail}
                type="email"
                placeholder="doctor@apex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />

              <AuthInput
                label="Temporary Password *"
                icon={Lock}
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />

              <AuthInput
                label="Specialization (e.g. Cardiologist, Pediatrician)"
                icon={Activity}
                type="text"
                placeholder="Cardiologist"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                disabled={submitting}
              />

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
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
                  Add Doctor
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Details Modal */}
      {editingDoctor && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Edit Doctor Details</h2>
              <button onClick={() => setEditingDoctor(null)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateDoctor} className="auth-form">
              <AuthInput
                label="Full Name *"
                icon={User}
                type="text"
                placeholder="Dr. Shubham Kumar"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={submitting}
                required
              />

              <AuthInput
                label="Specialization"
                icon={Activity}
                type="text"
                placeholder="Cardiologist"
                value={editSpecialization}
                onChange={(e) => setEditSpecialization(e.target.value)}
                disabled={submitting}
              />

              <AuthInput
                label="Designation"
                icon={User}
                type="text"
                placeholder="Consultant Physician"
                value={editDesignation}
                onChange={(e) => setEditDesignation(e.target.value)}
                disabled={submitting}
              />

              <AuthInput
                label="Qualifications (comma-separated)"
                icon={Activity}
                type="text"
                placeholder="MBBS, MD"
                value={editQualifications}
                onChange={(e) => setEditQualifications(e.target.value)}
                disabled={submitting}
              />

              <AuthInput
                label="Mobile Number"
                icon={Activity}
                type="text"
                placeholder="9546650878"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                disabled={submitting}
              />

              <AuthInput
                label="Address"
                icon={User}
                type="text"
                placeholder="Sankhalim, Goa, India"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                disabled={submitting}
              />

              <AuthInput
                label="PIN Code"
                icon={User}
                type="text"
                placeholder="403505"
                value={editPinCode}
                onChange={(e) => setEditPinCode(e.target.value)}
                disabled={submitting}
              />

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingDoctor(null)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Saving Changes...">
                  Save Changes
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Weekly Schedule Config Modal */}
      {showScheduleModal && selectedDoctorId && (
        <DoctorScheduleModal
          doctorId={selectedDoctorId}
          doctorName={selectedDoctorName}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedDoctorId(null);
          }}
        />
      )}

    </div>
  );
};

// Local Styles
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const searchContainerStyle: React.CSSProperties = {
  position: 'relative',
  flexGrow: 1,
  maxWidth: '500px',
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0.875rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  pointerEvents: 'none',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.625rem 0.625rem 2.5rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.9rem',
};

const tableHeaderRowStyle: React.CSSProperties = {
  borderBottom: '2px solid var(--border-color)',
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border-color)',
  transition: 'var(--transition-smooth)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.875rem 1rem',
  color: 'var(--text-secondary)',
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
  maxWidth: '450px',
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

import React, { useEffect, useState, useCallback } from 'react';
import { supabase, signUpSecondaryUser } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, UserPlus, Mail, Lock, User, Edit2, X, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { validateStaff } from './staffValidation';

interface StaffProfile {
  id: string; // matches profiles.id
  profile_id: string;
  name: string;
  email?: string;
  role: string;
  staff_type: 'receptionist' | 'pharmacist' | 'lab_technician' | 'billing_clerk';
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export const StaffList: React.FC = () => {
  const { profile } = useAuth();

  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Add staff modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffType, setStaffType] = useState('receptionist');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit staff modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editStaffType, setEditStaffType] = useState('receptionist');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const fetchStaff = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;

      // Fetch from profiles and staff_details joined
      let dbQuery = supabase
        .from('staff_details')
        .select(`
          id,
          profile_id,
          staff_type,
          phone,
          address,
          is_active,
          created_at,
          profiles:profile_id (name, role)
        `, { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      if (typeFilter !== 'All') {
        dbQuery = dbQuery.eq('staff_type', typeFilter);
      }

      const { data, error, count } = await dbQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Map to flatter interface
      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        profile_id: row.profile_id,
        name: row.profiles?.name || 'Unknown',
        role: row.profiles?.role || 'staff',
        staff_type: row.staff_type,
        phone: row.phone,
        address: row.address,
        is_active: row.is_active,
        created_at: row.created_at
      }));

      setStaff(mapped);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching staff directory:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id, currentPage, typeFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validateStaff({
      name,
      email,
      staffType,
      phone
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create account via secondary client
      const { data: authData, error: authError } = await signUpSecondaryUser(
        email.trim(),
        password,
        name.trim(),
        'staff',
        profile!.clinic_id!
      );

      if (authError) throw authError;
      if (!authData.user) throw new Error('Auth account creation failed.');

      // 2. Insert into staff_details
      const { error: detailsError } = await supabase
        .from('staff_details')
        .insert({
          profile_id: authData.user.id,
          clinic_id: profile!.clinic_id!,
          staff_type: staffType,
          phone: phone.trim() || null,
          address: address.trim() || null,
          is_active: true
        });

      if (detailsError) throw detailsError;

      setSuccessMsg(`Staff ${name} registered successfully!`);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setAddress('');

      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg('');
        fetchStaff();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (member: StaffProfile) => {
    setEditingStaff(member);
    setEditName(member.name);
    setEditStaffType(member.staff_type);
    setEditPhone(member.phone || '');
    setEditAddress(member.address || '');
    setValidationErrors({});
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setValidationErrors({});
    setErrorMsg('');

    const validation = validateStaff({
      name: editName,
      staffType: editStaffType,
      phone: editPhone,
      isEditMode: true
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setSubmitting(true);

    try {
      // 1. Update public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: editName.trim() })
        .eq('id', editingStaff.profile_id);

      if (profileError) throw profileError;

      // 2. Update staff_details
      const { error: detailsError } = await supabase
        .from('staff_details')
        .update({
          staff_type: editStaffType,
          phone: editPhone.trim() || null,
          address: editAddress.trim() || null
        })
        .eq('id', editingStaff.id);

      if (detailsError) throw detailsError;

      setShowEditModal(false);
      fetchStaff();
    } catch (err: any) {
      setErrorMsg(err.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member: StaffProfile) => {
    try {
      const { error } = await supabase
        .from('staff_details')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);

      if (error) throw error;
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to update active status.');
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* Toolbar filters */}
      <div style={toolbarStyle}>
        <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap', maxWidth: '800px' }}>
          <div style={searchContainerStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search staff members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>

          <div style={filterContainerStyle}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">All Roles</option>
              <option value="receptionist">Receptionists</option>
              <option value="pharmacist">Pharmacists</option>
              <option value="lab_technician">Lab Technicians</option>
              <option value="billing_clerk">Billing Clerks</option>
            </select>
          </div>
        </div>

        {profile?.role === 'admin' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <UserPlus size={18} /> Register Staff
          </button>
        )}
      </div>

      {/* Directory Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading support team files...</div>
      ) : staff.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No support staff found matching these filters.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>Staff Member</th>
                  <th style={thStyle}>Role Type</th>
                  <th style={thStyle}>Phone Number</th>
                  <th style={thStyle}>Address</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff
                  .filter(member => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((member) => (
                    <tr key={member.id} style={tableRowStyle}>
                      <td style={tdStyle}>
                        <strong>{member.name}</strong>
                      </td>
                      <td style={{ ...tdStyle, textTransform: 'capitalize' }}>
                        {member.staff_type.replace('_', ' ')}
                      </td>
                      <td style={tdStyle}>{member.phone || '-'}</td>
                      <td style={tdStyle}>{member.address || '-'}</td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(member)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '50px',
                            backgroundColor: member.is_active ? '#ecfdf5' : '#fee2e2',
                            color: member.is_active ? '#065f46' : '#b91c1c'
                          }}
                        >
                          {member.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOpenEdit(member)}
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={paginationContainerStyle}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {Math.min((currentPage - 1) * limit + 1, totalCount)} to {Math.min(currentPage * limit, totalCount)} of {totalCount} members
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
              <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Register Support Personnel</h2>
              <button onClick={() => setShowAddModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {successMsg && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterStaff} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Full Name *"
                    icon={User}
                    type="text"
                    placeholder="Emma Watson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.name && <span style={errorLabelStyle}>{validationErrors.name}</span>}
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Staff Role Type *</label>
                  <select
                    value={staffType}
                    onChange={(e) => setStaffType(e.target.value)}
                    style={selectStyle}
                    disabled={submitting}
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="lab_technician">Lab Technician</option>
                    <option value="billing_clerk">Billing Clerk</option>
                  </select>
                  {validationErrors.staffType && <span style={errorLabelStyle}>{validationErrors.staffType}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Email Account *"
                    icon={Mail}
                    type="email"
                    placeholder="emma@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.email && <span style={errorLabelStyle}>{validationErrors.email}</span>}
                </div>
                <div className="form-group">
                  <AuthInput
                    label="Access Password *"
                    icon={Lock}
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <AuthInput
                  label="Contact Phone"
                  icon={Phone}
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
                {validationErrors.phone && <span style={errorLabelStyle}>{validationErrors.phone}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Home Address</label>
                <textarea
                  placeholder="Home address details..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={textareaStyle}
                  rows={2}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
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
                  Create Account
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && editingStaff && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Edit Staff Member</h2>
              <button onClick={() => setShowEditModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaff} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Full Name *"
                    icon={User}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.name && <span style={errorLabelStyle}>{validationErrors.name}</span>}
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Staff Role Type *</label>
                  <select
                    value={editStaffType}
                    onChange={(e) => setEditStaffType(e.target.value)}
                    style={selectStyle}
                    disabled={submitting}
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="lab_technician">Lab Technician</option>
                    <option value="billing_clerk">Billing Clerk</option>
                  </select>
                  {validationErrors.staffType && <span style={errorLabelStyle}>{validationErrors.staffType}</span>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <AuthInput
                  label="Contact Phone"
                  icon={Phone}
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={submitting}
                />
                {validationErrors.phone && <span style={errorLabelStyle}>{validationErrors.phone}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Home Address</label>
                <textarea
                  placeholder="Home address details..."
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  style={textareaStyle}
                  rows={2}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Saving...">
                  Save Changes
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
  alignItems: 'center',
  marginBottom: '1rem'
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
  minWidth: '180px'
};

const filterSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
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
  maxWidth: '480px',
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: 500,
  fontSize: '0.875rem'
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
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
  fontFamily: 'var(--font-family)',
  fontSize: '0.925rem'
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

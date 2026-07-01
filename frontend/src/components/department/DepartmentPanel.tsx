import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Building, User, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { validateDepartment } from './departmentValidation';

interface Department {
  id: string;
  clinic_id: string;
  name: string;
  code: string;
  description: string | null;
  head_doctor_id: string | null;
  head_doctor_name: string;
  is_active: boolean;
  created_at: string;
}

export const DepartmentPanel: React.FC = () => {
  const { profile } = useAuth();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 6; // Grid looks best with 6 items per page (e.g. 3x2 grid)

  // Add department modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [headDoctorId, setHeadDoctorId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit department modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editHeadDoctorId, setEditHeadDoctorId] = useState('');

  // Doctor List for head selection
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);

  const fetchDepartments = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;

      const { data, error, count } = await supabase
        .from('departments')
        .select(`
          id,
          clinic_id,
          name,
          code,
          description,
          head_doctor_id,
          is_active,
          created_at,
          profiles:head_doctor_id (name)
        `, { count: 'exact' })
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const mapped = (data || []).map((row: any) => {
        const headDoc = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          clinic_id: row.clinic_id,
          name: row.name,
          code: row.code,
          description: row.description,
          head_doctor_id: row.head_doctor_id,
          head_doctor_name: headDoc?.name || 'Unassigned',
          is_active: row.is_active,
          created_at: row.created_at
        };
      });

      setDepartments(mapped);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id, currentPage]);

  const fetchDoctors = useCallback(async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (err: any) {
      console.error('Error fetching doctors list:', err);
    }
  }, [profile?.clinic_id]);

  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
  }, [fetchDepartments, fetchDoctors]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validateDepartment({ name, code });
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('departments')
        .insert({
          clinic_id: profile!.clinic_id!,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
          head_doctor_id: headDoctorId || null,
          is_active: true
        });

      if (error) throw error;

      setSuccessMsg('Department created successfully!');
      setName('');
      setCode('');
      setDescription('');
      setHeadDoctorId('');

      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg('');
        fetchDepartments();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditCode(dept.code);
    setEditDescription(dept.description || '');
    setEditHeadDoctorId(dept.head_doctor_id || '');
    setValidationErrors({});
    setErrorMsg('');
    setShowEditModal(true);
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setValidationErrors({});
    setErrorMsg('');

    const validation = validateDepartment({ name: editName, code: editCode });
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('departments')
        .update({
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          description: editDescription.trim() || null,
          head_doctor_id: editHeadDoctorId || null
        })
        .eq('id', editingDept.id);

      if (error) throw error;

      setSuccessMsg('Department updated successfully!');
      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMsg('');
        fetchDepartments();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update department.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update({ is_active: !dept.is_active })
        .eq('id', dept.id);

      if (error) throw error;
      fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Local filter for search query
  const filteredDepts = departments.filter(dept => {
    const nameMatch = dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = dept.code.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || codeMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top action bar */}
      <div style={toolbarStyle}>
        <div style={searchContainerStyle}>
          <Search size={18} style={searchIconStyle} />
          <input
            type="text"
            placeholder="Search departments by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
        </div>

        {profile?.role === 'admin' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <Plus size={18} /> Add Department
          </button>
        )}
      </div>

      {/* Grid container */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading departments...</div>
      ) : filteredDepts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No departments found.
        </div>
      ) : (
        <>
          <div style={gridStyle}>
            {filteredDepts.map((dept) => (
              <div key={dept.id} className="dashboard-card" style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={iconContainerStyle}>
                      <Building size={20} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{dept.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        CODE: {dept.code}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => profile?.role === 'admin' && handleToggleActive(dept)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: profile?.role === 'admin' ? 'pointer' : 'default',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '50px',
                      backgroundColor: dept.is_active ? '#ecfdf5' : '#fee2e2',
                      color: dept.is_active ? '#065f46' : '#b91c1c'
                    }}
                  >
                    {dept.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>

                <div style={cardBodyStyle}>
                  <p style={descStyle}>{dept.description || 'No department description provided.'}</p>

                  <div style={managerContainerStyle}>
                    <User size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem' }}>
                      Head: <strong>{dept.head_doctor_name}</strong>
                    </span>
                  </div>
                </div>

                {profile?.role === 'admin' && (
                  <div style={cardFooterStyle}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenEdit(dept)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                    >
                      Configure Department
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div style={paginationContainerStyle}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {Math.min((currentPage - 1) * limit + 1, totalCount)} to {Math.min(currentPage * limit, totalCount)} of {totalCount} departments
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

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Create Clinic Department</h2>
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

            <form onSubmit={handleCreateDepartment} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Department Name *"
                    icon={Building}
                    type="text"
                    placeholder="Pediatrics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.name && <span style={errorLabelStyle}>{validationErrors.name}</span>}
                </div>

                <div className="form-group">
                  <AuthInput
                    label="Short Code *"
                    icon={Plus}
                    type="text"
                    placeholder="PEDS"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.code && <span style={errorLabelStyle}>{validationErrors.code}</span>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Head Doctor (Manager)</label>
                <select
                  value={headDoctorId}
                  onChange={(e) => setHeadDoctorId(e.target.value)}
                  style={selectStyle}
                  disabled={submitting}
                >
                  <option value="">-- No Head Doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  placeholder="Describe department roles and services..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={textareaStyle}
                  rows={3}
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
                <AuthButton type="submit" loading={submitting} loadingText="Creating...">
                  Create Department
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && editingDept && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Edit Department Details</h2>
              <button onClick={() => setShowEditModal(false)} style={closeBtnStyle}><X size={20} /></button>
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

            <form onSubmit={handleUpdateDepartment} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Department Name *"
                    icon={Building}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.name && <span style={errorLabelStyle}>{validationErrors.name}</span>}
                </div>

                <div className="form-group">
                  <AuthInput
                    label="Short Code *"
                    icon={Plus}
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  {validationErrors.code && <span style={errorLabelStyle}>{validationErrors.code}</span>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Head Doctor (Manager)</label>
                <select
                  value={editHeadDoctorId}
                  onChange={(e) => setEditHeadDoctorId(e.target.value)}
                  style={selectStyle}
                  disabled={submitting}
                >
                  <option value="">-- No Head Doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  placeholder="Describe department roles and services..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={textareaStyle}
                  rows={3}
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
  alignItems: 'center'
};

const searchContainerStyle: React.CSSProperties = {
  position: 'relative',
  flexGrow: 2,
  minWidth: '250px',
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

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '1.5rem',
  marginTop: '0.5rem'
};

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '1.5rem',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  height: '100%'
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.75rem'
};

const iconContainerStyle: React.CSSProperties = {
  backgroundColor: 'rgba(99, 102, 241, 0.1)',
  padding: '0.5rem',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const cardBodyStyle: React.CSSProperties = {
  flexGrow: 1,
  marginBottom: '1.5rem'
};

const descStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
  margin: '0 0 1rem 0'
};

const managerContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: 'var(--text-secondary)'
};

const cardFooterStyle: React.CSSProperties = {
  marginTop: 'auto'
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

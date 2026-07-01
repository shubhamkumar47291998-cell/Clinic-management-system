import React, { useEffect, useState, useCallback } from 'react';
import { supabase, signUpSecondaryUser } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, UserPlus, Calendar, User, Clock, MapPin, X, Plus, ChevronLeft, ChevronRight, Phone, Mail, Lock } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { validateNurseAssignment } from './nurseValidation';

interface NurseProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  specialization?: string | null;
  is_active: boolean;
  created_at: string;
}

interface NurseAssignment {
  id: string;
  clinic_id: string;
  nurse_id: string;
  assigned_ward: string;
  shift: 'morning' | 'evening' | 'night';
  start_date: string;
  end_date: string | null;
  created_at: string;
  profiles?: {
    name: string;
  } | null;
}

export const NursePanel: React.FC = () => {
  const { profile } = useAuth();

  // Sub-tabs: 'roster' or 'registry'
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'registry'>('roster');

  // Roster States
  const [rosters, setRosters] = useState<NurseAssignment[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterCount, setRosterCount] = useState(0);
  const [loadingRosters, setLoadingRosters] = useState(false);

  // Registry States
  const [nurses, setNurses] = useState<NurseProfile[]>([]);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryPage, setRegistryPage] = useState(1);
  const [registryCount, setRegistryCount] = useState(0);
  const [loadingRegistry, setLoadingRegistry] = useState(false);

  const limit = 10;

  // Add Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [assignedWard, setAssignedWard] = useState('');
  const [shift, setShift] = useState<'morning' | 'evening' | 'night'>('morning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Register Nurse Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('');
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Nurse assignments (Roster)
  const fetchRosters = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoadingRosters(true);
    try {
      const offset = (rosterPage - 1) * limit;

      let dbQuery = supabase
        .from('nurse_assignments')
        .select(`
          id,
          clinic_id,
          nurse_id,
          assigned_ward,
          shift,
          start_date,
          end_date,
          created_at,
          profiles:nurse_id (name)
        `, { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      if (shiftFilter !== 'All') {
        dbQuery = dbQuery.eq('shift', shiftFilter);
      }

      const { data, error, count } = await dbQuery
        .order('start_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      setRosters((data || []) as any[]);
      setRosterCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching nurse rosters:', err);
    } finally {
      setLoadingRosters(false);
    }
  }, [profile?.clinic_id, rosterPage, shiftFilter]);

  // Fetch Nurse Registry (Profiles with role = 'nurse')
  const fetchRegistry = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoadingRegistry(true);
    try {
      const offset = (registryPage - 1) * limit;

      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, name, email, phone, specialization, is_active, created_at', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'nurse')
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      setNurses((data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email || '',
        phone: p.phone || '',
        specialization: p.specialization || '',
        is_active: p.is_active ?? true,
        created_at: p.created_at
      })));
      setRegistryCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching nurse registry:', err);
    } finally {
      setLoadingRegistry(false);
    }
  }, [profile?.clinic_id, registryPage]);

  // Load appropriate data on active sub-tab change
  useEffect(() => {
    if (activeSubTab === 'roster') {
      fetchRosters();
    } else {
      fetchRegistry();
    }
  }, [activeSubTab, fetchRosters, fetchRegistry]);

  // Handle Roster Assignment Creation
  const handleAssignNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignErrors({});
    setNotification(null);

    const validation = validateNurseAssignment({
      nurseId: selectedNurseId,
      assignedWard,
      shift,
      startDate,
      endDate: endDate || undefined
    });

    if (!validation.isValid) {
      setAssignErrors(validation.errors);
      return;
    }

    setAssignSubmitting(true);
    try {
      const { error } = await supabase
        .from('nurse_assignments')
        .insert({
          clinic_id: profile!.clinic_id!,
          nurse_id: selectedNurseId,
          assigned_ward: assignedWard.trim(),
          shift,
          start_date: startDate,
          end_date: endDate || null
        });

      if (error) throw error;

      setNotification({ type: 'success', message: 'Nurse assigned to ward successfully!' });
      setSelectedNurseId('');
      setAssignedWard('');
      setShift('morning');
      setStartDate('');
      setEndDate('');
      
      setTimeout(() => {
        setShowAssignModal(false);
        setNotification(null);
        fetchRosters();
      }, 1500);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to assign nurse.' });
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Handle Nurse registration (New auth user with role = 'nurse')
  const handleRegisterNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrors({});
    setNotification(null);

    const errors: Record<string, string> = {};
    if (!regName || regName.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }
    if (!regEmail || regEmail.trim().length === 0) {
      errors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(regEmail.trim())) {
        errors.email = 'Please provide a valid email address';
      }
    }
    if (!regPassword || regPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }

    setRegisterSubmitting(true);
    try {
      // 1. Create User via secondary client
      const { data: authData, error: authError } = await signUpSecondaryUser(
        regEmail.trim(),
        regPassword,
        regName.trim(),
        'nurse',
        profile!.clinic_id!
      );

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create account.');

      // 2. Update optional fields like phone/specialization on profiles
      if (regPhone || regSpecialization) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            phone: regPhone.trim() || null,
            specialization: regSpecialization.trim() || null
          })
          .eq('id', authData.user.id);
        if (profileUpdateError) throw profileUpdateError;
      }

      setNotification({ type: 'success', message: `Nurse ${regName} registered successfully!` });
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegPhone('');
      setRegSpecialization('');

      setTimeout(() => {
        setShowRegisterModal(false);
        setNotification(null);
        fetchRegistry();
      }, 1500);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Registration failed.' });
    } finally {
      setRegisterSubmitting(false);
    }
  };

  // Delete/Release assignment
  const handleRemoveAssignment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this roster schedule?')) return;
    try {
      const { error } = await supabase
        .from('nurse_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRosters();
    } catch (err: any) {
      alert(err.message || 'Failed to remove assignment.');
    }
  };

  // Toggle Nurse Active Status
  const handleToggleNurseActive = async (nurse: NurseProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !nurse.is_active })
        .eq('id', nurse.id);

      if (error) throw error;
      fetchRegistry();
    } catch (err: any) {
      alert(err.message || 'Failed to update active status.');
    }
  };

  // Helpers for dropdown nurse loading
  const [availableNurses, setAvailableNurses] = useState<{ id: string; name: string }[]>([]);
  const loadAvailableNurses = async () => {
    if (!profile?.clinic_id) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('clinic_id', profile.clinic_id)
      .eq('role', 'nurse')
      .eq('is_active', true)
      .order('name');
    setAvailableNurses(data || []);
  };

  useEffect(() => {
    if (showAssignModal) {
      loadAvailableNurses();
    }
  }, [showAssignModal]);

  const rosterTotalPages = Math.ceil(rosterCount / limit) || 1;
  const registryTotalPages = Math.ceil(registryCount / limit) || 1;

  // Filter schedules locally by search input
  const filteredRosters = rosters.filter(r => {
    const nameMatch = r.profiles?.name?.toLowerCase().includes(rosterSearch.toLowerCase()) ?? false;
    const wardMatch = r.assigned_ward?.toLowerCase().includes(rosterSearch.toLowerCase()) ?? false;
    return nameMatch || wardMatch;
  });

  // Filter registry locally by search input
  const filteredRegistry = nurses.filter(n => {
    const nameMatch = n.name.toLowerCase().includes(registrySearch.toLowerCase());
    const specializationMatch = n.specialization?.toLowerCase().includes(registrySearch.toLowerCase()) ?? false;
    return nameMatch || specializationMatch;
  });

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* Subtab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveSubTab('roster')}
          style={{
            ...subTabStyle,
            borderBottom: activeSubTab === 'roster' ? '2px solid var(--color-primary)' : 'none',
            color: activeSubTab === 'roster' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'roster' ? 600 : 500
          }}
        >
          Roster Schedules
        </button>
        <button
          onClick={() => setActiveSubTab('registry')}
          style={{
            ...subTabStyle,
            borderBottom: activeSubTab === 'registry' ? '2px solid var(--color-primary)' : 'none',
            color: activeSubTab === 'registry' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'registry' ? 600 : 500
          }}
        >
          Nurses Registry
        </button>
      </div>

      {/* Roster Schedules View */}
      {activeSubTab === 'roster' && (
        <div>
          <div style={toolbarStyle}>
            <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap', maxWidth: '800px' }}>
              <div style={searchContainerStyle}>
                <Search size={18} style={searchIconStyle} />
                <input
                  type="text"
                  placeholder="Search ward or nurse..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  style={searchInputStyle}
                />
              </div>

              <div style={filterContainerStyle}>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  style={filterSelectStyle}
                >
                  <option value="All">All Shifts</option>
                  <option value="morning">Morning Shift</option>
                  <option value="evening">Evening Shift</option>
                  <option value="night">Night Shift</option>
                </select>
              </div>
            </div>

            {profile?.role === 'admin' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAssignModal(true)}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              >
                <Plus size={18} /> Schedule Shift
              </button>
            )}
          </div>

          {loadingRosters ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading rosters...</div>
          ) : filteredRosters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No roster schedules found.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Nurse</th>
                      <th style={thStyle}>Assigned Ward</th>
                      <th style={thStyle}>Shift</th>
                      <th style={thStyle}>Start Date</th>
                      <th style={thStyle}>End Date</th>
                      {profile?.role === 'admin' && <th style={thStyle}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRosters.map((roster) => (
                      <tr key={roster.id} style={tableRowStyle}>
                        <td style={tdStyle}>
                          <strong>{roster.profiles?.name || 'Unknown Nurse'}</strong>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                            {roster.assigned_ward}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            backgroundColor: roster.shift === 'morning' ? '#e0f2fe' : roster.shift === 'evening' ? '#fef3c7' : '#f3e8ff',
                            color: roster.shift === 'morning' ? '#0369a1' : roster.shift === 'evening' ? '#b45309' : '#6b21a8'
                          }}>
                            {roster.shift}
                          </span>
                        </td>
                        <td style={tdStyle}>{roster.start_date}</td>
                        <td style={tdStyle}>{roster.end_date || 'Ongoing'}</td>
                        {profile?.role === 'admin' && (
                          <td style={tdStyle}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleRemoveAssignment(roster.id)}
                              style={{ padding: '0.25rem 0.5rem', color: '#b91c1c', borderColor: '#fee2e2' }}
                            >
                              Release
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Roster Pagination */}
              <div style={paginationContainerStyle}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {Math.min((rosterPage - 1) * limit + 1, rosterCount)} to {Math.min(rosterPage * limit, rosterCount)} of {rosterCount} shifts
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={rosterPage === 1}
                    onClick={() => setRosterPage(prev => Math.max(prev - 1, 1))}
                    style={paginationBtnStyle}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
                    Page {rosterPage} of {rosterTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={rosterPage === rosterTotalPages}
                    onClick={() => setRosterPage(prev => Math.min(prev + 1, rosterTotalPages))}
                    style={paginationBtnStyle}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Nurses Registry View */}
      {activeSubTab === 'registry' && (
        <div>
          <div style={toolbarStyle}>
            <div style={searchContainerStyle}>
              <Search size={18} style={searchIconStyle} />
              <input
                type="text"
                placeholder="Search nurses name/spec..."
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                style={searchInputStyle}
              />
            </div>

            {profile?.role === 'admin' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowRegisterModal(true)}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              >
                <UserPlus size={18} /> Register Nurse
              </button>
            )}
          </div>

          {loadingRegistry ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading nurses directory...</div>
          ) : filteredRegistry.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No nurses registered yet.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Nurse Name</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Phone</th>
                      <th style={thStyle}>Ward / Specialization</th>
                      <th style={thStyle}>Status</th>
                      {profile?.role === 'admin' && <th style={thStyle}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistry.map((nurse) => (
                      <tr key={nurse.id} style={tableRowStyle}>
                        <td style={tdStyle}>
                          <strong>{nurse.name}</strong>
                        </td>
                        <td style={tdStyle}>{nurse.email || '-'}</td>
                        <td style={tdStyle}>{nurse.phone || '-'}</td>
                        <td style={tdStyle}>{nurse.specialization || 'General nursing'}</td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => profile?.role === 'admin' && handleToggleNurseActive(nurse)}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: profile?.role === 'admin' ? 'pointer' : 'default',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '50px',
                              backgroundColor: nurse.is_active ? '#ecfdf5' : '#fee2e2',
                              color: nurse.is_active ? '#065f46' : '#b91c1c'
                            }}
                          >
                            {nurse.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        {profile?.role === 'admin' && (
                          <td style={tdStyle}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                setSelectedNurseId(nurse.id);
                                setShowAssignModal(true);
                              }}
                              style={{ padding: '0.25rem 0.5rem' }}
                            >
                              Schedule Shift
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Registry Pagination */}
              <div style={paginationContainerStyle}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {Math.min((registryPage - 1) * limit + 1, registryCount)} to {Math.min(registryPage * limit, registryCount)} of {registryCount} nurses
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={registryPage === 1}
                    onClick={() => setRegistryPage(prev => Math.max(prev - 1, 1))}
                    style={paginationBtnStyle}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
                    Page {registryPage} of {registryTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={registryPage === registryTotalPages}
                    onClick={() => setRegistryPage(prev => Math.min(prev + 1, registryTotalPages))}
                    style={paginationBtnStyle}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Roster Assignment Modal */}
      {showAssignModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Schedule Nurse Shift</h2>
              <button onClick={() => setShowAssignModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {notification && (
              <div className={`alert alert-${notification.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '1rem' }}>
                <span>{notification.message}</span>
              </div>
            )}

            <form onSubmit={handleAssignNurse} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Select Nurse *</label>
                <select
                  value={selectedNurseId}
                  onChange={(e) => setSelectedNurseId(e.target.value)}
                  style={selectStyle}
                  disabled={assignSubmitting}
                >
                  <option value="">-- Choose Nurse --</option>
                  {availableNurses.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                {assignErrors.nurseId && <span style={errorLabelStyle}>{assignErrors.nurseId}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Ward/Location *"
                    icon={MapPin}
                    type="text"
                    placeholder="ICU Ward B"
                    value={assignedWard}
                    onChange={(e) => setAssignedWard(e.target.value)}
                    disabled={assignSubmitting}
                    required
                  />
                  {assignErrors.assignedWard && <span style={errorLabelStyle}>{assignErrors.assignedWard}</span>}
                </div>

                <div className="form-group">
                  <label style={labelStyle}>Shift *</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    style={selectStyle}
                    disabled={assignSubmitting}
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                  {assignErrors.shift && <span style={errorLabelStyle}>{assignErrors.shift}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Start Date *"
                    icon={Calendar}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={assignSubmitting}
                    required
                  />
                  {assignErrors.startDate && <span style={errorLabelStyle}>{assignErrors.startDate}</span>}
                </div>

                <div className="form-group">
                  <AuthInput
                    label="End Date (Optional)"
                    icon={Calendar}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={assignSubmitting}
                  />
                  {assignErrors.endDate && <span style={errorLabelStyle}>{assignErrors.endDate}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                  style={{ flex: 1 }}
                  disabled={assignSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={assignSubmitting} loadingText="Scheduling...">
                  Assign Nurse
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Nurse Modal */}
      {showRegisterModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Register New Nurse</h2>
              <button onClick={() => setShowRegisterModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {notification && (
              <div className={`alert alert-${notification.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '1rem' }}>
                <span>{notification.message}</span>
              </div>
            )}

            <form onSubmit={handleRegisterNurse} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Full Name *"
                    icon={User}
                    type="text"
                    placeholder="Jane Doe"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    disabled={registerSubmitting}
                    required
                  />
                  {registerErrors.name && <span style={errorLabelStyle}>{registerErrors.name}</span>}
                </div>
                <div className="form-group">
                  <AuthInput
                    label="Contact Phone"
                    icon={Phone}
                    type="tel"
                    placeholder="9876543210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    disabled={registerSubmitting}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Email Address *"
                    icon={Mail}
                    type="email"
                    placeholder="jane.doe@clinic.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={registerSubmitting}
                    required
                  />
                  {registerErrors.email && <span style={errorLabelStyle}>{registerErrors.email}</span>}
                </div>
                <div className="form-group">
                  <AuthInput
                    label="Access Password *"
                    icon={Lock}
                    type="password"
                    placeholder="••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    disabled={registerSubmitting}
                    required
                  />
                  {registerErrors.password && <span style={errorLabelStyle}>{registerErrors.password}</span>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <AuthInput
                  label="Specialization / Pref Ward"
                  icon={Clock}
                  type="text"
                  placeholder="Pediatrics ICU"
                  value={regSpecialization}
                  onChange={(e) => setRegSpecialization(e.target.value)}
                  disabled={registerSubmitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRegisterModal(false)}
                  style={{ flex: 1 }}
                  disabled={registerSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={registerSubmitting} loadingText="Registering...">
                  Create Account
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
const subTabStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '0.75rem 1.25rem',
  cursor: 'pointer',
  fontSize: '0.95rem',
  transition: 'var(--transition-smooth)'
};

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

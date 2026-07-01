import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, User, Phone, X, ChevronLeft, ChevronRight, CheckCircle, Ban, HelpCircle, Calendar, CreditCard, Clipboard } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { validateReceptionLog } from './receptionValidation';

interface ReceptionLog {
  id: string;
  clinic_id: string;
  visitor_name: string;
  purpose: 'appointment' | 'billing_payment' | 'report_collection' | 'inquiry';
  phone: string | null;
  check_in_time: string;
  check_out_time: string | null;
  status: 'waiting' | 'served' | 'cancelled';
  notes: string | null;
  created_at: string;
}

export const ReceptionPanel: React.FC = () => {
  const { profile } = useAuth();

  const [logs, setLogs] = useState<ReceptionLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Add visitor modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [purpose, setPurpose] = useState<'appointment' | 'billing_payment' | 'report_collection' | 'inquiry'>('appointment');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;

      let dbQuery = supabase
        .from('reception_logs')
        .select('*', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      if (purposeFilter !== 'All') {
        dbQuery = dbQuery.eq('purpose', purposeFilter);
      }

      if (statusFilter !== 'All') {
        dbQuery = dbQuery.eq('status', statusFilter);
      }

      const { data, error, count } = await dbQuery
        .order('check_in_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      setLogs((data || []) as ReceptionLog[]);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching reception logs:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id, currentPage, purposeFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setErrorMsg('');
    setSuccessMsg('');

    const validation = validateReceptionLog({
      visitorName,
      purpose,
      phone
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reception_logs')
        .insert({
          clinic_id: profile!.clinic_id!,
          visitor_name: visitorName.trim(),
          purpose,
          phone: phone.trim() || null,
          status: 'waiting',
          notes: notes.trim() || null
        });

      if (error) throw error;

      setSuccessMsg('Visitor check-in logged successfully!');
      setVisitorName('');
      setPhone('');
      setNotes('');
      setPurpose('appointment');

      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMsg('');
        fetchLogs();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save log.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'served' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('reception_logs')
        .update({
          status: newStatus,
          check_out_time: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Local filter for search query
  const filteredLogs = logs.filter(log => {
    const nameMatch = log.visitor_name.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = log.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    return nameMatch || phoneMatch;
  });

  const getPurposeIcon = (p: string) => {
    switch (p) {
      case 'appointment': return <Calendar size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />;
      case 'billing_payment': return <CreditCard size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />;
      case 'report_collection': return <Clipboard size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />;
      default: return <HelpCircle size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />;
    }
  };

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* Toolbar filters */}
      <div style={toolbarStyle}>
        <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap', maxWidth: '800px' }}>
          <div style={searchContainerStyle}>
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search visitor name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>

          <div style={filterContainerStyle}>
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">All Purposes</option>
              <option value="appointment">Appointment</option>
              <option value="billing_payment">Billing/Payment</option>
              <option value="report_collection">Report Collection</option>
              <option value="inquiry">Inquiry</option>
            </select>
          </div>

          <div style={filterContainerStyle}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="All">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="served">Served</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {profile?.role === 'admin' || profile?.role === 'staff' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <Plus size={18} /> New Check-In
          </button>
        ) : null}
      </div>

      {/* Visitor queue table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading reception records...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No walk-in logs found.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>Visitor Name</th>
                  <th style={thStyle}>Purpose</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Check-In Time</th>
                  <th style={thStyle}>Check-Out Time</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Notes</th>
                  {(profile?.role === 'admin' || profile?.role === 'staff') && <th style={thStyle}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={tableRowStyle}>
                    <td style={tdStyle}>
                      <strong>{log.visitor_name}</strong>
                    </td>
                    <td style={{ ...tdStyle, textTransform: 'capitalize' }}>
                      {getPurposeIcon(log.purpose)}
                      {log.purpose.replace('_', ' ')}
                    </td>
                    <td style={tdStyle}>{log.phone || '-'}</td>
                    <td style={tdStyle}>
                      {new Date(log.check_in_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={tdStyle}>
                      {log.check_out_time
                        ? new Date(log.check_out_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: log.status === 'waiting' ? '#fee2e2' : log.status === 'served' ? '#ecfdf5' : '#f3f4f6',
                        color: log.status === 'waiting' ? '#991b1b' : log.status === 'served' ? '#065f46' : '#374151'
                      }}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes || ''}>
                      {log.notes || '-'}
                    </td>
                    {(profile?.role === 'admin' || profile?.role === 'staff') && (
                      <td style={tdStyle}>
                        {log.status === 'waiting' && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleUpdateStatus(log.id, 'served')}
                              style={{ padding: '0.2rem 0.4rem', borderColor: '#a7f3d0', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Mark Served"
                            >
                              <CheckCircle size={14} /> Serve
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleUpdateStatus(log.id, 'cancelled')}
                              style={{ padding: '0.2rem 0.4rem', borderColor: '#fca5a5', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Cancel Walk-In"
                            >
                              <Ban size={14} /> Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={paginationContainerStyle}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {Math.min((currentPage - 1) * limit + 1, totalCount)} to {Math.min(currentPage * limit, totalCount)} of {totalCount} check-ins
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

      {/* Add Check-In Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Log Walk-In Arrival</h2>
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

            <form onSubmit={handleRegisterVisitor} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <AuthInput
                  label="Visitor Full Name *"
                  icon={User}
                  type="text"
                  placeholder="John Doe"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  disabled={submitting}
                  required
                />
                {validationErrors.visitorName && <span style={errorLabelStyle}>{validationErrors.visitorName}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={labelStyle}>Purpose *</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as any)}
                    style={selectStyle}
                    disabled={submitting}
                  >
                    <option value="appointment">Appointment Booking</option>
                    <option value="billing_payment">Billing / Payment</option>
                    <option value="report_collection">Report Collection</option>
                    <option value="inquiry">General Inquiry</option>
                  </select>
                  {validationErrors.purpose && <span style={errorLabelStyle}>{validationErrors.purpose}</span>}
                </div>

                <div className="form-group">
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
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Notes / Description</label>
                <textarea
                  placeholder="Visitor details, queries, symptoms, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                <AuthButton type="submit" loading={submitting} loadingText="Logging...">
                  Check In Visitor
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
  minWidth: '160px'
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

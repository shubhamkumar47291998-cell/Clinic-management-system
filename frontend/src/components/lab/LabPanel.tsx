import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Trash2, Edit, X, Clipboard, Activity, FileDown, CheckCircle2, ChevronLeft, ChevronRight, Upload, DollarSign } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { validateLabTest, validateLabRequest } from './labValidation';

interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
}

interface LabRequest {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  test_id: string;
  status: 'pending' | 'sample_collected' | 'completed' | 'cancelled';
  result_notes: string | null;
  attachment_path: string | null;
  created_at: string;
  patients: { name: string; phone: string } | null;
  profiles: { name: string } | null;
  lab_tests: { name: string; code: string; price: number } | null;
}

export const LabPanel: React.FC = () => {
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'requests'>('requests');
  
  // Catalog tab states
  const [catalog, setCatalog] = useState<LabTest[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const limit = 10;
  
  // Requests tab states
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestFilter, setRequestFilter] = useState<string>('All');
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsTotal, setRequestsTotal] = useState(0);
  
  // Modal states for LabTest Catalog CRUD
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [testName, setTestName] = useState('');
  const [testCode, setTestCode] = useState('');
  const [testPrice, setTestPrice] = useState('0');
  const [catalogSubmitting, setCatalogSubmitting] = useState(false);
  const [catalogErrors, setCatalogErrors] = useState<Record<string, string>>({});
  const [catalogErrorMsg, setCatalogErrorMsg] = useState('');
  
  // Modal states for Test Request creation
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqPatientId, setReqPatientId] = useState('');
  const [reqDoctorId, setReqDoctorId] = useState('');
  const [reqTestId, setReqTestId] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [requestErrorMsg, setRequestErrorMsg] = useState('');
  
  // Modal states for completing a request
  const [completingRequest, setCompletingRequest] = useState<LabRequest | null>(null);
  const [resultNotes, setResultNotes] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedPath, setUploadedPath] = useState('');
  const [uploadedName, setUploadedName] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [completeErrorMsg, setCompleteErrorMsg] = useState('');
  
  // Lists for Request Creation
  const [patientsList, setPatientsList] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [doctorsList, setDoctorsList] = useState<{ id: string; name: string }[]>([]);

  // Fetch test catalog
  const fetchCatalog = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setCatalogLoading(true);
    try {
      const offset = (catalogPage - 1) * limit;
      let dbQuery = supabase
        .from('lab_tests')
        .select('*', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      if (catalogSearch.trim()) {
        dbQuery = dbQuery.or(`name.ilike.%${catalogSearch}%,code.ilike.%${catalogSearch}%`);
      }

      const { data, error, count } = await dbQuery
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      setCatalog(data || []);
      setCatalogTotal(count || 0);
    } catch (err) {
      console.error('Error fetching lab test catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  }, [profile?.clinic_id, catalogPage, catalogSearch]);

  // Fetch patient requests queue
  const fetchRequests = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setRequestsLoading(true);
    try {
      const offset = (requestsPage - 1) * limit;
      let dbQuery = supabase
        .from('lab_requests')
        .select(`
          *,
          patients (name, phone),
          profiles (name),
          lab_tests (name, code, price)
        `, { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      if (requestFilter !== 'All') {
        dbQuery = dbQuery.eq('status', requestFilter);
      }

      const { data, error, count } = await dbQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      setRequests((data || []) as any[]);
      setRequestsTotal(count || 0);
    } catch (err) {
      console.error('Error fetching lab requests queue:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, [profile?.clinic_id, requestsPage, requestFilter]);

  const fetchDropdowns = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data: patients } = await supabase
        .from('patients')
        .select('id, name, phone')
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true });
      setPatientsList(patients || []);

      const { data: doctors } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setDoctorsList(doctors || []);
    } catch (err) {
      console.error('Error fetching request form dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalog();
    }
  }, [activeTab, fetchCatalog]);

  const handleOpenAddCatalog = () => {
    setSelectedTest(null);
    setTestName('');
    setTestCode('');
    setTestPrice('0');
    setCatalogErrors({});
    setCatalogErrorMsg('');
    setShowCatalogModal(true);
  };

  const handleOpenEditCatalog = (test: LabTest) => {
    setSelectedTest(test);
    setTestName(test.name);
    setTestCode(test.code);
    setTestPrice(test.price.toString());
    setCatalogErrors({});
    setCatalogErrorMsg('');
    setShowCatalogModal(true);
  };

  const handleSaveCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogErrors({});
    setCatalogErrorMsg('');

    const priceVal = parseFloat(testPrice) || 0;
    const validation = validateLabTest({
      name: testName,
      code: testCode,
      price: priceVal
    });

    if (!validation.isValid) {
      setCatalogErrors(validation.errors);
      return;
    }

    setCatalogSubmitting(true);
    try {
      const payload = {
        clinic_id: profile?.clinic_id,
        name: testName.trim(),
        code: testCode.trim().toUpperCase(),
        price: priceVal
      };

      if (selectedTest) {
        const { error } = await supabase
          .from('lab_tests')
          .update(payload)
          .eq('id', selectedTest.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lab_tests')
          .insert(payload);
        if (error) throw error;
      }

      setShowCatalogModal(false);
      fetchCatalog();
    } catch (err: any) {
      setCatalogErrorMsg(err.message || 'Failed to save test catalog item.');
    } finally {
      setCatalogSubmitting(false);
    }
  };

  const handleDeleteCatalog = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" test definition?`)) return;
    try {
      const { error } = await supabase
        .from('lab_tests')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to delete test definition. Test may have active request files.');
    }
  };

  // Test Requests creation
  const handleOpenRequestModal = () => {
    setReqPatientId('');
    setReqDoctorId('');
    setReqTestId('');
    setRequestErrors({});
    setRequestErrorMsg('');
    fetchDropdowns();
    // Pre-fetch catalog item definitions
    fetchCatalog();
    setShowRequestModal(true);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestErrors({});
    setRequestErrorMsg('');

    const validation = validateLabRequest({
      patientId: reqPatientId,
      testId: reqTestId
    });

    if (!validation.isValid) {
      setRequestErrors(validation.errors);
      return;
    }

    setRequestSubmitting(true);
    try {
      const { error } = await supabase
        .from('lab_requests')
        .insert({
          clinic_id: profile?.clinic_id,
          patient_id: reqPatientId,
          doctor_id: reqDoctorId || null,
          test_id: reqTestId,
          status: 'pending'
        });

      if (error) throw error;
      setShowRequestModal(false);
      fetchRequests();
    } catch (err: any) {
      setRequestErrorMsg(err.message || 'Failed to file lab test request.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'sample_collected' | 'cancelled') => {
    const confirmation = newStatus === 'cancelled' ? 'Cancel request file?' : 'Mark sample as collected?';
    if (!window.confirm(confirmation)) return;

    try {
      const { error } = await supabase
        .from('lab_requests')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to update test status.');
    }
  };

  // File uploading and completion
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !completingRequest) return;
    const file = e.target.files[0];
    setUploadingFile(true);

    try {
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').split('_' + fileExt)[0];
      const filePath = `${profile?.clinic_id}/${completingRequest.patient_id}/lab_${Date.now()}_${sanitizedName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadedPath(filePath);
      setUploadedName(file.name);
    } catch (err: any) {
      alert(err.message || 'Failed to upload report file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCompleteRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRequest) return;

    setCompleteSubmitting(true);
    setCompleteErrorMsg('');

    try {
      const { error } = await supabase
        .from('lab_requests')
        .update({
          status: 'completed',
          result_notes: resultNotes.trim() || null,
          attachment_path: uploadedPath || null
        })
        .eq('id', completingRequest.id);

      if (error) throw error;

      setCompletingRequest(null);
      setResultNotes('');
      setUploadedPath('');
      setUploadedName('');
      fetchRequests();
    } catch (err: any) {
      setCompleteErrorMsg(err.message || 'Failed to complete test request.');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleDownloadReport = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, 60);
      if (error) throw error;
      if (data) window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Failed to generate download report link.');
    }
  };

  const catalogTotalPages = Math.ceil(catalogTotal / limit) || 1;
  const requestsTotalPages = Math.ceil(requestsTotal / limit) || 1;

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* Navigation tabs */}
      <div className="tab-container" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Activity size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Lab Queue Requests
        </button>
        <button
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Clipboard size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Test Catalog Directory
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <>
          {/* Test catalog actions */}
          <div style={toolbarStyle}>
            <div style={searchContainerStyle}>
              <Search size={18} style={searchIconStyle} />
              <input
                type="text"
                placeholder="Search catalog by test name or code..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={searchInputStyle}
              />
            </div>
            {profile?.role && ['admin', 'staff'].includes(profile.role) && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAddCatalog}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              >
                <Plus size={18} /> Add Catalog Test
              </button>
            )}
          </div>

          {/* Catalog directory table */}
          {catalogLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading test definitions...</div>
          ) : catalog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No tests cataloged under this clinic.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Test Name</th>
                      <th style={thStyle}>Lab Reference Code</th>
                      <th style={thStyle}>Charge Price</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((t) => (
                      <tr key={t.id} style={tableRowStyle}>
                        <td style={tdStyle}><strong>{t.name}</strong></td>
                        <td style={tdStyle}>{t.code}</td>
                        <td style={tdStyle}>₹{t.price}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleOpenEditCatalog(t)}
                              style={{ padding: '0.25rem 0.5rem' }}
                            >
                              <Edit size={14} />
                            </button>
                            {profile?.role === 'admin' && (
                              <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => handleDeleteCatalog(t.id, t.name)}
                                style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ef4444', border: 'none', color: '#fff' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={paginationContainerStyle}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {Math.min((catalogPage - 1) * limit + 1, catalogTotal)} to {Math.min(catalogPage * limit, catalogTotal)} of {catalogTotal} tests
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={catalogPage === 1}
                    onClick={() => setCatalogPage(prev => Math.max(prev - 1, 1))}
                    style={paginationBtnStyle}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
                    Page {catalogPage} of {catalogTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={catalogPage === catalogTotalPages}
                    onClick={() => setCatalogPage(prev => Math.min(prev + 1, catalogTotalPages))}
                    style={paginationBtnStyle}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Requests Queue Tab */}
          <div style={toolbarStyle}>
            <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap', maxWidth: '800px' }}>
              <div style={searchContainerStyle}>
                <Search size={18} style={searchIconStyle} />
                <input
                  type="text"
                  placeholder="Search by patient name..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  style={searchInputStyle}
                />
              </div>

              <div style={filterContainerStyle}>
                <select
                  value={requestFilter}
                  onChange={(e) => setRequestFilter(e.target.value)}
                  style={filterSelectStyle}
                >
                  <option value="All">All Queue Requests</option>
                  <option value="pending">Pending Sample</option>
                  <option value="sample_collected">Sample Collected</option>
                  <option value="completed">Completed Tests</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {profile?.role && ['admin', 'staff', 'doctor'].includes(profile.role) && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenRequestModal}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              >
                <Plus size={18} /> Request Lab Test
              </button>
            )}
          </div>

          {/* Requests list queue table */}
          {requestsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading laboratory queue...</div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No laboratory queue requests found.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Date Requested</th>
                      <th style={thStyle}>Patient Name</th>
                      <th style={thStyle}>Doctor In-Charge</th>
                      <th style={thStyle}>Test Required</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Result Snippet</th>
                      <th style={thStyle}>Report Document</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests
                      .filter(r => r.patients?.name.toLowerCase().includes(requestSearch.toLowerCase()))
                      .map((r) => (
                        <tr key={r.id} style={tableRowStyle}>
                          <td style={tdStyle}>{new Date(r.created_at).toLocaleDateString()}</td>
                          <td style={tdStyle}><strong>{r.patients?.name}</strong></td>
                          <td style={tdStyle}>Dr. {r.profiles?.name || 'Self/Walk-in'}</td>
                          <td style={tdStyle}>{r.lab_tests?.name} ({r.lab_tests?.code})</td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '50px', backgroundColor: r.status === 'completed' ? '#ecfdf5' : r.status === 'pending' ? '#fef3c7' : r.status === 'sample_collected' ? '#e0f2fe' : '#fee2e2', color: r.status === 'completed' ? '#065f46' : r.status === 'pending' ? '#d97706' : r.status === 'sample_collected' ? '#0369a1' : '#b91c1c', fontWeight: 600 }}>
                              {r.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td style={tdStyle}>{r.result_notes || '-'}</td>
                          <td style={tdStyle}>
                            {r.attachment_path ? (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleDownloadReport(r.attachment_path!)}
                                style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                              >
                                <FileDown size={12} /> View Report
                              </button>
                            ) : '-'}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {r.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => handleUpdateStatus(r.id, 'sample_collected')}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    Collect Sample
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444' }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {r.status === 'sample_collected' && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => {
                                    setCompletingRequest(r);
                                    setResultNotes('');
                                    setUploadedPath('');
                                    setUploadedName('');
                                    setShowRequestModal(false);
                                  }}
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <CheckCircle2 size={12} /> Add Results
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={paginationContainerStyle}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {Math.min((requestsPage - 1) * limit + 1, requestsTotal)} to {Math.min(requestsPage * limit, requestsTotal)} of {requestsTotal} requests
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={requestsPage === 1}
                    onClick={() => setRequestsPage(prev => Math.max(prev - 1, 1))}
                    style={paginationBtnStyle}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
                    Page {requestsPage} of {requestsTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={requestsPage === requestsTotalPages}
                    onClick={() => setRequestsPage(prev => Math.min(prev + 1, requestsTotalPages))}
                    style={paginationBtnStyle}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Lab Test Catalog CRUD Modal */}
      {showCatalogModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>{selectedTest ? 'Edit Lab Test Item' : 'Add Test definition'}</h2>
              <button onClick={() => setShowCatalogModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {catalogErrorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{catalogErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCatalog} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <AuthInput
                  label="Test Name *"
                  icon={Clipboard}
                  type="text"
                  placeholder="Complete Blood Count (CBC)"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  disabled={catalogSubmitting}
                  required
                />
                {catalogErrors.name && <span style={errorLabelStyle}>{catalogErrors.name}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <AuthInput
                  label="Reference Code (Alphanumeric) *"
                  icon={Activity}
                  type="text"
                  placeholder="CBC-001"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  disabled={catalogSubmitting}
                  required
                />
                {catalogErrors.code && <span style={errorLabelStyle}>{catalogErrors.code}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <AuthInput
                  label="Rate Price (₹) *"
                  icon={DollarSign}
                  type="number"
                  placeholder="350"
                  value={testPrice}
                  onChange={(e) => setTestPrice(e.target.value)}
                  disabled={catalogSubmitting}
                  required
                />
                {catalogErrors.price && <span style={errorLabelStyle}>{catalogErrors.price}</span>}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCatalogModal(false)}
                  style={{ flex: 1 }}
                  disabled={catalogSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={catalogSubmitting} loadingText="Saving...">
                  Save definition
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lab Request Creation Modal */}
      {showRequestModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Request Patient Lab Test</h2>
              <button onClick={() => setShowRequestModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {requestErrorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{requestErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Select Patient *</label>
                <select
                  value={reqPatientId}
                  onChange={(e) => setReqPatientId(e.target.value)}
                  style={selectStyle}
                  disabled={requestSubmitting}
                >
                  <option value="">-- Choose Patient --</option>
                  {patientsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
                {requestErrors.patientId && <span style={errorLabelStyle}>{requestErrors.patientId}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Prescribed by Doctor</label>
                <select
                  value={reqDoctorId}
                  onChange={(e) => setReqDoctorId(e.target.value)}
                  style={selectStyle}
                  disabled={requestSubmitting}
                >
                  <option value="">-- Self / Walk-in order --</option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Select Test required *</label>
                <select
                  value={reqTestId}
                  onChange={(e) => setReqTestId(e.target.value)}
                  style={selectStyle}
                  disabled={requestSubmitting}
                >
                  <option value="">-- Choose Test definition --</option>
                  {catalog.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code}) - ₹{t.price}</option>
                  ))}
                </select>
                {requestErrors.testId && <span style={errorLabelStyle}>{requestErrors.testId}</span>}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                  style={{ flex: 1 }}
                  disabled={requestSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={requestSubmitting} loadingText="Filing...">
                  File test request
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Test Results Modal */}
      {completingRequest && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Enter Lab Results ({completingRequest.lab_tests?.name})</h2>
              <button onClick={() => setCompletingRequest(null)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {completeErrorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{completeErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCompleteRequestSubmit} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Result Findings / Notes</label>
                <textarea
                  placeholder="Enter normal range levels, clinical values, findings..."
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  style={textareaStyle}
                  rows={4}
                  disabled={completeSubmitting}
                />
              </div>

              {/* PDF report file uploader */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Scanned Report File (PDF/Image)</label>
                <div style={uploaderBoxStyle}>
                  <label style={uploadLabelStyle}>
                    <Upload size={18} />
                    <span>{uploadingFile ? 'Uploading file...' : 'Choose PDF/Image'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      disabled={uploadingFile || completeSubmitting}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {uploadedName && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem', fontSize: '0.85rem', justifyContent: 'center' }}>
                      <CheckCircle2 size={14} style={{ color: '#059669' }} />
                      <span>{uploadedName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCompletingRequest(null)}
                  style={{ flex: 1 }}
                  disabled={completeSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={completeSubmitting} loadingText="Completing..." disabled={uploadingFile}>
                  Submit Report
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



const uploaderBoxStyle: React.CSSProperties = {
  border: '1px dashed var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '1rem',
  textAlign: 'center',
  backgroundColor: 'var(--bg-primary)'
};

const uploadLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  cursor: 'pointer',
  color: 'var(--accent-primary)',
  fontSize: '0.9rem',
  fontWeight: 500
};

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { SkipForward, CheckSquare, Plus, RefreshCw, Volume2, UserCheck, QrCode, X, Scan } from 'lucide-react';
import { AuthButton } from '../auth/AuthButton';

interface QueueItem {
  id: string;
  token_number: number;
  status: 'waiting' | 'called' | 'skipped' | 'completed';
  is_priority: boolean;
  estimated_wait_minutes: number;
  doctor_id: string;
  patient_id: string;
  patients: { name: string; phone: string } | null;
  profiles: { name: string } | null;
}

export const QueueManager: React.FC = () => {
  const { profile } = useAuth();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // New token fields
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // QR check-in scanner states
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const handleQRCheckIn = async (patientId: string, patientName: string) => {
    if (!profile?.clinic_id) return;
    
    // Select first doctor or chosen doctor
    const assignedDocId = selectedDoctorId || doctors[0]?.id;
    if (!assignedDocId) {
      setErrorMsg('Please select or configure at least one active doctor.');
      setShowQRScanner(false);
      return;
    }

    setSubmitting(true);
    setScanMessage(`Scanning QR for ${patientName}...`);

    try {
      // Get the next serial token number for today for the doctor
      const { data: lastTokenData } = await supabase
        .from('waiting_queue')
        .select('token_number')
        .eq('clinic_id', profile.clinic_id)
        .eq('doctor_id', assignedDocId)
        .order('token_number', { ascending: false })
        .limit(1);

      const nextToken = lastTokenData && lastTokenData.length > 0
        ? lastTokenData[0].token_number + 1
        : 1;

      // Base estimated wait time
      const waitTime = isPriority ? 5 : (nextToken * 15);

      const { error: queueErr } = await supabase
        .from('waiting_queue')
        .insert({
          clinic_id: profile.clinic_id,
          doctor_id: assignedDocId,
          patient_id: patientId,
          token_number: nextToken,
          status: 'waiting',
          is_priority: isPriority,
          estimated_wait_minutes: waitTime
        });

      if (queueErr) throw queueErr;

      // Log notification
      await supabase.from('notifications').insert({
        clinic_id: profile.clinic_id,
        patient_id: patientId,
        type: 'Queue Token Assigned',
        channel: 'WhatsApp',
        status: 'sent',
        content: `Hi ${patientName}! Your QR check-in was successful. You have been assigned Token #${nextToken} for Dr. ${doctors.find(d=>d.id===assignedDocId)?.name || 'Natekar'}. ETA: ${waitTime} mins.`
      });

      setScanMessage(`✓ Scanned Check-In Successful! Token #${nextToken}`);
      setTimeout(() => {
        setShowQRScanner(false);
        setScanMessage('');
        fetchQueueData();
      }, 1500);

    } catch (err: any) {
      alert(err.message || 'Failed to check in via QR Code scan.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchQueueData = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      // 1. Fetch live queue items
      const { data: queueData } = await supabase
        .from('waiting_queue')
        .select(`
          id,
          token_number,
          status,
          is_priority,
          estimated_wait_minutes,
          doctor_id,
          patient_id,
          patients(name, phone),
          profiles:doctor_id(name)
        `)
        .eq('clinic_id', profile.clinic_id)
        .in('status', ['waiting', 'called', 'skipped'])
        .order('is_priority', { ascending: false })
        .order('token_number', { ascending: true });

      setQueue((queueData || []) as any[]);

      // 2. Fetch patients list
      const { data: patientData } = await supabase
        .from('patients')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true });
      setPatients(patientData || []);

      // 3. Fetch doctors list
      const { data: doctorData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setDoctors(doctorData || []);

    } catch (err) {
      console.error('Error fetching queue details:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  const handleAddPatientToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId) {
      setErrorMsg('Please select both a patient and a doctor.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data: lastTokenData } = await supabase
        .from('waiting_queue')
        .select('token_number')
        .eq('clinic_id', profile?.clinic_id)
        .eq('doctor_id', selectedDoctorId)
        .order('token_number', { ascending: false })
        .limit(1);

      const nextToken = lastTokenData && lastTokenData.length > 0
        ? lastTokenData[0].token_number + 1
        : 1;

      // Base estimated wait time
      const estWait = isPriority ? 5 : (nextToken * 15);

      const { error } = await supabase.from('waiting_queue').insert({
        clinic_id: profile?.clinic_id,
        patient_id: selectedPatientId,
        doctor_id: selectedDoctorId,
        token_number: nextToken,
        is_priority: isPriority,
        estimated_wait_minutes: estWait,
        status: 'waiting'
      });

      if (error) throw error;

      // Log notification simulated WhatsApp trigger
      const patient = patients.find(p => p.id === selectedPatientId);
      await supabase.from('notifications').insert({
        clinic_id: profile?.clinic_id,
        patient_id: selectedPatientId,
        type: 'Queue Token Assigned',
        channel: 'WhatsApp',
        status: 'sent',
        content: `Hi ${patient?.name || 'Patient'}! Your lobby waiting queue token has been assigned: Token #${nextToken}. Est. Wait: ~${estWait} mins.`
      });

      setSelectedPatientId('');
      setSelectedDoctorId('');
      setIsPriority(false);
      fetchQueueData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add patient to queue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (itemId: string, newStatus: QueueItem['status']) => {
    try {
      const { error } = await supabase
        .from('waiting_queue')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) throw error;

      // If called, simulate WhatsApp paging alert
      if (newStatus === 'called') {
        const item = queue.find(q => q.id === itemId);
        if (item) {
          await supabase.from('notifications').insert({
            clinic_id: profile?.clinic_id,
            patient_id: item.patient_id,
            type: 'Queue Call Alert',
            channel: 'WhatsApp',
            status: 'sent',
            content: `Hi ${item.patients?.name || 'Patient'}! Token #${item.token_number} has been called. Please proceed to consulting room.`
          });
        }
      }

      fetchQueueData();
    } catch (err) {
      console.error('Failed to update waitlist item status:', err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
      
      {/* Waitlist Table Column */}
      <div className="dashboard-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0 }}>Lobby Waitlist Registry</h3>
          <button onClick={fetchQueueData} className="btn btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Updating token waitlist...</div>
        ) : queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <UserCheck size={36} style={{ margin: '0 auto 1rem', display: 'block' }} />
            <p>No patients currently waiting in lobby queue.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={thStyle}>Token #</th>
                  <th style={thStyle}>Patient Name</th>
                  <th style={thStyle}>Consulting Doctor</th>
                  <th style={thStyle}>Est. Wait</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action Panel</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={tdStyle}>
                      <span style={tokenBadgeStyle(item.is_priority)}>
                        #{item.token_number}
                      </span>
                    </td>
                    <td style={tdStyle}><strong>{item.patients?.name || 'Walk-in'}</strong></td>
                    <td style={tdStyle}>Dr. {item.profiles?.name || 'Practitioner'}</td>
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {item.status === 'called' ? 'Now Called' : `~${item.estimated_wait_minutes}m`}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {item.is_priority ? (
                        <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8rem', backgroundColor: '#fee2e2', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                          PRIORITY
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Normal</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: item.status === 'called' ? '#dcfce7' : item.status === 'skipped' ? '#fee2e2' : '#f1f5f9',
                        color: item.status === 'called' ? '#15803d' : item.status === 'skipped' ? '#b91c1c' : '#475569'
                      }}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {item.status !== 'called' && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleAction(item.id, 'called')}
                            style={actionBtnStyle}
                            title="Call Next Patient"
                          >
                            <Volume2 size={14} /> Call
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleAction(item.id, 'skipped')}
                          style={actionBtnStyle}
                          title="Skip Patient"
                        >
                          <SkipForward size={14} /> Skip
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleAction(item.id, 'completed')}
                          style={{ ...actionBtnStyle, backgroundColor: '#dcfce7', color: '#15803d' }}
                          title="Mark Complete"
                        >
                          <CheckSquare size={14} /> Serve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add to Queue Sidebar Column */}
      <div className="dashboard-card" style={{ padding: '1.5rem', alignSelf: 'start' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1.1rem' }}>
          <Plus size={18} /> Queue Check-In
        </h3>

        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddPatientToQueue} className="auth-form" noValidate>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem' }}>
              Select Patient File
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              style={selectStyle}
              disabled={submitting}
            >
              <option value="">Choose Patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem' }}>
              Assigned Doctor
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              style={selectStyle}
              disabled={submitting}
            >
              <option value="">Choose Doctor...</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="isPriority"
              checked={isPriority}
              onChange={(e) => setIsPriority(e.target.checked)}
              disabled={submitting}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="isPriority" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}>
              ⚠️ Emergency Triage Priority
            </label>
          </div>

          <AuthButton type="submit" loading={submitting} loadingText="Adding...">
            Issue Token
          </AuthButton>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowQRScanner(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            <QrCode size={18} /> QR check-in scanner
          </button>
        </div>
      </div>

      {/* Simulated QR check-in Modal */}
      {showQRScanner && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scan size={20} className="accent-color" />
                <h2 style={{ fontSize: '1.25rem' }}>QR Triage check-in terminal</h2>
              </div>
              <button onClick={() => setShowQRScanner(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {scanMessage ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <QrCode size={48} style={{ color: 'var(--accent-primary)', animation: 'pulse 1s infinite' }} />
                </div>
                <h4 style={{ fontWeight: 600 }}>{scanMessage}</h4>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                  Aura reception scanner terminal online. Tap a patient record below to simulate scanning their Patient Portal profile QR code:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {patients.map((pat) => (
                    <div 
                      key={pat.id}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.75rem 1rem', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-primary)'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.9rem', display: 'block' }}>{pat.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {pat.id.substring(0,8).toUpperCase()}</span>
                      </div>
                      <button
                        onClick={() => handleQRCheckIn(pat.id, pat.name)}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Scan QR
                      </button>
                    </div>
                  ))}
                  {patients.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No patients registered to scan.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// Modal Overlay Styles
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

// Styles
const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--text-muted)'
};

const tdStyle: React.CSSProperties = {
  padding: '0.875rem 0.5rem',
  fontSize: '0.9rem',
  color: 'var(--text-secondary)'
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
};

const tokenBadgeStyle = (isPriority: boolean): React.CSSProperties => ({
  backgroundColor: isPriority ? '#fee2e2' : '#e0e7ff',
  color: isPriority ? '#b91c1c' : '#4338ca',
  fontWeight: 800,
  padding: '0.35rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.9rem',
  display: 'inline-block'
});

const actionBtnStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem',
  fontSize: '0.8rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem'
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.85rem'
};

import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Database, Download, Upload, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { AuthButton } from '../auth/AuthButton';

export const BackupManager: React.FC = () => {
  const { profile } = useAuth();
  
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleExportBackup = async () => {
    if (!profile?.clinic_id) return;
    setBackupLoading(true);
    setStatusMsg('Compiling system backup data...');
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const clinicId = profile.clinic_id;

      // Fetch all tables concurrently
      const [
        { data: patients },
        { data: appointments },
        { data: invoices },
        { data: prescriptions },
        { data: notifications },
        { data: reviews },
        { data: queue },
        { data: ambulance }
      ] = await Promise.all([
        supabase.from('patients').select('*').eq('clinic_id', clinicId),
        supabase.from('appointments').select('*').eq('clinic_id', clinicId),
        supabase.from('invoices').select('*').eq('clinic_id', clinicId),
        supabase.from('prescriptions').select('*').eq('clinic_id', clinicId),
        supabase.from('notifications').select('*').eq('clinic_id', clinicId),
        supabase.from('reviews').select('*').eq('clinic_id', clinicId),
        supabase.from('waiting_queue').select('*').eq('clinic_id', clinicId),
        supabase.from('ambulance_requests').select('*').eq('clinic_id', clinicId)
      ]);

      const backupPayload = {
        clinic_id: clinicId,
        export_date: new Date().toISOString(),
        patients: patients || [],
        appointments: appointments || [],
        invoices: invoices || [],
        prescriptions: prescriptions || [],
        notifications: notifications || [],
        reviews: reviews || [],
        waiting_queue: queue || [],
        ambulance_requests: ambulance || []
      };

      // Create download anchor
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `aura_hms_backup_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('Database backup downloaded successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate database backup.');
    } finally {
      setBackupLoading(false);
      setStatusMsg('');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !profile?.clinic_id) return;
    
    const file = fileList[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      setErrorMsg('');
      setSuccessMsg('');
      setRestoreLoading(true);

      try {
        const payload = JSON.parse(event.target?.result as string);
        
        if (!payload.clinic_id || !payload.patients) {
          throw new Error('Invalid backup file format. Missing core datasets.');
        }

        if (payload.clinic_id !== profile.clinic_id) {
          if (!window.confirm('Warning: This backup was exported from a different clinic branch. Are you sure you want to restore it here?')) {
            setRestoreLoading(false);
            return;
          }
        } else {
          if (!window.confirm('WARNING: Restoring this backup will overwrite current clinical records. Proceed?')) {
            setRestoreLoading(false);
            return;
          }
        }

        const clinicId = profile.clinic_id;

        // 1. Clean existing records in correct order to avoid foreign key violations
        setStatusMsg('Clearing old transaction records...');
        await Promise.all([
          supabase.from('notifications').delete().eq('clinic_id', clinicId),
          supabase.from('reviews').delete().eq('clinic_id', clinicId),
          supabase.from('waiting_queue').delete().eq('clinic_id', clinicId),
          supabase.from('ambulance_requests').delete().eq('clinic_id', clinicId),
          supabase.from('prescriptions').delete().eq('clinic_id', clinicId),
          supabase.from('invoices').delete().eq('clinic_id', clinicId),
          supabase.from('payments').delete().eq('clinic_id', clinicId)
        ]);

        // Clear appointments before patients
        await supabase.from('appointments').delete().eq('clinic_id', clinicId);
        await supabase.from('patients').delete().eq('clinic_id', clinicId);

        // 2. Restore patients
        setStatusMsg('Restoring patient directories...');
        if (payload.patients.length > 0) {
          const { error: patErr } = await supabase.from('patients').insert(payload.patients);
          if (patErr) throw patErr;
        }

        // 3. Restore appointments
        setStatusMsg('Restoring scheduled consultations...');
        if (payload.appointments.length > 0) {
          const { error: apptErr } = await supabase.from('appointments').insert(payload.appointments);
          if (apptErr) throw apptErr;
        }

        // 4. Restore invoices
        setStatusMsg('Restoring invoices & billing metadata...');
        if (payload.invoices.length > 0) {
          const { error: invErr } = await supabase.from('invoices').insert(payload.invoices);
          if (invErr) throw invErr;
        }

        // 5. Restore prescriptions
        setStatusMsg('Restoring clinical prescriptions...');
        if (payload.prescriptions.length > 0) {
          const { error: rxErr } = await supabase.from('prescriptions').insert(payload.prescriptions);
          if (rxErr) throw rxErr;
        }

        // 6. Restore auxiliary tables (notifications, reviews, queue, ambulance)
        setStatusMsg('Restoring queues, feedback ratings, and alerts...');
        const inserts = [];
        if (payload.notifications?.length > 0) {
          inserts.push(supabase.from('notifications').insert(payload.notifications));
        }
        if (payload.reviews?.length > 0) {
          inserts.push(supabase.from('reviews').insert(payload.reviews));
        }
        if (payload.waiting_queue?.length > 0) {
          inserts.push(supabase.from('waiting_queue').insert(payload.waiting_queue));
        }
        if (payload.ambulance_requests?.length > 0) {
          inserts.push(supabase.from('ambulance_requests').insert(payload.ambulance_requests));
        }
        
        if (inserts.length > 0) {
          await Promise.all(inserts);
        }

        setSuccessMsg('Clinic database state successfully restored from backup.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to restore database state.');
      } finally {
        setRestoreLoading(false);
        setStatusMsg('');
        // Clear input file
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Backup & Recovery Services</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Securely export hospital directories, patient demographics, and transactional invoices to local cold storage.
        </p>
      </div>

      {statusMsg && (
        <div style={statusBannerStyle}>
          <RefreshCw size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger">
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Backup Panel */}
        <div className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-primary)', borderRadius: '8px' }}>
              <Database size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>JSON System Data Export</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generate cold file backups</p>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Export patient records, appointment schedules, active prescription orders, payments ledger logs, and custom feedback comments. Files compile into a standard machine-readable JSON structure.
          </p>
          <AuthButton onClick={handleExportBackup} loading={backupLoading} loadingText="Compiling...">
            <Download size={16} style={{ marginRight: '0.5rem' }} /> Download Backup Payload
          </AuthButton>
        </div>

        {/* Restore Panel */}
        <div className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', borderRadius: '8px' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>System Database Restore</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recover active datasets</p>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Upload a valid, pre-configured JSON backup file to overwrite existing records and sync with historical datasets. 
            <strong style={{ color: '#ef4444' }}> Warning: This replaces active database logs.</strong>
          </p>
          
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              disabled={restoreLoading}
              style={fileInputStyle}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={restoreLoading}
              style={fakeBtnStyle}
            >
              <Upload size={16} /> {restoreLoading ? 'Restoring Payload...' : 'Upload & Restore File'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Styles
const statusBannerStyle: React.CSSProperties = {
  backgroundColor: 'rgba(99, 102, 241, 0.08)',
  border: '1px solid var(--accent-primary)',
  color: 'var(--accent-primary)',
  padding: '1rem',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontSize: '0.9rem',
  fontWeight: 600
};

const fileInputStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  zIndex: 2
};

const fakeBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  fontWeight: 600
};

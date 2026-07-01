import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  patientId: string;
  onUploadSuccess: (filePath: string, fileName: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ patientId, onUploadSuccess }) => {
  const { profile } = useAuth();
  
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    const fileLimit = 50 * 1024 * 1024; // 50MB
    if (file.size > fileLimit) {
      setErrorMsg('File size exceeds the 50MB limit.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setFileName(file.name);

    try {
      const clinicId = profile?.clinic_id;
      if (!clinicId) {
        setErrorMsg('Clinic ID missing from profile.');
        setUploading(false);
        return;
      }

      // Secure path structure: clinic_id/patient_id/timestamp-filename
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').split('_' + fileExt)[0];
      const filePath = `${clinicId}/${patientId}/${Date.now()}_${sanitizedName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      setSuccessMsg('Uploaded successfully!');
      onUploadSuccess(filePath, file.name);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-uploader-box" style={uploaderBoxStyle}>
      <label style={uploadLabelStyle}>
        <Upload size={18} />
        <span>{uploading ? 'Uploading report...' : 'Upload Scanned Report/PDF'}</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>

      {fileName && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
          <FileText size={14} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ color: 'var(--alert-danger-text)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          <AlertCircle size={12} /> <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ color: 'var(--alert-success-text)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          <CheckCircle2 size={12} /> <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
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

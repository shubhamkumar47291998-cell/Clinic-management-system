import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { FileUploader } from './FileUploader';
import { X, Plus, Trash2, Save, FileText, CheckCircle2 } from 'lucide-react';

interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface AddMedicalRecordModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddMedicalRecordModal: React.FC<AddMedicalRecordModalProps> = ({
  patientId,
  patientName,
  onClose,
  onSuccess
}) => {
  const { profile } = useAuth();
  
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [attachments, setAttachments] = useState<{ path: string; name: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  
  // Custom Prescription row state
  const [medText, setMedText] = useState('');
  const [dosageText, setDosageText] = useState('');
  const [freqText, setFreqText] = useState('');
  const [durationText, setDurationText] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchClinicDoctors = async () => {
      if (!profile?.clinic_id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor');

      if (error) {
        console.error('Error fetching doctors:', error);
      } else if (data) {
        setDoctors(data);
        
        // If current user is a doctor, default to their ID
        if (profile.role === 'doctor') {
          setSelectedDoctorId(profile.id);
        } else if (data.length > 0) {
          setSelectedDoctorId(data[0].id);
        }
      }
    };

    fetchClinicDoctors();
  }, [profile]);

  const addPrescriptionItem = () => {
    if (!medText.trim()) return;
    
    setPrescriptions([
      ...prescriptions,
      {
        medication: medText,
        dosage: dosageText,
        frequency: freqText,
        duration: durationText
      }
    ]);

    // Reset inputs
    setMedText('');
    setDosageText('');
    setFreqText('');
    setDurationText('');
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleUploadSuccess = (filePath: string, fileName: string) => {
    setAttachments([...attachments, { path: filePath, name: fileName }]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setErrorMsg('Please specify a diagnosis.');
      return;
    }
    if (!selectedDoctorId) {
      setErrorMsg('Please select a diagnosing doctor.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('medical_records').insert({
        clinic_id: profile?.clinic_id,
        patient_id: patientId,
        doctor_id: selectedDoctorId,
        visit_date: new Date().toISOString().split('T')[0],
        diagnosis: diagnosis.trim(),
        prescriptions: prescriptions,
        attachments: attachments
      });

      if (error) {
        throw error;
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save EMR record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={modalOverlayStyle}>
      <div className="modal-content" style={modalContentStyle}>
        <div className="modal-header" style={modalHeaderStyle}>
          <h2>Add Medical Record — {patientName}</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {errorMsg && (
          <div className="alert alert-danger">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Doctor Selection */}
          {profile?.role !== 'doctor' ? (
            <div className="form-group">
              <label>Diagnosing Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                style={selectStyle}
                required
              >
                <option value="">-- Select Doctor --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>Dr. {d.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Doctor</label>
              <input type="text" value={`Dr. ${profile?.name}`} disabled style={disabledInputStyle} />
            </div>
          )}

          {/* Diagnosis Text */}
          <div className="form-group">
            <label>Diagnosis / Visit Notes *</label>
            <textarea
              placeholder="Enter patient symptoms, observation, and clinical diagnosis..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              style={textareaStyle}
              rows={4}
              required
            />
          </div>

          {/* Prescription Editor */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Prescribe Medications</label>
            <div style={prescriptionFormStyle}>
              <input
                type="text"
                placeholder="Medicine Name (e.g. Paracetamol)"
                value={medText}
                onChange={(e) => setMedText(e.target.value)}
                style={presInputStyle}
              />
              <input
                type="text"
                placeholder="Dosage (e.g. 500 mg)"
                value={dosageText}
                onChange={(e) => setDosageText(e.target.value)}
                style={presInputStyle}
              />
              <input
                type="text"
                placeholder="Frequency (e.g. 1-0-1)"
                value={freqText}
                onChange={(e) => setFreqText(e.target.value)}
                style={presInputStyle}
              />
              <input
                type="text"
                placeholder="Duration (e.g. 5 Days)"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                style={presInputStyle}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addPrescriptionItem}
                style={{ padding: '0.5rem' }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Prescriptions List */}
            {prescriptions.length > 0 && (
              <div style={prescriptionListStyle}>
                {prescriptions.map((p, idx) => (
                  <div key={idx} style={prescriptionItemStyle}>
                    <div style={{ flex: 1 }}>
                      <strong>{p.medication}</strong> - {p.dosage} ({p.frequency}) | {p.duration}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePrescriptionItem(idx)}
                      style={deleteBtnStyle}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Uploads */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Attachments / Scans</label>
            <FileUploader patientId={patientId} onUploadSuccess={handleUploadSuccess} />

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {attachments.map((att, idx) => (
                  <div key={idx} style={attachmentItemStyle}>
                    <FileText size={16} className="accent-color" />
                    <span style={{ flex: 1, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      style={deleteBtnStyle}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, gap: '0.5rem' }}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

// Styles
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
  maxWidth: '550px',
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

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none'
};

const disabledInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-muted)',
  cursor: 'not-allowed'
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'var(--font-family)',
  fontSize: '0.925rem'
};

const prescriptionFormStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
  gap: '0.5rem',
  alignItems: 'center'
};

const presInputStyle: React.CSSProperties = {
  padding: '0.5rem',
  fontSize: '0.85rem',
  width: '100%'
};

const prescriptionListStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  backgroundColor: 'var(--bg-primary)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.75rem',
  border: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
};

const prescriptionItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.875rem',
  color: 'var(--text-secondary)'
};

const attachmentItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)'
};

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--alert-danger-text)',
  cursor: 'pointer',
  padding: '0.25rem'
};

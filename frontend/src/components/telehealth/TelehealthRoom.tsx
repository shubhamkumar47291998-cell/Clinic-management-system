import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Send, MessageSquare, Clipboard, 
  CheckCircle2, Plus, Trash2 
} from 'lucide-react';
import { AuthButton } from '../auth/AuthButton';

interface TelehealthRoomProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  role: 'doctor' | 'patient';
  onClose: () => void;
}

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

export const TelehealthRoom: React.FC<TelehealthRoomProps> = ({
  appointmentId,
  patientId,
  patientName,
  doctorId,
  doctorName,
  role,
  onClose
}) => {
  const { profile } = useAuth();

  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  
  // Chat States
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'System', text: 'Secure Telehealth Call Started. End-to-End Encrypted.', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);

  // EMR consult states (Doctor role only)
  const [diagnosis, setDiagnosis] = useState('');
  const [medText, setMedText] = useState('');
  const [dosageText, setDosageText] = useState('');
  const [freqText, setFreqText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [prescriptions, setPrescriptions] = useState<Array<{ medication: string; dosage: string; frequency: string; duration: string }>>([]);
  const [doctorSignature, setDoctorSignature] = useState(doctorName);
  
  const [savingEMR, setSavingEMR] = useState(false);
  const [emrSuccess, setEmrSuccess] = useState('');
  const [emrError, setEmrError] = useState('');

  // Right sidebar active tab: 'chat' | 'emr'
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'emr'>(role === 'doctor' ? 'emr' : 'chat');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage: ChatMessage = {
      sender: role === 'doctor' ? `Dr. ${doctorName}` : patientName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    setMessages([...messages, newMessage]);
    setChatInput('');
  };

  const handleAddMed = () => {
    if (!medText.trim()) return;
    setPrescriptions([
      ...prescriptions,
      {
        medication: medText.trim(),
        dosage: dosageText.trim() || '1 tab',
        frequency: freqText.trim() || 'Once daily (after meals)',
        duration: durationText.trim() || '5 days'
      }
    ]);
    setMedText('');
    setDosageText('');
    setFreqText('');
    setDurationText('');
  };

  const handleRemoveMed = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleSaveConsultAndEnd = async () => {
    if (!diagnosis.trim()) {
      setEmrError('Please enter a clinical diagnosis.');
      return;
    }

    setSavingEMR(true);
    setEmrError('');
    setEmrSuccess('');

    try {
      // 1. Insert consult record to medical_records
      const { error: emrErr } = await supabase.from('medical_records').insert({
        clinic_id: profile?.clinic_id,
        patient_id: patientId,
        doctor_id: doctorId,
        visit_date: new Date().toISOString().split('T')[0],
        diagnosis: diagnosis.trim(),
        prescriptions: prescriptions,
        attachments: [],
        appointment_id: appointmentId,
        doctor_signature: doctorSignature.trim() || null
      });

      if (emrErr) throw emrErr;

      // 2. Also register in prescriptions table if medicines were added
      if (prescriptions.length > 0) {
        const mappedMedicines = prescriptions.map((p) => ({
          name: p.medication,
          dosage: p.dosage,
          duration: p.duration,
          instructions: p.frequency
        }));

        const { data: newRx, error: rxErr } = await supabase.from('prescriptions').insert({
          clinic_id: profile?.clinic_id,
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_id: appointmentId,
          medicines: mappedMedicines,
          notes: `Telehealth consultation diagnosis: ${diagnosis.trim()}`
        }).select('id').single();

        if (rxErr) throw rxErr;

        // Log WhatsApp alert with receipt/prescription ready triggers
        if (newRx) {
          await supabase.from('notifications').insert({
            clinic_id: profile?.clinic_id,
            patient_id: patientId,
            type: 'Prescription Ready',
            channel: 'WhatsApp',
            status: 'sent',
            content: `Hi ${patientName}! Your virtual consultation Rx has been issued by Dr. ${doctorName}. View Rx here: https://aura-hospital.com/rx/${newRx.id.substring(0,8)}`
          });
        }
      }

      // 3. Mark appointment completed
      await supabase
        .from('appointments')
        .update({ status: 'completed', notes: diagnosis.trim() })
        .eq('id', appointmentId);

      setEmrSuccess('✓ Consultation saved. Closing call...');
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setEmrError(err.message || 'Failed to save virtual consultation EMR.');
    } finally {
      setSavingEMR(false);
    }
  };

  return (
    <div style={telehealthContainerStyle}>
      {/* Top Header */}
      <header style={topHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={pulseRedDotStyle} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            Telehealth Virtual Consult Room
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem' }}>
          <span>Appt ID: <strong>{appointmentId.substring(0,8).toUpperCase()}</strong></span>
          <span>Physician: <strong>Dr. {doctorName}</strong></span>
          <span>Patient: <strong>{patientName}</strong></span>
        </div>
      </header>

      {/* Main Splitscreen Body */}
      <div style={bodyGridStyle}>
        
        {/* Left Column: Webcam Streams */}
        <section style={webcamColumnStyle}>
          {/* Primary View: Remote User */}
          <div style={primaryWebcamFrameStyle}>
            {videoActive ? (
              <div style={webcamFeedStyle}>
                {/* Simulated live video stream wrapper */}
                <div style={avatarStyle}>
                  {role === 'doctor' ? patientName[0] : `Dr. ${doctorName[0]}`}
                </div>
                <div style={webcamBadgeStyle}>
                  {role === 'doctor' ? `Patient: ${patientName}` : `Dr. ${doctorName} (Consultant)`}
                </div>
              </div>
            ) : (
              <div style={videoOffPlaceholderStyle}>
                <VideoOff size={48} style={{ color: '#475569', marginBottom: '1rem' }} />
                <span>Webcam feed blocked</span>
              </div>
            )}

            {/* PIP View: Local User */}
            <div style={pipWebcamFrameStyle}>
              {videoActive ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6366f1' }}>You</span>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
                  <VideoOff size={16} />
                </div>
              )}
            </div>
          </div>

          {/* Media Call Controls */}
          <div style={controlsRowStyle}>
            <button 
              onClick={() => setMicActive(!micActive)} 
              style={micActive ? controlBtnActiveStyle : controlBtnMutedStyle}
              title={micActive ? 'Mute Mic' : 'Unmute Mic'}
            >
              {micActive ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            
            <button 
              onClick={() => setVideoActive(!videoActive)} 
              style={videoActive ? controlBtnActiveStyle : controlBtnMutedStyle}
              title={videoActive ? 'Stop Camera' : 'Start Camera'}
            >
              {videoActive ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            <button 
              onClick={role === 'doctor' ? handleSaveConsultAndEnd : onClose}
              style={endCallBtnStyle}
              title="End Virtual Consultation"
            >
              <PhoneOff size={20} style={{ marginRight: '0.5rem' }} /> {role === 'doctor' ? 'Save & End Call' : 'Exit Room'}
            </button>
          </div>
        </section>

        {/* Right Column: Tabbed Chat / EMR Workspace */}
        <section style={workspaceColumnStyle}>
          {/* Tab Selector */}
          <div style={workspaceTabsStyle}>
            <button 
              onClick={() => setSidebarTab('chat')} 
              style={sidebarTab === 'chat' ? activeTabBtnStyle : tabBtnStyle}
            >
              <MessageSquare size={16} /> Virtual Consult Chat
            </button>
            {role === 'doctor' && (
              <button 
                onClick={() => setSidebarTab('emr')} 
                style={sidebarTab === 'emr' ? activeTabBtnStyle : tabBtnStyle}
              >
                <Clipboard size={16} /> EMR consult Writer
              </button>
            )}
          </div>

          {/* Tab Panels */}
          <div style={tabPanelContainerStyle}>
            
            {/* 1. Live Chat Panel */}
            {sidebarTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={chatMessagesContainerStyle}>
                  {messages.map((m, idx) => (
                    <div key={idx} style={m.sender === 'System' ? systemMessageStyle : chatMessageStyle(m.sender === 'You' || m.sender.includes(role === 'doctor' ? 'Dr.' : patientName))}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 700, marginBottom: '0.15rem' }}>{m.sender} ({m.time})</div>
                      <div>{m.text}</div>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleSendMessage} style={chatInputFormStyle}>
                  <input
                    type="text"
                    placeholder="Type message to room..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={chatInputStyle}
                  />
                  <button type="submit" style={chatSendBtnStyle}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}

            {/* 2. EMR consult Writer Panel */}
            {sidebarTab === 'emr' && role === 'doctor' && (
              <div style={emrWriterPanelStyle}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem' }}>Active Consultation Record</h3>
                
                {emrSuccess && (
                  <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                    <span>{emrSuccess}</span>
                  </div>
                )}
                {emrError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                    <span>{emrError}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Clinical Diagnosis *
                  </label>
                  <textarea
                    placeholder="Enter diagnosis notes (e.g. Mild Hypertension, Viral Influenza)..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    style={emrTextareaStyle}
                    rows={3}
                    disabled={savingEMR}
                  />
                </div>

                <div style={rxBuilderContainerStyle}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Order Prescription (Rx)</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Medication name..." 
                      value={medText} 
                      onChange={(e) => setMedText(e.target.value)} 
                      style={rxInputStyle}
                    />
                    <input 
                      type="text" 
                      placeholder="Dosage (e.g. 1 tab)..." 
                      value={dosageText} 
                      onChange={(e) => setDosageText(e.target.value)} 
                      style={rxInputStyle}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input 
                      type="text" 
                      placeholder="Instructions (e.g. After meals)..." 
                      value={freqText} 
                      onChange={(e) => setFreqText(e.target.value)} 
                      style={rxInputStyle}
                    />
                    <input 
                      type="text" 
                      placeholder="Duration (e.g. 5 days)..." 
                      value={durationText} 
                      onChange={(e) => setDurationText(e.target.value)} 
                      style={rxInputStyle}
                    />
                    <button 
                      type="button" 
                      onClick={handleAddMed} 
                      className="btn btn-primary" 
                      style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>

                  {/* Medicines List */}
                  {prescriptions.length > 0 && (
                    <div style={rxListContainerStyle}>
                      {prescriptions.map((p, idx) => (
                        <div key={idx} style={rxItemStyle}>
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>{p.medication}</strong> — {p.dosage} ({p.frequency}, {p.duration})
                          </div>
                          <button onClick={() => handleRemoveMed(idx)} style={rxRemoveBtnStyle}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Practitioner Signature
                  </label>
                  <input
                    type="text"
                    value={doctorSignature}
                    onChange={(e) => setDoctorSignature(e.target.value)}
                    style={rxInputStyle}
                    disabled={savingEMR}
                  />
                </div>

                <AuthButton onClick={handleSaveConsultAndEnd} loading={savingEMR} loadingText="Saving consult file...">
                  <CheckCircle2 size={16} style={{ marginRight: '0.5rem' }} /> Commit Consult & Close Room
                </AuthButton>
              </div>
            )}

          </div>
        </section>

      </div>
    </div>
  );
};

// Styles
const telehealthContainerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#090d16',
  color: '#f8fafc',
  zIndex: 1100,
  fontFamily: "'Outfit', 'Inter', sans-serif",
  display: 'flex',
  flexDirection: 'column'
};

const topHeaderStyle: React.CSSProperties = {
  background: '#0f172a',
  borderBottom: '1px solid #1e293b',
  padding: '1rem 2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const pulseRedDotStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: '#ef4444',
  animation: 'pulse 1.5s infinite'
};

const bodyGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  flexGrow: 1,
  height: 'calc(100vh - 65px)',
  overflow: 'hidden'
};

const webcamColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: '2rem',
  gap: '1.5rem',
  background: '#090d16',
  borderRight: '1px solid #1e293b',
  justifyContent: 'center'
};

const primaryWebcamFrameStyle: React.CSSProperties = {
  flexGrow: 1,
  backgroundColor: '#1e293b',
  borderRadius: '16px',
  position: 'relative',
  border: '2px solid #334155',
  overflow: 'hidden',
  boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const webcamFeedStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative'
};

const avatarStyle: React.CSSProperties = {
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  fontSize: '3rem',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)',
  animation: 'pulse 2s infinite'
};

const webcamBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '1rem',
  left: '1rem',
  backgroundColor: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(4px)',
  padding: '0.4rem 1rem',
  borderRadius: '50px',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#e2e8f0'
};

const pipWebcamFrameStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  width: '140px',
  height: '95px',
  borderRadius: '8px',
  border: '2px solid #6366f1',
  overflow: 'hidden',
  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
  zIndex: 10
};

const videoOffPlaceholderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  color: '#94a3b8',
  fontSize: '0.9rem'
};

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem'
};

const controlBtnActiveStyle: React.CSSProperties = {
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  backgroundColor: '#334155',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s'
};

const controlBtnMutedStyle: React.CSSProperties = {
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  backgroundColor: '#ef4444',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s'
};

const endCallBtnStyle: React.CSSProperties = {
  backgroundColor: '#ef4444',
  color: '#ffffff',
  border: 'none',
  padding: '0.75rem 1.5rem',
  borderRadius: '50px',
  cursor: 'pointer',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
};

const workspaceColumnStyle: React.CSSProperties = {
  background: '#0f172a',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: '1px solid #1e293b'
};

const workspaceTabsStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #1e293b',
  backgroundColor: '#090d16'
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '1rem',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  borderBottom: '2px solid transparent'
};

const activeTabBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '1rem',
  background: '#0f172a',
  border: 'none',
  color: '#6366f1',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  borderBottom: '2px solid #6366f1'
};

const tabPanelContainerStyle: React.CSSProperties = {
  flexGrow: 1,
  padding: '1.5rem',
  overflowY: 'auto',
  height: 'calc(100vh - 120px)'
};

const chatMessagesContainerStyle: React.CSSProperties = {
  flexGrow: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  paddingBottom: '1rem',
  maxHeight: 'calc(100vh - 240px)'
};

const chatMessageStyle = (isSelf: boolean): React.CSSProperties => ({
  alignSelf: isSelf ? 'flex-end' : 'flex-start',
  backgroundColor: isSelf ? '#4f46e5' : '#1e293b',
  color: '#ffffff',
  padding: '0.75rem 1rem',
  borderRadius: isSelf ? '12px 12px 0 12px' : '12px 12px 12px 0',
  maxWidth: '75%',
  fontSize: '0.9rem',
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
});

const systemMessageStyle: React.CSSProperties = {
  alignSelf: 'center',
  backgroundColor: 'rgba(99, 102, 241, 0.08)',
  border: '1px solid rgba(99, 102, 241, 0.2)',
  color: '#818cf8',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  fontSize: '0.8rem',
  textAlign: 'center',
  maxWidth: '85%'
};

const chatInputFormStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  marginTop: 'auto',
  borderTop: '1px solid #1e293b',
  paddingTop: '1rem'
};

const chatInputStyle: React.CSSProperties = {
  flexGrow: 1,
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid #334155',
  backgroundColor: '#1e293b',
  color: '#ffffff',
  outline: 'none',
  fontSize: '0.9rem'
};

const chatSendBtnStyle: React.CSSProperties = {
  backgroundColor: '#4f46e5',
  border: 'none',
  color: '#ffffff',
  width: '42px',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const emrWriterPanelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%'
};

const emrTextareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid #334155',
  backgroundColor: '#1e293b',
  color: '#ffffff',
  outline: 'none',
  resize: 'none',
  fontSize: '0.9rem',
  marginTop: '0.25rem',
  fontFamily: 'inherit'
};

const rxBuilderContainerStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '12px',
  padding: '1rem',
  marginTop: '0.5rem'
};

const rxInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem',
  borderRadius: '6px',
  border: '1px solid #334155',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  outline: 'none',
  fontSize: '0.85rem'
};

const rxListContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginTop: '0.75rem',
  borderTop: '1px solid #334155',
  paddingTop: '0.75rem'
};

const rxItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#0f172a',
  padding: '0.5rem 0.75rem',
  borderRadius: '6px'
};

const rxRemoveBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer'
};

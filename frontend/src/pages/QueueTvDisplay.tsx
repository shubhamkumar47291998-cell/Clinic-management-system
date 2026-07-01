import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Play, Volume2, User, Clock, AlertCircle } from 'lucide-react';

interface QueueItem {
  id: string;
  token_number: number;
  status: 'waiting' | 'called' | 'skipped' | 'completed';
  is_priority: boolean;
  estimated_wait_minutes: number;
  doctor_id: string;
  patient_id: string;
  patients: { name: string } | null;
  profiles: { name: string; specialization: string } | null;
}

export const QueueTvDisplay: React.FC = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState(new Date());

  const fetchLiveQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('waiting_queue')
        .select(`
          id,
          token_number,
          status,
          is_priority,
          estimated_wait_minutes,
          doctor_id,
          patient_id,
          patients(name),
          profiles:doctor_id(name, specialization)
        `)
        .in('status', ['waiting', 'called'])
        .order('is_priority', { ascending: false })
        .order('token_number', { ascending: true });

      if (error) throw error;
      setQueue((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching live queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveQueue();
    const interval = setInterval(fetchLiveQueue, 8000); // refresh queue every 8s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter list by status
  const activeCalled = queue.filter(q => q.status === 'called');
  const upcomingQueue = queue.filter(q => q.status === 'waiting');

  return (
    <div style={pageStyle}>
      {/* Header bar */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Aura Clinics Waitlist</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem' }}>Lobby Digital Token Board</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {nowTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {nowTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Main content grid */}
      <main style={gridStyle}>
        
        {/* Left Side: Called / Now Consulting */}
        <section style={leftColStyle}>
          <h2 style={sectionHeaderStyle}>
            <Volume2 size={24} style={{ animation: 'pulse 1.5s infinite' }} /> Now Consulting / Active Calls
          </h2>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#cbd5e1' }}>Retrieving live board...</div>
          ) : activeCalled.length === 0 ? (
            <div style={emptyCardStyle}>
              <Play size={48} style={{ color: '#475569', marginBottom: '1rem' }} />
              <h3>All Quiet in Consultation Rooms</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>Please wait for the reception desk to call the next token.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {activeCalled.map((item) => (
                <div key={item.id} style={activeTokenCardStyle(item.is_priority)}>
                  {item.is_priority && (
                    <div style={priorityBadgeStyle}>PRIORITY TRAUMA CASE</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Token Number
                      </span>
                      <div style={tokenNumberStyle}>#{item.token_number}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Consulting Doctor</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                        Dr. {item.profiles?.name || 'Practitioner'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#818cf8' }}>
                        {item.profiles?.specialization || 'General Care'}
                      </div>
                    </div>
                  </div>
                  <div style={patientBarActiveStyle}>
                    <User size={18} />
                    <span>Patient: <strong>{item.patients?.name || 'Walk-in'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Side: Up Next / Waiting */}
        <section style={rightColStyle}>
          <h2 style={sectionHeaderStyle}>
            <Clock size={24} /> Up Next / Waiting Queue
          </h2>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#cbd5e1' }}>Retrieving timeline...</div>
          ) : upcomingQueue.length === 0 ? (
            <div style={emptyCardStyle}>
              <AlertCircle size={48} style={{ color: '#475569', marginBottom: '1rem' }} />
              <h3>Queue is Empty</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>No pending patients waiting for consultations.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcomingQueue.map((item) => (
                <div key={item.id} style={waitingCardStyle(item.is_priority)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={waitingTokenNumStyle(item.is_priority)}>
                        #{item.token_number}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>
                          {item.patients?.name || 'Walk-in'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                          Doctor: Dr. {item.profiles?.name} ({item.profiles?.specialization})
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Est. Wait</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
                        ~{item.estimated_wait_minutes} mins
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Footer bar */}
      <footer style={footerStyle}>
        <div>⚠️ Emergency crisis patients are fast-tracked automatically. Please coordinate check-ins at the desk.</div>
        <div>Aura Healthcare © 2026</div>
      </footer>
    </div>
  );
};

// Styles
const pageStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  minHeight: '100vh',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  display: 'flex',
  flexDirection: 'column'
};

const headerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #4f46e5 0%, #1e1b4b 100%)',
  padding: '1.5rem 3rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '3px solid #6366f1',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '3rem',
  padding: '3rem',
  flexGrow: 1
};

const leftColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem'
};

const rightColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  borderLeft: '1px solid #334155',
  paddingLeft: '3rem'
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  color: '#e2e8f0',
  borderBottom: '2px solid #334155',
  paddingBottom: '0.75rem',
  marginBottom: '1rem'
};

const emptyCardStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '16px',
  border: '1px dashed #475569',
  padding: '4rem 2rem',
  textAlign: 'center'
};

const activeTokenCardStyle = (isPriority: boolean): React.CSSProperties => ({
  background: isPriority
    ? 'linear-gradient(135deg, #7f1d1d 0%, #1e293b 100%)'
    : 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%)',
  borderRadius: '16px',
  border: isPriority ? '2px solid #ef4444' : '2px solid #4f46e5',
  padding: '2rem',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
  position: 'relative',
  overflow: 'hidden'
});

const priorityBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0',
  right: '0',
  backgroundColor: '#ef4444',
  color: '#ffffff',
  fontSize: '0.65rem',
  fontWeight: 800,
  padding: '0.25rem 0.75rem',
  borderRadius: '0 0 0 8px',
  letterSpacing: '1px'
};

const tokenNumberStyle: React.CSSProperties = {
  fontSize: '3.5rem',
  fontWeight: 900,
  color: '#6366f1',
  lineHeight: 1,
  marginTop: '0.25rem'
};

const patientBarActiveStyle: React.CSSProperties = {
  marginTop: '1.5rem',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.1rem',
  color: '#cbd5e1'
};

const waitingCardStyle = (isPriority: boolean): React.CSSProperties => ({
  backgroundColor: '#1e293b',
  borderRadius: '12px',
  border: isPriority ? '1.5px solid #ef4444' : '1px solid #334155',
  padding: '1.25rem',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
});

const waitingTokenNumStyle = (isPriority: boolean): React.CSSProperties => ({
  backgroundColor: isPriority ? '#7f1d1d' : '#312e81',
  color: isPriority ? '#fca5a5' : '#818cf8',
  width: '3.5rem',
  height: '3.5rem',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.35rem',
  fontWeight: 800
});

const footerStyle: React.CSSProperties = {
  background: '#090d16',
  padding: '1rem 3rem',
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.85rem',
  color: '#64748b',
  borderTop: '1px solid #1e293b'
};

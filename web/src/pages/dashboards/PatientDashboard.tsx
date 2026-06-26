import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { PatientDetail } from '../../components/patients/PatientDetail';
import { Calendar, FileText, Gift, LogOut, Star, AlertCircle } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  created_at: string;
}

export const PatientDashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'records' | 'referrals'>('records');

  useEffect(() => {
    const fetchMyPatientFile = async () => {
      if (!user?.phone) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('phone', user.phone)
          .single();

        if (error) {
          console.warn('No patient demographics file matches phone:', user.phone, error);
        } else if (data) {
          setPatientRecord(data as Patient);
        }
      } catch (err) {
        console.error('Error fetching patient file:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyPatientFile();
  }, [user]);

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Star size={24} className="accent-color" />
          <span>AURA Patient</span>
        </div>
        <div className="sidebar-user">
          <p className="user-name">{profile?.name || user?.email || user?.phone}</p>
          <p className="user-role">{profile?.role.toUpperCase()}</p>
        </div>
        <nav className="sidebar-nav">
          <button
            onClick={() => setView('records')}
            className={`nav-item ${view === 'records' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <FileText size={18} /> My Medical Files
          </button>
          <button
            onClick={() => setView('referrals')}
            className={`nav-item ${view === 'referrals' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Gift size={18} /> Referrals & Rewards
          </button>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Patient Portal</h1>
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading EMR Profile...</div>
        ) : view === 'records' ? (
          <div>
            {patientRecord ? (
              <PatientDetail
                patient={patientRecord}
                onClose={() => {}} // Empty function, patient has no back action
              />
            ) : (
              <div className="dashboard-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <AlertCircle size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block' }} />
                <h3>Profile File Pending</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                  We found your authentication record, but the clinic has not created a demographics file for your contact number (<strong>{user?.phone}</strong>) yet. 
                  Please request the front desk staff to register your patient details.
                </p>
              </div>
            )}
          </div>
        ) : (
          <section className="dashboard-card">
            <h2>Referrals & Rewards</h2>
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <p>Invite friends and family to Auric Clinic. Share your custom referral link/code and receive credit rewards once they complete their first consult!</p>
              <div style={{ marginTop: '1rem' }}>
                <strong>Your Invite Code:</strong>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
                  PAT-{user?.id ? user.id.substring(0, 8).toUpperCase() : 'CODE'}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

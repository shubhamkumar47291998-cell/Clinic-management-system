import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, FileText, Gift, LogOut, Star } from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Star size={24} className="accent-color" />
          <span>AURA Patient Portal</span>
        </div>
        <div className="sidebar-user">
          <p className="user-name">{profile?.name}</p>
          <p className="user-role">{profile?.role.toUpperCase()}</p>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active"><Calendar size={18} /> My Appointments</a>
          <a href="#" className="nav-item"><FileText size={18} /> Medical Reports</a>
          <a href="#" className="nav-item"><Gift size={18} /> Referrals & Rewards</a>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Welcome, {profile?.name}</h1>
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Next Appointment</h3>
            <p className="stat-value" style={{ fontSize: '1.25rem', padding: '0.5rem 0' }}>None Scheduled</p>
            <span className="stat-sub">Book slots online anytime</span>
          </div>
          <div className="stat-card">
            <h3>Referral Program</h3>
            <p className="stat-value" style={{ fontSize: '1.25rem', padding: '0.5rem 0' }}>Code: PAT-{profile?.id.substring(0, 5).toUpperCase()}</p>
            <span className="stat-sub">Invite friends, get ₹150 credit</span>
          </div>
        </section>

        <section className="dashboard-card" style={{ marginTop: '2rem' }}>
          <h2>My Treatment Summaries</h2>
          <p style={{ color: 'var(--text-muted)' }}>Prescriptions and follow-up consultation notes added by doctors will appear here.</p>
        </section>
      </main>
    </div>
  );
};

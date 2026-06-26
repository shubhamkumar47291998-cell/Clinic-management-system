import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, FileText, Calendar, LogOut, Heart } from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Heart size={24} className="accent-color" />
          <span>AURA Doctor Portal</span>
        </div>
        <div className="sidebar-user">
          <p className="user-name">{profile?.name}</p>
          <p className="user-role">{profile?.role.toUpperCase()}</p>
          {profile?.specialization && <p className="user-spec">{profile.specialization}</p>}
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active"><Calendar size={18} /> Appointments</a>
          <a href="#" className="nav-item"><FileText size={18} /> EMR History</a>
          <a href="#" className="nav-item"><UserCheck size={18} /> Patients list</a>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Doctor Consultations</h1>
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Scheduled Visits</h3>
            <p className="stat-value">5</p>
            <span className="stat-sub">For the rest of the day</span>
          </div>
          <div className="stat-card">
            <h3>Treated Today</h3>
            <p className="stat-value">3</p>
            <span className="stat-sub">Completed sessions</span>
          </div>
        </section>

        <section className="dashboard-card" style={{ marginTop: '2rem' }}>
          <h2>Today's Patient Queue</h2>
          <p style={{ color: 'var(--text-muted)' }}>Appointments assigned to you will appear here in chronological order.</p>
        </section>
      </main>
    </div>
  );
};

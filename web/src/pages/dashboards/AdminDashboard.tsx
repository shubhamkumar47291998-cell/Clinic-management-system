import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building, Users, Calendar, CreditCard, LogOut, Settings } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Building size={24} className="accent-color" />
          <span>AURA Clinic Admin</span>
        </div>
        <div className="sidebar-user">
          <p className="user-name">{profile?.name}</p>
          <p className="user-role">{profile?.role.toUpperCase()}</p>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active"><Calendar size={18} /> Schedule</a>
          <a href="#" className="nav-item"><Users size={18} /> Staff Members</a>
          <a href="#" className="nav-item"><CreditCard size={18} /> Billing reports</a>
          <a href="#" className="nav-item"><Settings size={18} /> Clinic Settings</a>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Clinic Dashboard</h1>
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Today's Bookings</h3>
            <p className="stat-value">8</p>
            <span className="stat-sub">3 appointments completed</span>
          </div>
          <div className="stat-card">
            <h3>Monthly Revenue</h3>
            <p className="stat-value">₹18,200</p>
            <span className="stat-sub">Generated this month</span>
          </div>
          <div className="stat-card">
            <h3>Staff Count</h3>
            <p className="stat-value">4</p>
            <span className="stat-sub">Doctors & receptionists</span>
          </div>
        </section>

        <section className="dashboard-card" style={{ marginTop: '2rem' }}>
          <h2>Staff Members</h2>
          <p style={{ color: 'var(--text-muted)' }}>Configure schedules and staff roles here.</p>
        </section>
      </main>
    </div>
  );
};

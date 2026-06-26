import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Users, Building, Activity, LogOut } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Shield size={24} className="accent-color" />
          <span>AURA Super Admin</span>
        </div>
        <div className="sidebar-user">
          <p className="user-name">{profile?.name}</p>
          <p className="user-role">{profile?.role.toUpperCase()}</p>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active"><Building size={18} /> Clinics</a>
          <a href="#" className="nav-item"><Users size={18} /> Users</a>
          <a href="#" className="nav-item"><Activity size={18} /> System Logs</a>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>
      
      <main className="main-content">
        <header className="content-header">
          <h1>SaaS Platform Overview</h1>
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Total Clinics</h3>
            <p className="stat-value">12</p>
            <span className="stat-sub">Active subscriptions</span>
          </div>
          <div className="stat-card">
            <h3>Platform Revenue</h3>
            <p className="stat-value">₹84,500</p>
            <span className="stat-sub">This month</span>
          </div>
          <div className="stat-card">
            <h3>System Status</h3>
            <p className="stat-value" style={{ color: '#10b981' }}>Healthy</p>
            <span className="stat-sub">All systems operational</span>
          </div>
        </section>

        <section className="dashboard-card" style={{ marginTop: '2rem' }}>
          <h2>Onboarded Clinics</h2>
          <p style={{ color: 'var(--text-muted)' }}>A listing of registered clinics across the platform will appear here.</p>
        </section>
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DashboardOverview } from '../../components/dashboard/DashboardOverview';
import { Shield, Building, Activity, LogOut } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<'analytics' | 'clinics'>('analytics');

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
          <button
            onClick={() => setView('analytics')}
            className={`nav-item ${view === 'analytics' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Activity size={18} /> Platform Analytics
          </button>
          <button
            onClick={() => setView('clinics')}
            className={`nav-item ${view === 'clinics' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Building size={18} /> Clinics Onboarded
          </button>
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

        {view === 'analytics' ? (
          <DashboardOverview />
        ) : (
          <section className="dashboard-card">
            <h2>Onboarded Clinics</h2>
            <p style={{ color: 'var(--text-muted)' }}>A listing of registered clinics across the platform will appear here.</p>
          </section>
        )}
      </main>
    </div>
  );
};


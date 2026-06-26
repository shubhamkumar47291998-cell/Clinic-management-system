import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, CreditCard, LogOut, CheckSquare } from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <CheckSquare size={24} className="accent-color" />
          <span>AURA Receptionist</span>
        </div>
        <div className="sidebar-user">
          <p className="user-name">{profile?.name}</p>
          <p className="user-role">{profile?.role.toUpperCase()}</p>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active"><Calendar size={18} /> Booking Calendar</a>
          <a href="#" className="nav-item"><Users size={18} /> Patients Directory</a>
          <a href="#" className="nav-item"><CreditCard size={18} /> Invoicing</a>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Front Desk Tasks</h1>
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <h3>Active Bookings</h3>
            <p className="stat-value">8</p>
            <span className="stat-sub">Registered for today</span>
          </div>
          <div className="stat-card">
            <h3>Pending Invoices</h3>
            <p className="stat-value">2</p>
            <span className="stat-sub">Needs payment processing</span>
          </div>
        </section>

        <section className="dashboard-card" style={{ marginTop: '2rem' }}>
          <h2>Check-In & Registration</h2>
          <p style={{ color: 'var(--text-muted)' }}>Quickly search for existing patients or register new walk-in files.</p>
        </section>
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PatientList } from '../../components/patients/PatientList';
import { PatientDetail } from '../../components/patients/PatientDetail';
import { Users, Calendar, CreditCard, LogOut, CheckSquare } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  created_at: string;
}

export const StaffDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [view, setView] = useState<'calendar' | 'patients' | 'billing'>('patients');

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
          <button
            onClick={() => { setView('calendar'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'calendar' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Calendar size={18} /> Booking Calendar
          </button>
          <button
            onClick={() => { setView('patients'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'patients' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Users size={18} /> Patients Directory
          </button>
          <button
            onClick={() => { setView('billing'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'billing' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <CreditCard size={18} /> Invoicing
          </button>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Front Desk Panel</h1>
          <div className="date-badge">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>

        {view === 'patients' && (
          <div>
            {selectedPatient ? (
              <PatientDetail
                patient={selectedPatient}
                onClose={() => setSelectedPatient(null)}
              />
            ) : (
              <div>
                <h2 style={{ marginBottom: '1rem' }}>Patient Files Directory</h2>
                <PatientList onSelectPatient={setSelectedPatient} />
              </div>
            )}
          </div>
        )}

        {view === 'calendar' && (
          <section className="dashboard-card">
            <h2>Appointments Calendar</h2>
            <p style={{ color: 'var(--text-muted)' }}>The appointments module scheduling features will load in this panel.</p>
          </section>
        )}

        {view === 'billing' && (
          <section className="dashboard-card">
            <h2>Billing & Invoicing Panel</h2>
            <p style={{ color: 'var(--text-muted)' }}>Service rates and payment logs will appear in this section.</p>
          </section>
        )}
      </main>
    </div>
  );
};

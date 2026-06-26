import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PatientList } from '../../components/patients/PatientList';
import { PatientDetail } from '../../components/patients/PatientDetail';
import { UserCheck, FileText, Calendar, LogOut, Heart } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  created_at: string;
}

export const DoctorDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [view, setView] = useState<'schedule' | 'patients'>('patients');

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
          <button
            onClick={() => { setView('schedule'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'schedule' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Calendar size={18} /> My Appointments
          </button>
          <button
            onClick={() => { setView('patients'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'patients' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <UserCheck size={18} /> Patients Directory
          </button>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Doctor Panel</h1>
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
                <h2 style={{ marginBottom: '1rem' }}>Patient Files Search</h2>
                <PatientList onSelectPatient={setSelectedPatient} />
              </div>
            )}
          </div>
        )}

        {view === 'schedule' && (
          <section className="dashboard-card">
            <h2>Appointments List</h2>
            <p style={{ color: 'var(--text-muted)' }}>Assigned consultations schedule will load in this area.</p>
          </section>
        )}
      </main>
    </div>
  );
};

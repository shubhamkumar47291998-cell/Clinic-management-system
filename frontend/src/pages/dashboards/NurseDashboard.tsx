import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PatientList } from '../../components/patients/PatientList';
import { PatientDetail } from '../../components/patients/PatientDetail';
import { OpdQueue } from '../../components/opd/OpdQueue';
import { IpdPanel } from '../../components/ipd/IpdPanel';
import { NursePanel } from '../../components/nurse/NursePanel';
import { ReceptionPanel } from '../../components/reception/ReceptionPanel';
import { DashboardOverview } from '../../components/dashboard/DashboardOverview';
import { Users, Calendar, LogOut, CheckSquare, Activity, Bed, Clipboard, TrendingUp } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  created_at: string;
}

export const NurseDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [view, setView] = useState<'dashboard' | 'patients' | 'queue' | 'ipd' | 'nurse' | 'reception'>('dashboard');

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <CheckSquare size={24} className="accent-color" />
          <span>AURA Nurse Desk</span>
        </div>
        <div className="sidebar-user">
          <p className="user-name">{profile?.name}</p>
          <p className="user-role">{profile?.role.toUpperCase()}</p>
        </div>
        <nav className="sidebar-nav">
          <button
            onClick={() => { setView('dashboard'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <TrendingUp size={18} /> Dashboard
          </button>
          <button
            onClick={() => { setView('patients'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'patients' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Users size={18} /> Patients
          </button>
          <button
            onClick={() => { setView('queue'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'queue' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Activity size={18} /> OPD Queue & Vitals
          </button>
          <button
            onClick={() => { setView('ipd'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'ipd' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Bed size={18} /> Ward Beds (IPD)
          </button>
          <button
            onClick={() => { setView('nurse'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'nurse' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Calendar size={18} /> Nurse Rosters
          </button>
          <button
            onClick={() => { setView('reception'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'reception' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Clipboard size={18} /> Visitor Logs
          </button>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Clinical Nurse Dashboard</h1>
          <div className="date-badge">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        {view === 'dashboard' && (
          <DashboardOverview onNavigate={(targetView) => {
            if (targetView === 'patients') setView('patients');
            else setView('dashboard');
          }} />
        )}

        {view === 'patients' && (
          <div>
            {selectedPatient ? (
              <PatientDetail
                patient={selectedPatient}
                onClose={() => setSelectedPatient(null)}
              />
            ) : (
              <div>
                <h2 style={{ marginBottom: '1rem' }}>Patients Checkup Timeline</h2>
                <PatientList onSelectPatient={setSelectedPatient} />
              </div>
            )}
          </div>
        )}

        {view === 'queue' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>OPD Triage Vitals Logging</h2>
            <OpdQueue />
          </div>
        )}

        {view === 'ipd' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Ward Bed Admissions Control</h2>
            <IpdPanel />
          </div>
        )}

        {view === 'nurse' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Nurse Duty Shifts & Rosters</h2>
            <NursePanel />
          </div>
        )}

        {view === 'reception' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Reception Check-Ins & Visitors</h2>
            <ReceptionPanel />
          </div>
        )}
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PatientList } from '../../components/patients/PatientList';
import { PatientDetail } from '../../components/patients/PatientDetail';
import { DoctorScheduleModal } from '../../components/doctors/DoctorScheduleModal';
import { AppointmentCalendar } from '../../components/appointments/AppointmentCalendar';
import { OpdQueue } from '../../components/opd/OpdQueue';
import { IpdPanel } from '../../components/ipd/IpdPanel';
import { DashboardOverview } from '../../components/dashboard/DashboardOverview';
import { UserCheck, Calendar, LogOut, Heart, Clock, Activity, Bed, TrendingUp, User } from 'lucide-react';

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
  const [view, setView] = useState<'dashboard' | 'schedule' | 'patients' | 'queue' | 'ipd' | 'profile'>('dashboard');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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
            onClick={() => { setView('dashboard'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <TrendingUp size={18} /> Dashboard
          </button>
          <button
            onClick={() => { setView('queue'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'queue' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Activity size={18} /> Consultation Queue
          </button>
          <button
            onClick={() => { setView('ipd'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'ipd' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Bed size={18} /> Inpatients (IPD)
          </button>
          <button
            onClick={() => { setView('schedule'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'schedule' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Calendar size={18} /> Booking Calendar
          </button>
          <button
            onClick={() => { setView('patients'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'patients' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <UserCheck size={18} /> Patients
          </button>
          <button
            onClick={() => { setView('profile'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'profile' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <User size={18} /> My Profile
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="nav-item"
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Clock size={18} /> Working Hours
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

        {view === 'dashboard' && (
          <DashboardOverview onNavigate={setView} />
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
                <h2 style={{ marginBottom: '1rem' }}>Patient Files Search</h2>
                <PatientList onSelectPatient={setSelectedPatient} />
              </div>
            )}
          </div>
        )}

        {view === 'queue' && (
          <div>
            <OpdQueue />
          </div>
        )}

        {view === 'ipd' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Inpatient Rounds (IPD)</h2>
            <IpdPanel />
          </div>
        )}

        {view === 'schedule' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>My Appointments Calendar</h2>
            <AppointmentCalendar />
          </div>
        )}

        {view === 'profile' && (
          <div className="dashboard-card" style={{ padding: '2rem', maxWidth: '600px', margin: '0.5rem auto' }}>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--accent-light)', paddingBottom: '0.5rem' }}>My Doctor Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 600 }}>{profile?.name}</p>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Designation</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>{(profile as any)?.designation || 'Consultant Physician'}</p>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Specialization</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>{profile?.specialization || 'Internal Medicine'}</p>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Qualifications</strong>
                {(profile as any)?.qualifications && (profile as any).qualifications.length > 0 ? (
                  <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.2rem' }}>
                    {(profile as any).qualifications.map((q: string, idx: number) => <li key={idx}>{q}</li>)}
                  </ul>
                ) : (
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>No qualifications added.</p>
                )}
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contact Mobile</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>{(profile as any)?.mobile || '9546650878'}</p>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Practice Address</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
                  {(profile as any)?.address || 'Sankhalim, Goa, India'}
                  {(profile as any)?.pin_code && ` (PIN: ${(profile as any).pin_code})`}
                </p>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Account Status</strong>
                <p style={{ margin: '0.25rem 0 0 0' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '50px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: profile?.is_active ? '#ecfdf5' : '#065f46',
                    color: profile?.is_active ? '#065f46' : '#ffffff',
                  }}>
                    {profile?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {showScheduleModal && profile?.id && (
        <DoctorScheduleModal
          doctorId={profile.id}
          doctorName={profile.name}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
};


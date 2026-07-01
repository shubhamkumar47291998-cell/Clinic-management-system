import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PatientList } from '../../components/patients/PatientList';
import { PatientDetail } from '../../components/patients/PatientDetail';
import { AppointmentCalendar } from '../../components/appointments/AppointmentCalendar';
import { OpdQueue } from '../../components/opd/OpdQueue';
import { QueueManager } from '../../components/reception/QueueManager';
import { IpdPanel } from '../../components/ipd/IpdPanel';
import { InvoiceGenerator } from '../../components/billing/InvoiceGenerator';
import { PharmacyPanel } from '../../components/pharmacy/PharmacyPanel';
import { LabPanel } from '../../components/lab/LabPanel';
import { InventoryPanel } from '../../components/inventory/InventoryPanel';
import { StaffList } from '../../components/staff/StaffList';
import { NursePanel } from '../../components/nurse/NursePanel';
import { ReceptionPanel } from '../../components/reception/ReceptionPanel';
import { DepartmentPanel } from '../../components/department/DepartmentPanel';
import { DashboardOverview } from '../../components/dashboard/DashboardOverview';
import { Users, Calendar, CreditCard, LogOut, CheckSquare, Clipboard, TrendingUp, Clock } from 'lucide-react';

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
  const [view, setView] = useState<'dashboard' | 'calendar' | 'patients' | 'queue' | 'ipd' | 'billing' | 'pharmacy' | 'lab' | 'inventory' | 'staff' | 'reception' | 'departments'>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'nurses'>('staff');
  const [queueSubTab, setQueueSubTab] = useState<'tokens' | 'vitals'>('tokens');

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
            onClick={() => { setView('dashboard'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <TrendingUp size={18} /> Dashboard
          </button>
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
            <Users size={18} /> Patients
          </button>
          <button
            onClick={() => { setView('queue'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'queue' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Clock size={18} /> Queue Board
          </button>
          <button
            onClick={() => { setView('billing'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'billing' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <CreditCard size={18} /> Invoicing
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
          <h1>Front Desk Panel</h1>
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
                <h2 style={{ marginBottom: '1rem' }}>Patient Files Directory</h2>
                <PatientList onSelectPatient={setSelectedPatient} />
              </div>
            )}
          </div>
        )}

        {view === 'calendar' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Appointments Calendar</h2>
            <AppointmentCalendar />
          </div>
        )}

        {view === 'queue' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>OPD Waitlist Queue Manager</h2>
            <div className="tab-container" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`tab-btn ${queueSubTab === 'tokens' ? 'active' : ''}`}
                onClick={() => setQueueSubTab('tokens')}
              >
                Lobby Token Board
              </button>
              <button
                className={`tab-btn ${queueSubTab === 'vitals' ? 'active' : ''}`}
                onClick={() => setQueueSubTab('vitals')}
              >
                OPD Vitals Triaging
              </button>
            </div>
            {queueSubTab === 'tokens' ? (
              <QueueManager />
            ) : (
              <OpdQueue />
            )}
          </div>
        )}

        {view === 'ipd' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Inpatient Ward Records (IPD)</h2>
            <IpdPanel />
          </div>
        )}

        {view === 'billing' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Invoices & Receipt Management</h2>
            <InvoiceGenerator />
          </div>
        )}

        {view === 'pharmacy' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Pharmacy Store & Dispatch Control</h2>
            <PharmacyPanel />
          </div>
        )}

        {view === 'lab' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Laboratory Sample & Report Queue</h2>
            <LabPanel />
          </div>
        )}

        {view === 'inventory' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Clinic Inventory & Ledger Control</h2>
            <InventoryPanel />
          </div>
        )}

        {view === 'staff' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Staff Directory Control</h2>
            <div className="tab-container" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`tab-btn ${activeSubTab === 'staff' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('staff')}
              >
                Support Staff Directory
              </button>
              <button
                className={`tab-btn ${activeSubTab === 'nurses' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('nurses')}
              >
                Nurses & Rosters
              </button>
            </div>
            {activeSubTab === 'staff' ? <StaffList /> : <NursePanel />}
          </div>
        )}

        {view === 'reception' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Reception Walk-Ins & Logs</h2>
            <ReceptionPanel />
          </div>
        )}

        {view === 'departments' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Clinic Departments Control</h2>
            <DepartmentPanel />
          </div>
        )}
      </main>
    </div>
  );
};

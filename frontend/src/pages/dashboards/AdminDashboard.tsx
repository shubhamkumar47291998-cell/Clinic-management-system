import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DoctorList } from '../../components/doctors/DoctorList';
import { StaffList } from '../../components/staff/StaffList';
import { NursePanel } from '../../components/nurse/NursePanel';
import { ReceptionPanel } from '../../components/reception/ReceptionPanel';
import { DepartmentPanel } from '../../components/department/DepartmentPanel';
import { DashboardOverview } from '../../components/dashboard/DashboardOverview';
import { AppointmentCalendar } from '../../components/appointments/AppointmentCalendar';
import { IpdPanel } from '../../components/ipd/IpdPanel';
import { InvoiceGenerator } from '../../components/billing/InvoiceGenerator';
import { PharmacyPanel } from '../../components/pharmacy/PharmacyPanel';
import { LabPanel } from '../../components/lab/LabPanel';
import { InventoryPanel } from '../../components/inventory/InventoryPanel';
import { PatientList } from '../../components/patients/PatientList';
import { PatientDetail } from '../../components/patients/PatientDetail';
import { ReportsPanel } from '../../components/reports/ReportsPanel';
import { BackupManager } from '../../components/admin/BackupManager';
import { Building, Users, Calendar, CreditCard, LogOut, Settings, Bed, Package, Activity, Archive, Clipboard, TrendingUp, UserCheck, BarChart } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<'dashboard' | 'schedule' | 'doctors' | 'patients' | 'ipd' | 'billing' | 'pharmacy' | 'lab' | 'inventory' | 'reception' | 'departments' | 'settings' | 'reports'>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<'doctors' | 'staff' | 'nurses'>('doctors');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

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
          <button
            onClick={() => setView('dashboard')}
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <TrendingUp size={18} /> Dashboard
          </button>
          <button
            onClick={() => setView('doctors')}
            className={`nav-item ${view === 'doctors' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Users size={18} /> Doctors & Staff
          </button>
          <button
            onClick={() => { setView('patients'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'patients' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <UserCheck size={18} /> Patients
          </button>
          <button
            onClick={() => { setView('schedule'); setSelectedPatient(null); }}
            className={`nav-item ${view === 'schedule' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Calendar size={18} /> Appointments
          </button>
          <button
            onClick={() => setView('ipd')}
            className={`nav-item ${view === 'ipd' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Bed size={18} /> Inpatient (IPD)
          </button>
          <button
            onClick={() => setView('billing')}
            className={`nav-item ${view === 'billing' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <CreditCard size={18} /> Billing
          </button>
          <button
            onClick={() => setView('pharmacy')}
            className={`nav-item ${view === 'pharmacy' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Package size={18} /> Pharmacy
          </button>
          <button
            onClick={() => setView('lab')}
            className={`nav-item ${view === 'lab' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Activity size={18} /> Lab Queue
          </button>
          <button
            onClick={() => setView('inventory')}
            className={`nav-item ${view === 'inventory' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Archive size={18} /> Inventory Stock
          </button>
          <button
            onClick={() => setView('reception')}
            className={`nav-item ${view === 'reception' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Clipboard size={18} /> Visitor Logs
          </button>
          <button
            onClick={() => setView('departments')}
            className={`nav-item ${view === 'departments' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Building size={18} /> Departments
          </button>
          <button
            onClick={() => setView('reports')}
            className={`nav-item ${view === 'reports' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <BarChart size={18} /> Reports
          </button>
          <button
            onClick={() => setView('settings')}
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>
        <button onClick={() => signOut()} className="logout-btn">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h1>Clinic Admin Panel</h1>
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
          <DashboardOverview onNavigate={setView} />
        )}

        {view === 'doctors' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Clinic Personnel Directory</h2>
            <div className="tab-container" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`tab-btn ${activeSubTab === 'doctors' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('doctors')}
              >
                Doctors Directory
              </button>
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
            {activeSubTab === 'doctors' ? (
              <DoctorList />
            ) : activeSubTab === 'staff' ? (
              <StaffList />
            ) : (
              <NursePanel />
            )}
          </div>
        )}

        {view === 'ipd' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Inpatient Ward Control</h2>
            <IpdPanel />
          </div>
        )}

        {view === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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

            <div>
              <h2 style={{ marginBottom: '1rem' }}>Clinic Appointments Calendar</h2>
              <AppointmentCalendar />
            </div>
          </div>
        )}

        {view === 'billing' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Financial Invoices Directory</h2>
            <InvoiceGenerator />
          </div>
        )}

        {view === 'reports' && (
          <ReportsPanel />
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
                <h2 style={{ marginBottom: '1rem' }}>Patients Registry Directory</h2>
                <PatientList onSelectPatient={setSelectedPatient} />
              </div>
            )}
          </div>
        )}

        {view === 'pharmacy' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Pharmacy & Dispensations Control</h2>
            <PharmacyPanel />
          </div>
        )}

        {view === 'lab' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Laboratory & Test Reports Queue</h2>
            <LabPanel />
          </div>
        )}

        {view === 'inventory' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Clinic Inventory & Ledger Control</h2>
            <InventoryPanel />
          </div>
        )}

        {view === 'reception' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Reception Check-Ins & Walk-Ins</h2>
            <ReceptionPanel />
          </div>
        )}

        {view === 'departments' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Clinic Departments Control</h2>
            <DepartmentPanel />
          </div>
        )}

        {view === 'settings' && (
          <BackupManager />
        )}
      </main>
    </div>
  );
};


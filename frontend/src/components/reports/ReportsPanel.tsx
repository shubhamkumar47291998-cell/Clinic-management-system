import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, CreditCard } from 'lucide-react';

export const ReportsPanel: React.FC = () => {
  const { profile } = useAuth();
  
  const [patientCount, setPatientCount] = useState(0);
  const [doctorCount, setDoctorCount] = useState(0);
  const [apptConfirmed, setApptConfirmed] = useState(0);
  const [apptCancelled, setApptCancelled] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [yearlyRevenue, setYearlyRevenue] = useState(0);
  const [doctorRevenue, setDoctorRevenue] = useState<{ name: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      // 1. Patient count
      const { count: patients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', profile.clinic_id);
      setPatientCount(patients || 0);

      // 2. Doctor count
      const { count: doctors } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true);
      setDoctorCount(doctors || 0);

      // 3. Appointments confirmed
      const { count: confirmed } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', profile.clinic_id)
        .eq('status', 'confirmed');
      setApptConfirmed(confirmed || 0);

      // 4. Appointments cancelled
      const { count: cancelled } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', profile.clinic_id)
        .eq('status', 'cancelled');
      setApptCancelled(cancelled || 0);

      // 5. Daily, Monthly and Yearly Revenue from paid invoices
      const todayStr = new Date().toISOString().substring(0, 10);
      const currentMonthStr = new Date().toISOString().substring(0, 7);
      const currentYearStr = new Date().getFullYear().toString();

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, payment_status, issued_date, profiles(name)')
        .eq('clinic_id', profile.clinic_id)
        .eq('payment_status', 'paid');

      let dailySum = 0;
      let monthlySum = 0;
      let yearlySum = 0;
      const docShareMap: Record<string, number> = {};

      if (invoices) {
        invoices.forEach((inv: any) => {
          const amt = Number(inv.total_amount) || 0;
          if (inv.issued_date === todayStr) {
            dailySum += amt;
          }
          if (inv.issued_date.startsWith(currentMonthStr)) {
            monthlySum += amt;
          }
          if (inv.issued_date.startsWith(currentYearStr)) {
            yearlySum += amt;
          }
          const docName = inv.profiles?.name || 'Clinic General';
          docShareMap[docName] = (docShareMap[docName] || 0) + amt;
        });
      }

      setDailyRevenue(dailySum);
      setMonthlyRevenue(monthlySum);
      setYearlyRevenue(yearlySum);

      const shares = Object.entries(docShareMap).map(([name, amount]) => ({
        name,
        amount
      })).sort((a, b) => b.amount - a.amount);
      setDoctorRevenue(shares);

    } catch (err) {
      console.error('Error compiling reports metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Generating clinic audit reports...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Clinic Analytics & Audit Reports</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Overview of key patient metrics, daily revenue flows, and staff contributions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        
        {/* Core Patient Stats */}
        <div className="dashboard-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>DEMOGRAPHICS</span>
            <Users size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Registered Patients:</span>
              <strong>{patientCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Certified Doctors:</span>
              <strong>{doctorCount}</strong>
            </div>
          </div>
        </div>

        {/* Core Consultation Stats */}
        <div className="dashboard-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>CONSULTATIONS</span>
            <Calendar size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Confirmed Bookings:</span>
              <strong style={{ color: '#10b981' }}>{apptConfirmed}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cancelled Bookings:</span>
              <strong style={{ color: '#ef4444' }}>{apptCancelled}</strong>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="dashboard-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>REVENUE STATS</span>
            <CreditCard size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Daily Revenue:</span>
              <strong>₹{dailyRevenue.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Monthly Revenue:</span>
              <strong>₹{monthlyRevenue.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Yearly Revenue:</span>
              <strong>₹{yearlyRevenue.toFixed(2)}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Doctor Revenue Contribs */}
      <div className="dashboard-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Doctor-wise Revenue Breakdown</h3>
        {doctorRevenue.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No billing transactions registered yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Doctor Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Contribution</th>
                </tr>
              </thead>
              <tbody>
                {doctorRevenue.map((doc, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>Dr. {doc.name.replace('Dr. ', '')}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>₹{doc.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

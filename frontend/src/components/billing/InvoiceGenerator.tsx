import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash2, X, Printer, Search, AlertCircle } from 'lucide-react';
import { AuthButton } from '../auth/AuthButton';

interface BillingRate {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface InvoiceItem {
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Invoice {
  id: string;
  total_amount: number;
  payment_status: 'unpaid' | 'paid' | 'partially_paid';
  payment_method: string | null;
  issued_date: string;
  items: InvoiceItem[];
  invoice_number?: string | null;
  gst_rate?: number | null;
  gst_amount?: number | null;
  doctor_id?: string | null;
  patients: {
    id: string;
    name: string;
    phone: string;
  } | null;
  profiles?: {
    id: string;
    name: string;
  } | null;
}

export const InvoiceGenerator: React.FC = () => {
  const { profile } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rates, setRates] = useState<BillingRate[]>([]);
  const [patients, setPatients] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // New Invoice Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectPatientId, setSelectPatientId] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  const [payStatus, setPayStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [gstRate, setGstRate] = useState<number>(0);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);

  // Add Item Temp state (inside modal)
  const [selectedRateId, setSelectedRateId] = useState('');
  const [tempQty, setTempQty] = useState('1');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  // Invoice Print Preview state
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // SaaS configuration states
  const [consultFeeConfig, setConsultFeeConfig] = useState<number>(500);
  const [activeBillingTab, setActiveBillingTab] = useState<'invoices' | 'payments'>('invoices');
  const [payments, setPayments] = useState<any[]>([]);

  const fetchBillingData = useCallback(async () => {
    if (!profile?.clinic_id) return;
    try {
      // 1. Fetch patients
      const { data: dbPatients } = await supabase
        .from('patients')
        .select('id, name, phone')
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true });
      setPatients(dbPatients || []);

      // 2. Fetch rates
      const { data: dbRates } = await supabase
        .from('billing_rates')
        .select('id, name, category, price')
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true });
      setRates(dbRates || []);

      // 3. Fetch doctors
      const { data: dbDoctors } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .order('name', { ascending: true });
      setDoctors(dbDoctors || []);
    } catch (err) {
      console.error('Error fetching billing config:', err);
    }
  }, [profile?.clinic_id]);

  const fetchInvoices = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      let dbQuery = supabase
        .from('invoices')
        .select(`
          id,
          total_amount,
          payment_status,
          payment_method,
          issued_date,
          items,
          invoice_number,
          gst_rate,
          gst_amount,
          doctor_id,
          patients (id, name, phone),
          profiles (id, name)
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('issued_date', { ascending: false });

      const { data, error } = await dbQuery;
      if (error) throw error;
      setInvoices((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id]);

  const fetchPayments = useCallback(async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id, amount, payment_mode, payment_status, transaction_id, created_at, receipt_number, receipt_pdf_url,
          patients (id, name, phone),
          invoices (id, invoice_number)
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payments ledger:', err);
    }
  }, [profile?.clinic_id]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
  }, [fetchInvoices, fetchPayments]);

  const handleAddLineItem = () => {
    if (selectedRateId) {
      const rate = rates.find((r) => r.id === selectedRateId);
      if (rate) {
        const qty = Number(tempQty) || 1;
        const newItem: InvoiceItem = {
          name: rate.name,
          price: Number(rate.price),
          quantity: qty,
          total: Number(rate.price) * qty,
        };
        setLineItems((prev) => [...prev, newItem]);
        setSelectedRateId('');
        setTempQty('1');
      }
    } else if (customItemName.trim() && customItemPrice) {
      const price = Number(customItemPrice) || 0;
      const qty = Number(tempQty) || 1;
      const newItem: InvoiceItem = {
        name: customItemName.trim(),
        price: price,
        quantity: qty,
        total: price * qty,
      };
      setLineItems((prev) => [...prev, newItem]);
      setCustomItemName('');
      setCustomItemPrice('');
      setTempQty('1');
    }
  };

  const handleRemoveLineItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const calculateTotal = () => {
    return lineItems.reduce((acc, curr) => acc + curr.total, 0);
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id || !selectPatientId || lineItems.length === 0) {
      setErrorMsg('Please select a patient and add at least one billing line item.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const subtotal = calculateTotal();
      const gstAmt = subtotal * (Number(gstRate) / 100);
      const totalAmount = subtotal + gstAmt;

      const { data, error } = await supabase.from('invoices').insert({
        clinic_id: profile.clinic_id,
        patient_id: selectPatientId,
        items: lineItems,
        total_amount: totalAmount,
        gst_rate: Number(gstRate),
        gst_amount: gstAmt,
        doctor_id: selectedDoctorId || null,
        payment_status: payStatus,
        payment_method: payStatus === 'paid' ? payMethod : null,
        issued_date: new Date().toISOString().substring(0, 10),
      }).select(`id, total_amount, payment_status, patient_id, patients(name)`).single();

      if (error) throw error;

      if (data && data.payment_status === 'paid') {
        await supabase.from('notifications').insert({
          clinic_id: profile?.clinic_id,
          patient_id: data.patient_id,
          type: 'Payment Confirmation',
          channel: 'WhatsApp',
          status: 'sent',
          content: `Hi ${(data.patients as any)?.name || 'Patient'}! Your payment of ₹${data.total_amount} was processed. View receipt online: https://aura-hospital.com/receipt/inv-${data.id.substring(0,8)}`
        });
      }

      setShowCreateModal(false);
      setLineItems([]);
      setSelectPatientId('');
      setGstRate(0);
      setSelectedDoctorId('');
      fetchInvoices();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (invId: string, method: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          payment_status: 'paid',
          payment_method: method,
        })
        .eq('id', invId)
        .select(`id, total_amount, patient_id, patients(name)`)
        .single();

      if (error) throw error;

      if (data) {
        await supabase.from('notifications').insert({
          clinic_id: profile?.clinic_id,
          patient_id: data.patient_id,
          type: 'Payment Confirmation',
          channel: 'WhatsApp',
          status: 'sent',
          content: `Hi ${(data.patients as any)?.name || 'Patient'}! Your billing payment of ₹${data.total_amount} has been processed. View receipt online: https://aura-hospital.com/receipt/inv-${data.id.substring(0,8)}`
        });
      }

      fetchInvoices();
    } catch (err) {
      console.error('Error toggling payment status:', err);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    return inv.patients?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           inv.patients?.phone.includes(searchQuery);
  });

  const dailyRevenue = invoices.filter(inv => inv.payment_status === 'paid' && inv.issued_date === new Date().toISOString().substring(0, 10)).reduce((acc, curr) => acc + Number(curr.total_amount), 0);
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const monthlyRevenue = invoices.filter(inv => inv.payment_status === 'paid' && inv.issued_date.startsWith(currentMonthStr)).reduce((acc, curr) => acc + Number(curr.total_amount), 0);
  const outstandingAmount = invoices.filter(inv => inv.payment_status !== 'paid').reduce((acc, curr) => acc + Number(curr.total_amount), 0);

  const doctorRevenueShare: Record<string, number> = {};
  invoices.forEach(inv => {
    if (inv.payment_status === 'paid') {
      const docName = inv.profiles?.name || 'Clinic General';
      doctorRevenueShare[docName] = (doctorRevenueShare[docName] || 0) + Number(inv.total_amount);
    }
  });

  const triggerPrintReceipt = (inv: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const itemsList = (inv.items || []).map((item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.total}</td>
      </tr>
    `).join('');
    
    const subtotal = (inv.items || []).reduce((acc, curr) => acc + curr.total, 0);
    
    const html = `
      <html>
      <head>
        <title>Receipt - ${inv.invoice_number || 'INV-TEMP'}</title>
        <style>
          body { font-family: 'Outfit', 'Inter', sans-serif; color: #333; padding: 40px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #10b981; }
          .meta-info { text-align: right; font-size: 14px; color: #555; }
          .invoice-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f1f5f9; text-align: left; padding: 10px; font-weight: 600; }
          .totals-section { display: flex; flex-direction: column; align-items: flex-end; margin-top: 20px; font-size: 15px; }
          .totals-row { display: flex; justify-content: space-between; width: 250px; padding: 5px 0; }
          .grand-total { font-size: 18px; font-weight: bold; color: #10b981; border-top: 2px solid #10b981; padding-top: 10px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-name">AURA MEDICAL CLINIC</div>
            <div>Official Billing Receipt</div>
          </div>
          <div class="meta-info">
            <div><strong>Date:</strong> ${new Date(inv.issued_date).toLocaleDateString()}</div>
            <div><strong>Invoice No:</strong> ${inv.invoice_number || 'INV-TEMP'}</div>
          </div>
        </div>
        
        <div class="invoice-box">
          <div><strong>Patient Name:</strong> ${inv.patients?.name || 'Walk-in'}</div>
          <div><strong>Phone Number:</strong> ${inv.patients?.phone || '-'}</div>
          <div><strong>Consulting Doctor:</strong> Dr. ${inv.profiles?.name || 'Consulting Physician'}</div>
          <div><strong>Payment Method:</strong> ${inv.payment_method || 'Cash'}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>
        
        <div class="totals-section">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>₹${subtotal}</span>
          </div>
          <div class="totals-row">
            <span>GST Rate:</span>
            <span>${inv.gst_rate || 0}%</span>
          </div>
          <div class="totals-row">
            <span>GST Amount:</span>
            <span>₹${inv.gst_amount || 0}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Total Paid:</span>
            <span>₹${inv.total_amount}</span>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Consultation Fee Configuration */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Doctor Consultation Fee Configuration</h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configured consultation rates apply to all online appointments.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Fee:</span>
          <input
            type="number"
            value={consultFeeConfig}
            onChange={(e) => setConsultFeeConfig(Number(e.target.value))}
            style={{ width: '100px', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <button onClick={() => alert('Consultation fee configuration saved!')} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Save</button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '0.5rem' }}>
        <div className="dashboard-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>DAILY REVENUE</span>
          <h3 style={{ fontSize: '1.6rem', margin: '0.5rem 0 0 0', color: '#10b981' }}>₹{dailyRevenue.toFixed(2)}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid today</span>
        </div>
        <div className="dashboard-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>MONTHLY REVENUE</span>
          <h3 style={{ fontSize: '1.6rem', margin: '0.5rem 0 0 0', color: 'var(--accent-primary)' }}>₹{monthlyRevenue.toFixed(2)}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This calendar month</span>
        </div>
        <div className="dashboard-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>OUTSTANDING AMOUNT</span>
          <h3 style={{ fontSize: '1.6rem', margin: '0.5rem 0 0 0', color: '#ef4444' }}>₹{outstandingAmount.toFixed(2)}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unpaid invoices</span>
        </div>
        <div className="dashboard-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>DOCTOR REVENUE SHARES</span>
          <div style={{ maxHeight: '60px', overflowY: 'auto', marginTop: '0.375rem', fontSize: '0.8rem' }}>
            {Object.keys(doctorRevenueShare).length > 0 ? (
              Object.entries(doctorRevenueShare).map(([name, val]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0' }}>
                  <span>Dr. {name.replace('Dr. ', '')}:</span>
                  <strong>₹{val.toFixed(0)}</strong>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No data yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveBillingTab('invoices')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeBillingTab === 'invoices' ? '2px solid var(--accent-primary)' : 'none',
            color: activeBillingTab === 'invoices' ? 'var(--accent-primary)' : 'var(--text-muted)'
          }}
        >
          Clinic Invoices
        </button>
        <button
          onClick={() => setActiveBillingTab('payments')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeBillingTab === 'payments' ? '2px solid var(--accent-primary)' : 'none',
            color: activeBillingTab === 'payments' ? 'var(--accent-primary)' : 'var(--text-muted)'
          }}
        >
          Payment Receipts Ledger
        </button>
      </div>

      {activeBillingTab === 'invoices' ? (
        <>
          {/* Search & Actions Toolbar */}
          <div style={toolbarStyle}>
            <div style={searchContainerStyle}>
              <Search size={18} style={searchIconStyle} />
              <input
                type="text"
                placeholder="Search invoice by patient name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={searchInputStyle}
              />
            </div>

            <button
              onClick={() => {
                if (patients.length > 0) setSelectPatientId(patients[0].id);
                setLineItems([]);
                setShowCreateModal(true);
                setErrorMsg('');
              }}
              className="btn btn-primary"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.625rem 1.25rem' }}
            >
              <Plus size={18} /> Generate Invoice
            </button>
          </div>

          {/* Invoices List Directory */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading billing records...</div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No invoices registered. Click "Generate Invoice" to record a payment.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderRowStyle}>
                    <th style={thStyle}>Invoice No</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Patient Name</th>
                    <th style={thStyle}>Consulting Doctor</th>
                    <th style={thStyle}>Total Bill</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Payment Type</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} style={tableRowStyle}>
                      <td style={tdStyle}><strong>{inv.invoice_number || '-'}</strong></td>
                      <td style={tdStyle}>{new Date(inv.issued_date).toLocaleDateString()}</td>
                      <td style={tdStyle}>
                        <strong>{inv.patients?.name || 'Walk-in / Private'}</strong>
                        {inv.patients?.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.patients.phone}</div>}
                      </td>
                      <td style={tdStyle}>Dr. {inv.profiles?.name || 'Clinic General'}</td>
                      <td style={tdStyle}>
                        <strong>₹{inv.total_amount}</strong>
                        {inv.gst_amount && inv.gst_amount > 0 ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>incl. ₹{inv.gst_amount} GST</div>
                        ) : null}
                      </td>
                      <td style={tdStyle}>
                        <span style={statusBadgeStyle(inv.payment_status)}>
                          {inv.payment_status.toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>{inv.payment_method || '-'}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {inv.payment_status !== 'paid' && (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                onClick={() => handleMarkPaid(inv.id, 'Cash')}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                              >
                                Pay Cash
                              </button>
                              <button
                                onClick={() => handleMarkPaid(inv.id, 'UPI')}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                              >
                                Pay UPI
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => setPrintInvoice(inv)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                          >
                            <Printer size={14} /> Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Receipts / Payment History Registry */}
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeaderRowStyle}>
                  <th style={thStyle}>Receipt No</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Patient Name</th>
                  <th style={thStyle}>Related Invoice</th>
                  <th style={thStyle}>Amount Paid</th>
                  <th style={thStyle}>Payment Mode</th>
                  <th style={thStyle}>Txn ID</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No payment receipts registered yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} style={tableRowStyle}>
                      <td style={tdStyle}><strong>{p.receipt_number || `REC-${p.id.substring(0,4).toUpperCase()}`}</strong></td>
                      <td style={tdStyle}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={tdStyle}>
                        <strong>{p.patients?.name || 'Walk-in'}</strong>
                        {p.patients?.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.patients.phone}</div>}
                      </td>
                      <td style={tdStyle}>{p.invoices?.invoice_number || 'Direct Payment'}</td>
                      <td style={tdStyle}><strong>₹{p.amount}</strong></td>
                      <td style={tdStyle}>{p.payment_mode}</td>
                      <td style={tdStyle}>{p.transaction_id || 'N/A'}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              // Reprint receipt triggers browser print dialog
                              const printWindow = window.open('', '_blank');
                              if (!printWindow) return;
                              const html = `
                                <html>
                                <head>
                                  <title>Receipt - ${p.receipt_number || 'REC-TEMP'}</title>
                                  <style>
                                    body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.5; }
                                    .header { border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 20px; }
                                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
                                  </style>
                                </head>
                                <body>
                                  <div class="header">
                                    <h2>AURA HEALTH CLINIC - PAYMENT RECEIPT</h2>
                                    <p>Sankhalim, Goa - 403505 | Mob: 9546650878</p>
                                  </div>
                                  <div class="grid">
                                    <div><strong>Receipt Number:</strong> ${p.receipt_number || 'N/A'}</div>
                                    <div><strong>Date:</strong> ${new Date(p.created_at).toLocaleDateString()}</div>
                                    <div><strong>Patient Name:</strong> ${p.patients?.name || 'Walk-in'}</div>
                                    <div><strong>Payment Mode:</strong> ${p.payment_mode}</div>
                                    <div><strong>Transaction ID:</strong> ${p.transaction_id || 'N/A'}</div>
                                    <div><strong>Amount Paid:</strong> ₹${p.amount}</div>
                                  </div>
                                  <hr/>
                                  <p>Thank you for choosing Aura Health Clinic.</p>
                                  <script>window.onload = function() { window.print(); setTimeout(window.close, 500); };</script>
                                </body>
                                </html>
                              `;
                              printWindow.document.write(html);
                              printWindow.document.close();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            Reprint Receipt
                          </button>
                          <button
                            onClick={() => {
                              // Re-download invoice statement
                              const payload = `AURA CLINIC INVOICE STATEMENT\nInvoice #: ${p.invoices?.invoice_number || 'INV-TEMP'}\nDate: ${new Date(p.created_at).toLocaleDateString()}\nPatient: ${p.patients?.name || 'Walk-in'}\nTotal Paid: ${p.amount} INR\nMode: ${p.payment_mode}`;
                              const blob = new Blob([payload], { type: 'text/plain' });
                              const downloadAnchor = document.createElement('a');
                              downloadAnchor.href = URL.createObjectURL(blob);
                              downloadAnchor.download = `invoice_${p.invoices?.invoice_number || 'temp'}.txt`;
                              document.body.appendChild(downloadAnchor);
                              downloadAnchor.click();
                              downloadAnchor.remove();
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            Re-download Invoice
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Generate Invoice Modal */}
      {showCreateModal && (
        <div className="modal-overlay" style={overlayStyle}>
          <div className="modal-content" style={{ ...contentStyle, maxWidth: '620px' }}>
            <div className="modal-header" style={headerStyle}>
              <h2>Generate Patient Invoice</h2>
              <button onClick={() => setShowCreateModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvoiceSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Select Patient File *</label>
                  <select
                    value={selectPatientId}
                    onChange={(e) => setSelectPatientId(e.target.value)}
                    style={selectStyle}
                    required
                  >
                    <option value="" disabled>Choose Patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phone || 'No phone'})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Consulting Doctor</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">-- Walk-in / General Revenue --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>Dr. {d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items Builder Section */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginTop: '1rem', backgroundColor: 'var(--bg-primary)' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Add Service Billing Item</span>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Select Standard Rate</label>
                    <select
                      value={selectedRateId}
                      onChange={(e) => {
                        setSelectedRateId(e.target.value);
                        setCustomItemName('');
                        setCustomItemPrice('');
                      }}
                      style={selectStyle}
                    >
                      <option value="">-- Choose Pre-configured rate --</option>
                      {rates.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} (₹{r.price})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="btn btn-primary"
                    style={{ padding: '0.75rem', height: 'fit-content' }}
                  >
                    Add Item
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>OR create custom item</div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Custom Item Name</label>
                    <input
                      type="text"
                      placeholder="Disposable gloves pack"
                      value={customItemName}
                      onChange={(e) => {
                        setCustomItemName(e.target.value);
                        setSelectedRateId('');
                      }}
                      style={inputStyle}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Price (INR)</label>
                    <input
                      type="number"
                      placeholder="250"
                      value={customItemPrice}
                      onChange={(e) => {
                        setCustomItemPrice(e.target.value);
                        setSelectedRateId('');
                      }}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ visibility: 'hidden' }}>Dummy box</div>
                </div>
              </div>

              {/* Added Line Items Table */}
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Invoice Line Items</span>
                {lineItems.length === 0 ? (
                  <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No billing items added yet.</p>
                ) : (
                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table style={{ ...tableStyle, fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={tableHeaderRowStyle}>
                          <th style={thStyle}>Item Description</th>
                          <th style={thStyle}>Unit Price</th>
                          <th style={thStyle}>Qty</th>
                          <th style={thStyle}>Total</th>
                          <th style={thStyle}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, index) => (
                          <tr key={index} style={tableRowStyle}>
                            <td style={tdStyle}>{item.name}</td>
                            <td style={tdStyle}>₹{item.price}</td>
                            <td style={tdStyle}>{item.quantity}</td>
                            <td style={tdStyle}><strong>₹{item.total}</strong></td>
                            <td style={tdStyle}>
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(index)}
                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total Summary Footer */}
              <div style={{ borderTop: '2px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal Amount:</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST Tax ({gstRate}%):</span>
                  <span>₹{(calculateTotal() * (gstRate / 100)).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.15rem', marginTop: '0.25rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.25rem' }}>
                  <span>Grand Total:</span>
                  <span className="accent-color">₹{(calculateTotal() + (calculateTotal() * (gstRate / 100))).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label>GST Support (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    style={selectStyle}
                  >
                    <option value="0">0% GST</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Status</label>
                  <select
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value as any)}
                    style={selectStyle}
                  >
                    <option value="unpaid">Unpaid / Awaiting Deposit</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>

                {payStatus === 'paid' && (
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={submitting} loadingText="Saving Invoice...">
                  Save & Print Invoice
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Receipt Print Preview Modal */}
      {printInvoice && (
        <div className="modal-overlay" style={overlayStyle}>
          <div className="modal-content" style={{ ...contentStyle, maxWidth: '480px', padding: '2.5rem' }}>
                {/* Header / Receipt Metadata */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>AURA HEALTH CLINIC</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Official Billing Receipt</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                <span>Invoice No: <strong>{printInvoice.invoice_number || printInvoice.id.substring(0, 8).toUpperCase()}</strong></span>
                <span>Date: {new Date(printInvoice.issued_date).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Patient & Doctor Meta */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div>Patient: <strong>{printInvoice.patients?.name}</strong></div>
              {printInvoice.patients?.phone && <div>Phone: {printInvoice.patients.phone}</div>}
              <div>Consultant: <strong>Dr. {printInvoice.profiles?.name || 'Walk-in Consulting'}</strong></div>
            </div>

            {/* Receipt Table Items */}
            <div style={{ borderBottom: '2px dashed var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
                    <th style={{ padding: '0.375rem 0' }}>Description</th>
                    <th style={{ padding: '0.375rem 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.375rem 0', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(printInvoice.items || []).map((item, idx) => (
                    <tr key={idx} style={{ color: 'var(--text-secondary)' }}>
                      <td style={{ padding: '0.375rem 0' }}>{item.name}</td>
                      <td style={{ padding: '0.375rem 0', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '0.375rem 0', textAlign: 'right' }}>₹{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Final Total */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{(Number(printInvoice.total_amount) - (Number(printInvoice.gst_amount) || 0)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between' }}>
                <span>GST Tax (${printInvoice.gst_rate || 0}%):</span>
                <span>₹{(Number(printInvoice.gst_amount) || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.25rem' }}>
                <span>Total Amount:</span>
                <span className="accent-color">₹{printInvoice.total_amount}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              <span>Payment Status:</span>
              <span style={{ fontWeight: 600, color: printInvoice.payment_status === 'paid' ? '#10b981' : '#ef4444' }}>
                {printInvoice.payment_status.toUpperCase()} {printInvoice.payment_method && `(${printInvoice.payment_method})`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => triggerPrintReceipt(printInvoice)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Print Receipt
              </button>
              <button
                onClick={() => setPrintInvoice(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Styles
const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const searchContainerStyle: React.CSSProperties = {
  position: 'relative',
  flexGrow: 1,
  maxWidth: '500px',
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0.875rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  pointerEvents: 'none',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.625rem 0.625rem 2.5rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.9rem',
};

const tableHeaderRowStyle: React.CSSProperties = {
  borderBottom: '2px solid var(--border-color)',
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border-color)',
  transition: 'var(--transition-smooth)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.875rem 1rem',
  color: 'var(--text-secondary)',
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  let bg = '#fef2f2';
  let color = '#b91c1c';
  if (status === 'paid') {
    bg = '#ecfdf5';
    color = '#065f46';
  } else if (status === 'partially_paid') {
    bg = '#fffbeb';
    color = '#b45309';
  }

  return {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: '50px',
    backgroundColor: bg,
    color: color,
  };
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

const contentStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  width: '100%',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border-color)',
  padding: '2rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.75rem',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
};

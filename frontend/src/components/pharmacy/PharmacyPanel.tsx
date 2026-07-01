import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Trash2, Edit, X, Clipboard, Package, Calendar, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { validateMedicine, validateDispensation } from './pharmacyValidation';

interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  sku: string | null;
  batch_no: string | null;
  expiry_date: string;
  stock_qty: number;
  price_per_unit: number;
}

interface Dispensation {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  items: Array<{ medicine_id: string; name: string; qty: number; price_per_unit: number }>;
  total_price: number;
  status: 'pending' | 'dispensed' | 'cancelled';
  created_at: string;
  patients: { name: string; phone: string } | null;
  profiles: { name: string } | null;
}

export const PharmacyPanel: React.FC = () => {
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'dispensations'>('inventory');
  
  // Inventory states
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'Out' | 'Expired'>('All');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;
  
  // Dispensation states
  const [dispensations, setDispensations] = useState<Dispensation[]>([]);
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [patientsList, setPatientsList] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [doctorsList, setDoctorsList] = useState<{ id: string; name: string }[]>([]);
  
  // Modal states for Medicine CRUD
  const [showMedModal, setShowMedModal] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [medName, setMedName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [sku, setSku] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [stockQty, setStockQty] = useState('0');
  const [pricePerUnit, setPricePerUnit] = useState('0');
  const [medSubmitting, setMedSubmitting] = useState(false);
  const [medErrors, setMedErrors] = useState<Record<string, string>>({});
  const [medErrorMsg, setMedErrorMsg] = useState('');
  
  // Modal states for Dispensing
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [dispensePatientId, setDispensePatientId] = useState('');
  const [dispenseDoctorId, setDispenseDoctorId] = useState('');
  const [dispenseItems, setDispenseItems] = useState<Array<{ medicine_id: string; name: string; qty: number; price_per_unit: number; max_stock: number }>>([]);
  const [selectedAddMedId, setSelectedAddMedId] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [dispenseSubmitting, setDispenseSubmitting] = useState(false);
  const [dispenseErrors, setDispenseErrors] = useState<Record<string, string>>({});
  const [dispenseErrorMsg, setDispenseErrorMsg] = useState('');

  // Fetch medicines catalog
  const fetchMedicines = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;
      let dbQuery = supabase
        .from('pharmacy_medicines')
        .select('*', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      if (searchQuery.trim()) {
        dbQuery = dbQuery.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
      }

      const todayStr = new Date().toISOString().split('T')[0];

      if (stockFilter === 'Low') {
        dbQuery = dbQuery.gt('stock_qty', 0).lt('stock_qty', 20);
      } else if (stockFilter === 'Out') {
        dbQuery = dbQuery.eq('stock_qty', 0);
      } else if (stockFilter === 'Expired') {
        dbQuery = dbQuery.lt('expiry_date', todayStr);
      }

      const { data, error, count } = await dbQuery
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      setMedicines(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id, currentPage, searchQuery, stockFilter]);

  // Fetch dispensations logs
  const fetchDispensations = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setDispenseLoading(true);
    try {
      let dbQuery = supabase
        .from('pharmacy_dispensations')
        .select(`
          *,
          patients (name, phone),
          profiles (name)
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false });

      const { data, error } = await dbQuery;
      if (error) throw error;
      setDispensations((data || []) as any[]);
    } catch (err) {
      console.error('Error fetching dispensations:', err);
    } finally {
      setDispenseLoading(false);
    }
  }, [profile?.clinic_id]);

  // Fetch dropdown lists (patients, doctors)
  const fetchFormDropdowns = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data: patients } = await supabase
        .from('patients')
        .select('id, name, phone')
        .eq('clinic_id', profile.clinic_id)
        .order('name', { ascending: true });
      setPatientsList(patients || []);

      const { data: doctors } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setDoctorsList(doctors || []);
    } catch (err) {
      console.error('Error fetching form dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  useEffect(() => {
    if (activeTab === 'dispensations') {
      fetchDispensations();
      fetchFormDropdowns();
    }
  }, [activeTab, fetchDispensations]);

  const handleOpenAddMed = () => {
    setSelectedMed(null);
    setMedName('');
    setGenericName('');
    setSku('');
    setBatchNo('');
    setExpiryDate('');
    setStockQty('0');
    setPricePerUnit('0');
    setMedErrors({});
    setMedErrorMsg('');
    setShowMedModal(true);
  };

  const handleOpenEditMed = (med: Medicine) => {
    setSelectedMed(med);
    setMedName(med.name);
    setGenericName(med.generic_name || '');
    setSku(med.sku || '');
    setBatchNo(med.batch_no || '');
    setExpiryDate(med.expiry_date);
    setStockQty(med.stock_qty.toString());
    setPricePerUnit(med.price_per_unit.toString());
    setMedErrors({});
    setMedErrorMsg('');
    setShowMedModal(true);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setMedErrors({});
    setMedErrorMsg('');

    const qty = parseInt(stockQty) || 0;
    const price = parseFloat(pricePerUnit) || 0;

    const validation = validateMedicine({
      name: medName,
      expiryDate,
      stockQty: qty,
      pricePerUnit: price
    });

    if (!validation.isValid) {
      setMedErrors(validation.errors);
      return;
    }

    setMedSubmitting(true);

    try {
      const payload = {
        clinic_id: profile?.clinic_id,
        name: medName.trim(),
        generic_name: genericName.trim() || null,
        sku: sku.trim() || null,
        batch_no: batchNo.trim() || null,
        expiry_date: expiryDate,
        stock_qty: qty,
        price_per_unit: price
      };

      if (selectedMed) {
        const { error } = await supabase
          .from('pharmacy_medicines')
          .update(payload)
          .eq('id', selectedMed.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pharmacy_medicines')
          .insert(payload);
        if (error) throw error;
      }

      setShowMedModal(false);
      fetchMedicines();
    } catch (err: any) {
      setMedErrorMsg(err.message || 'Failed to save medicine catalog.');
    } finally {
      setMedSubmitting(false);
    }
  };

  const handleDeleteMedicine = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name} from inventory?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('pharmacy_medicines')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchMedicines();
    } catch (err: any) {
      alert(err.message || 'Failed to delete medicine.');
    }
  };

  // Dispensing items handlers
  const handleAddItemToDispensation = () => {
    if (!selectedAddMedId) return;
    const med = medicines.find(m => m.id === selectedAddMedId);
    if (!med) return;

    const qty = parseInt(addQty) || 1;
    if (qty > med.stock_qty) {
      alert(`Cannot dispense ${qty} units. Only ${med.stock_qty} in stock.`);
      return;
    }

    // Check if item already added
    const existing = dispenseItems.find(i => i.medicine_id === med.id);
    if (existing) {
      alert('Medication already added to list.');
      return;
    }

    setDispenseItems(prev => [
      ...prev,
      {
        medicine_id: med.id,
        name: med.name,
        qty,
        price_per_unit: med.price_per_unit,
        max_stock: med.stock_qty
      }
    ]);
    setSelectedAddMedId('');
    setAddQty('1');
  };

  const handleRemoveDispenseItem = (idx: number) => {
    setDispenseItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispenseErrors({});
    setDispenseErrorMsg('');

    const validation = validateDispensation({
      patientId: dispensePatientId,
      items: dispenseItems.map(i => ({
        medicineId: i.medicine_id,
        name: i.name,
        qty: i.qty,
        pricePerUnit: i.price_per_unit
      }))
    });

    if (!validation.isValid) {
      setDispenseErrors(validation.errors);
      return;
    }

    setDispenseSubmitting(true);

    try {
      // 1. Double check stock quantities and deduct them in DB
      for (const item of dispenseItems) {
        const { data: med, error: medError } = await supabase
          .from('pharmacy_medicines')
          .select('stock_qty, name')
          .eq('id', item.medicine_id)
          .single();

        if (medError || !med) throw new Error(`Could not verify inventory for ${item.name}.`);
        if (med.stock_qty < item.qty) {
          throw new Error(`Insufficient inventory for ${item.name}. Available: ${med.stock_qty}`);
        }
      }

      // Deduct stock for each medicine
      for (const item of dispenseItems) {
        const { data: current } = await supabase
          .from('pharmacy_medicines')
          .select('stock_qty')
          .eq('id', item.medicine_id)
          .single();
        const updatedQty = (current?.stock_qty || 0) - item.qty;
        
        const { error: deductErr } = await supabase
          .from('pharmacy_medicines')
          .update({ stock_qty: updatedQty })
          .eq('id', item.medicine_id);
          
        if (deductErr) throw deductErr;
      }

      // 2. Compute total price
      const totalPrice = dispenseItems.reduce((acc, i) => acc + i.qty * i.price_per_unit, 0);

      // 3. Create dispensation
      const { error: dispenseErr } = await supabase
        .from('pharmacy_dispensations')
        .insert({
          clinic_id: profile?.clinic_id,
          patient_id: dispensePatientId,
          doctor_id: dispenseDoctorId || null,
          items: dispenseItems.map(i => ({
            medicine_id: i.medicine_id,
            name: i.name,
            qty: i.qty,
            price_per_unit: i.price_per_unit
          })),
          total_price: totalPrice,
          status: 'dispensed'
        });

      if (dispenseErr) throw dispenseErr;

      // Clean state
      setShowDispenseModal(false);
      setDispensePatientId('');
      setDispenseDoctorId('');
      setDispenseItems([]);
      fetchDispensations();
      fetchMedicines(); // Refresh stock counts in list
    } catch (err: any) {
      setDispenseErrorMsg(err.message || 'Dispensation failed.');
    } finally {
      setDispenseSubmitting(false);
    }
  };

  const handleCancelDispensation = async (disp: Dispensation) => {
    if (!window.confirm('Are you sure you want to cancel this dispensation? The stock will be refunded back to medicines catalog.')) {
      return;
    }
    try {
      // Return stock to catalog
      for (const item of disp.items) {
        const { data: current } = await supabase
          .from('pharmacy_medicines')
          .select('stock_qty')
          .eq('id', item.medicine_id)
          .single();
        const updatedQty = (current?.stock_qty || 0) + item.qty;
        
        await supabase
          .from('pharmacy_medicines')
          .update({ stock_qty: updatedQty })
          .eq('id', item.medicine_id);
      }

      // Mark dispensation status as cancelled
      const { error } = await supabase
        .from('pharmacy_dispensations')
        .update({ status: 'cancelled' })
        .eq('id', disp.id);

      if (error) throw error;
      fetchDispensations();
      fetchMedicines();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel dispensation.');
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* Navigation tabs */}
      <div className="tab-container" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Medicine Inventory
        </button>
        <button
          className={`tab-btn ${activeTab === 'dispensations' ? 'active' : ''}`}
          onClick={() => setActiveTab('dispensations')}
        >
          <Clipboard size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Prescription Dispensing
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Inventory filters/controls */}
          <div style={toolbarStyle}>
            <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap', maxWidth: '800px' }}>
              <div style={searchContainerStyle}>
                <Search size={18} style={searchIconStyle} />
                <input
                  type="text"
                  placeholder="Search medicine by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={searchInputStyle}
                />
              </div>

              <div style={filterContainerStyle}>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  style={filterSelectStyle}
                >
                  <option value="All">All Stock Levels</option>
                  <option value="Low">Low Stock (&lt; 20 units)</option>
                  <option value="Out">Out of Stock</option>
                  <option value="Expired">Expired Batches</option>
                </select>
              </div>
            </div>

            {profile?.role && ['admin', 'staff'].includes(profile.role) && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAddMed}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.625rem 1.25rem' }}
              >
                <Plus size={18} /> Add Medicine Stock
              </button>
            )}
          </div>

          {/* Catalog directory table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading pharmacy catalog...</div>
          ) : medicines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No medications found matching your filters.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Generic Formulation</th>
                      <th style={thStyle}>SKU / Batch</th>
                      <th style={thStyle}>Stock Level</th>
                      <th style={thStyle}>Expiry Date</th>
                      <th style={thStyle}>Price/Unit</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((m) => {
                      const isExpired = new Date(m.expiry_date) < new Date();
                      const isLowStock = m.stock_qty > 0 && m.stock_qty < 20;
                      return (
                        <tr key={m.id} style={tableRowStyle}>
                          <td style={tdStyle}><strong>{m.name}</strong></td>
                          <td style={tdStyle}>{m.generic_name || '-'}</td>
                          <td style={tdStyle}>{m.sku || m.batch_no || '-'}</td>
                          <td style={tdStyle}>
                            {m.stock_qty === 0 ? (
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>Out of Stock</span>
                            ) : isLowStock ? (
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Low: {m.stock_qty} left</span>
                            ) : (
                              <span>{m.stock_qty} units</span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, color: isExpired ? '#ef4444' : 'inherit' }}>
                            {new Date(m.expiry_date).toLocaleDateString()}
                            {isExpired && <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>(Expired)</span>}
                          </td>
                          <td style={tdStyle}>₹{m.price_per_unit}</td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleOpenEditMed(m)}
                                style={{ padding: '0.25rem 0.5rem' }}
                              >
                                <Edit size={14} />
                              </button>
                              {profile?.role === 'admin' && (
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleDeleteMedicine(m.id, m.name)}
                                  style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ef4444', border: 'none', color: '#fff' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={paginationContainerStyle}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {Math.min((currentPage - 1) * limit + 1, totalCount)} to {Math.min(currentPage * limit, totalCount)} of {totalCount} medicines
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={paginationBtnStyle}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    style={paginationBtnStyle}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Dispensing list layout */}
          <div style={toolbarStyle}>
            <h3 style={{ margin: 0 }}>Clinical Dispatched History</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setDispensePatientId('');
                setDispenseDoctorId('');
                setDispenseItems([]);
                setDispenseErrorMsg('');
                setDispenseErrors({});
                setShowDispenseModal(true);
              }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <Clipboard size={18} /> Dispense Prescription
            </button>
          </div>

          {dispenseLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading logs...</div>
          ) : dispensations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No dispensations recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeaderRowStyle}>
                    <th style={thStyle}>Date & Time</th>
                    <th style={thStyle}>Patient Name</th>
                    <th style={thStyle}>Prescribed By</th>
                    <th style={thStyle}>Dispensed Items</th>
                    <th style={thStyle}>Cost Total</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dispensations.map((d) => (
                    <tr key={d.id} style={tableRowStyle}>
                      <td style={tdStyle}>{new Date(d.created_at).toLocaleString()}</td>
                      <td style={tdStyle}><strong>{d.patients?.name || 'Unknown'}</strong></td>
                      <td style={tdStyle}>Dr. {d.profiles?.name || 'Self-prescribed'}</td>
                      <td style={tdStyle}>
                        <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.85rem' }}>
                          {d.items.map((i, idx) => (
                            <li key={idx}>{i.name} ({i.qty} units)</li>
                          ))}
                        </ul>
                      </td>
                      <td style={tdStyle}>₹{d.total_price}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '50px', backgroundColor: d.status === 'dispensed' ? '#ecfdf5' : '#fee2e2', color: d.status === 'dispensed' ? '#065f46' : '#b91c1c', fontWeight: 600 }}>
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {d.status === 'dispensed' && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleCancelDispensation(d)}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Cancel & Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Medicine Modal */}
      {showMedModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>{selectedMed ? 'Modify Inventory Record' : 'Add Medication Stock'}</h2>
              <button onClick={() => setShowMedModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {medErrorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{medErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveMedicine} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Trade Name *"
                    icon={Package}
                    type="text"
                    placeholder="Paracetamol"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    disabled={medSubmitting}
                    required
                  />
                  {medErrors.name && <span style={errorLabelStyle}>{medErrors.name}</span>}
                </div>
                <div className="form-group">
                  <AuthInput
                    label="Generic Formulation"
                    icon={Package}
                    type="text"
                    placeholder="Acetaminophen"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    disabled={medSubmitting}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="SKU Code"
                    icon={Package}
                    type="text"
                    placeholder="SKU-123"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    disabled={medSubmitting}
                  />
                </div>
                <div className="form-group">
                  <AuthInput
                    label="Batch Number"
                    icon={Clipboard}
                    type="text"
                    placeholder="BAT-99"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    disabled={medSubmitting}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Expiry Date *"
                    icon={Calendar}
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    disabled={medSubmitting}
                    required
                  />
                  {medErrors.expiryDate && <span style={errorLabelStyle}>{medErrors.expiryDate}</span>}
                </div>
                <div className="form-group">
                  <AuthInput
                    label="Stock Quantity *"
                    icon={Package}
                    type="number"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    disabled={medSubmitting}
                    required
                  />
                  {medErrors.stockQty && <span style={errorLabelStyle}>{medErrors.stockQty}</span>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <AuthInput
                  label="Unit Price (₹) *"
                  icon={DollarSign}
                  type="number"
                  step="0.01"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  disabled={medSubmitting}
                  required
                />
                {medErrors.pricePerUnit && <span style={errorLabelStyle}>{medErrors.pricePerUnit}</span>}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMedModal(false)}
                  style={{ flex: 1 }}
                  disabled={medSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={medSubmitting} loadingText="Saving...">
                  Save Medication
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispense Medication Modal */}
      {showDispenseModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={{ ...modalContentStyle, maxWidth: '600px' }}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Dispense Prescription</h2>
              <button onClick={() => setShowDispenseModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {dispenseErrorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{dispenseErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleDispenseSubmit} className="auth-form" noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={labelStyle}>Select Patient *</label>
                  <select
                    value={dispensePatientId}
                    onChange={(e) => setDispensePatientId(e.target.value)}
                    style={selectStyle}
                    disabled={dispenseSubmitting}
                  >
                    <option value="">-- Select Patient --</option>
                    {patientsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                    ))}
                  </select>
                  {dispenseErrors.patientId && <span style={errorLabelStyle}>{dispenseErrors.patientId}</span>}
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Prescribed By Doctor</label>
                  <select
                    value={dispenseDoctorId}
                    onChange={(e) => setDispenseDoctorId(e.target.value)}
                    style={selectStyle}
                    disabled={dispenseSubmitting}
                  >
                    <option value="">-- Self / Walk-in Prescription --</option>
                    {doctorsList.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Item Adder */}
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', backgroundColor: 'var(--bg-primary)' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Add Dispensing Item</h4>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div style={{ flexGrow: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select Medicine</label>
                    <select
                      value={selectedAddMedId}
                      onChange={(e) => setSelectedAddMedId(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">-- Select Medicine (Available stock) --</option>
                      {medicines
                        .filter(m => m.stock_qty > 0)
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name} (Stock: {m.stock_qty} - ₹{m.price_per_unit}/u)</option>
                        ))}
                    </select>
                  </div>
                  <div style={{ width: '80px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={addQty}
                      onChange={(e) => setAddQty(e.target.value)}
                      style={searchInputStyle}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddItemToDispensation}
                    style={{ padding: '0.625rem 1rem' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Added Items List */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Selected Medicines list</h4>
                {dispenseItems.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', border: '1px dashed var(--border-color)' }}>
                    No medicines added to dispensing order yet.
                  </p>
                ) : (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    {dispenseItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: idx < dispenseItems.length - 1 ? '1px solid var(--border-color)' : 'none', fontSize: '0.875rem' }}>
                        <div>
                          <strong>{item.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{item.price_per_unit} per unit</div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span>Qty: {item.qty} (₹{item.qty * item.price_per_unit})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDispenseItem(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {dispenseErrors.items && <span style={errorLabelStyle}>{dispenseErrors.items}</span>}
              </div>

              {/* Total Calculation Display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                <strong>Order Total Price:</strong>
                <strong style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>
                  ₹{dispenseItems.reduce((acc, i) => acc + i.qty * i.price_per_unit, 0).toFixed(2)}
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDispenseModal(false)}
                  style={{ flex: 1 }}
                  disabled={dispenseSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={dispenseSubmitting} loadingText="Dispensing...">
                  Dispense Order
                </AuthButton>
              </div>
            </form>
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
  marginBottom: '1rem'
};

const searchContainerStyle: React.CSSProperties = {
  position: 'relative',
  flexGrow: 2,
  minWidth: '220px',
  maxWidth: '450px'
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0.875rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
  pointerEvents: 'none'
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.625rem 0.625rem 2.5rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none'
};

const filterContainerStyle: React.CSSProperties = {
  position: 'relative',
  minWidth: '180px'
};

const filterSelectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  cursor: 'pointer'
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '0.9rem'
};

const tableHeaderRowStyle: React.CSSProperties = {
  borderBottom: '2px solid var(--border-color)'
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontWeight: 600,
  color: 'var(--text-primary)'
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border-color)',
  transition: 'var(--transition-smooth)'
};

const tdStyle: React.CSSProperties = {
  padding: '0.875rem 1rem',
  color: 'var(--text-secondary)'
};

const modalOverlayStyle: React.CSSProperties = {
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
  backdropFilter: 'blur(4px)'
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  width: '100%',
  maxWidth: '500px',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border-color)',
  padding: '2rem'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '0.75rem'
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: 500,
  fontSize: '0.875rem'
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.9rem'
};

const paginationContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '1.5rem',
  flexWrap: 'wrap',
  gap: '1rem'
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const errorLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#ef4444',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
  fontWeight: 500
};

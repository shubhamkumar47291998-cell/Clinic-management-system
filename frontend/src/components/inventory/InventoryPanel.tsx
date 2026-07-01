import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Trash2, Edit, X, Clipboard, Package, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthInput } from '../auth/AuthInput';
import { AuthButton } from '../auth/AuthButton';
import { validateInventoryItem, validateInventoryTransaction } from './inventoryValidation';

interface InventoryItem {
  id: string;
  name: string;
  category: 'supplies' | 'equipment' | 'consumables' | 'office';
  stock_qty: number;
  min_stock_alert: number;
  price_per_unit: number;
}

interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  notes: string | null;
  created_at: string;
  inventory_items: { name: string; category: string } | null;
}

export const InventoryPanel: React.FC = () => {
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
  
  // Inventory tab states
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStateFilter, setStockStateFilter] = useState<'All' | 'Alert' | 'Out'>('All');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;
  
  // Transactions tab states
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  
  // Modal states for Item CRUD
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<'supplies' | 'equipment' | 'consumables' | 'office'>('supplies');
  const [itemStock, setItemStock] = useState('0');
  const [itemAlert, setItemAlert] = useState('5');
  const [itemPrice, setItemPrice] = useState('0');
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [itemErrorMsg, setItemErrorMsg] = useState('');
  
  // Modal states for adding stock transactions
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedTxItem, setSelectedTxItem] = useState<InventoryItem | null>(null);
  const [txType, setTxType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [txQty, setTxQty] = useState('1');
  const [txNotes, setTxNotes] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [txErrors, setTxErrors] = useState<Record<string, string>>({});
  const [txErrorMsg, setTxErrorMsg] = useState('');

  // Fetch inventory catalog
  const fetchItems = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;
      let dbQuery = supabase
        .from('inventory_items')
        .select('*', { count: 'exact' })
        .eq('clinic_id', profile.clinic_id);

      if (searchQuery.trim()) {
        dbQuery = dbQuery.ilike('name', `%${searchQuery}%`);
      }

      if (categoryFilter !== 'All') {
        dbQuery = dbQuery.eq('category', categoryFilter);
      }

      const { data, error, count } = await dbQuery
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      let filteredData = data || [];
      if (stockStateFilter === 'Alert') {
        filteredData = filteredData.filter(i => i.stock_qty <= i.min_stock_alert && i.stock_qty > 0);
      } else if (stockStateFilter === 'Out') {
        filteredData = filteredData.filter(i => i.stock_qty === 0);
      }

      setItems(filteredData);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching inventory catalog:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.clinic_id, currentPage, searchQuery, categoryFilter, stockStateFilter]);

  // Fetch transactions log
  const fetchTransactions = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setTxLoading(true);
    try {
      const offset = (txPage - 1) * limit;
      const { data, error, count } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          inventory_items (name, category)
        `, { count: 'exact' })
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      setTransactions((data || []) as any[]);
      setTxTotal(count || 0);
    } catch (err) {
      console.error('Error fetching inventory transactions logs:', err);
    } finally {
      setTxLoading(false);
    }
  }, [profile?.clinic_id, txPage]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab, fetchTransactions]);

  const handleOpenAddItem = () => {
    setSelectedItem(null);
    setItemName('');
    setItemCategory('supplies');
    setItemStock('0');
    setItemAlert('5');
    setItemPrice('0');
    setItemErrors({});
    setItemErrorMsg('');
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemStock(item.stock_qty.toString());
    setItemAlert(item.min_stock_alert.toString());
    setItemPrice(item.price_per_unit.toString());
    setItemErrors({});
    setItemErrorMsg('');
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemErrors({});
    setItemErrorMsg('');

    const qty = parseInt(itemStock) || 0;
    const alertQty = parseInt(itemAlert) || 0;
    const price = parseFloat(itemPrice) || 0;

    const validation = validateInventoryItem({
      name: itemName,
      category: itemCategory,
      stockQty: qty,
      minStockAlert: alertQty,
      pricePerUnit: price
    });

    if (!validation.isValid) {
      setItemErrors(validation.errors);
      return;
    }

    setItemSubmitting(true);

    try {
      const payload = {
        clinic_id: profile?.clinic_id,
        name: itemName.trim(),
        category: itemCategory,
        stock_qty: qty,
        min_stock_alert: alertQty,
        price_per_unit: price
      };

      if (selectedItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', selectedItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert(payload);
        if (error) throw error;
      }

      setShowItemModal(false);
      fetchItems();
    } catch (err: any) {
      setItemErrorMsg(err.message || 'Failed to save inventory item catalog.');
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from clinic inventory?`)) return;
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Failed to delete inventory item.');
    }
  };

  // Stock transactions submission
  const handleOpenTx = (item: InventoryItem) => {
    setSelectedTxItem(item);
    setTxType('in');
    setTxQty('1');
    setTxNotes('');
    setTxErrors({});
    setTxErrorMsg('');
    setShowTxModal(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxItem) return;
    setTxErrors({});
    setTxErrorMsg('');

    const qty = parseInt(txQty) || 0;
    const validation = validateInventoryTransaction({
      transactionType: txType,
      quantity: qty
    });

    if (!validation.isValid) {
      setTxErrors(validation.errors);
      return;
    }

    setTxSubmitting(true);

    try {
      // Calculate new stock quantity
      let newQty = selectedTxItem.stock_qty;
      if (txType === 'in') {
        newQty += qty;
      } else if (txType === 'out') {
        newQty -= qty;
        if (newQty < 0) throw new Error(`Insufficient stock. Current stock is ${selectedTxItem.stock_qty}`);
      } else if (txType === 'adjustment') {
        newQty = qty;
      }

      // 1. Log transaction
      const { error: txErr } = await supabase
        .from('inventory_transactions')
        .insert({
          clinic_id: profile?.clinic_id,
          item_id: selectedTxItem.id,
          transaction_type: txType,
          quantity: qty,
          notes: txNotes.trim() || null
        });

      if (txErr) throw txErr;

      // 2. Update stock quantity
      const { error: updateErr } = await supabase
        .from('inventory_items')
        .update({ stock_qty: newQty })
        .eq('id', selectedTxItem.id);

      if (updateErr) throw updateErr;

      setShowTxModal(false);
      fetchItems();
    } catch (err: any) {
      setTxErrorMsg(err.message || 'Transaction submission failed.');
    } finally {
      setTxSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const txTotalPages = Math.ceil(txTotal / limit) || 1;

  return (
    <div className="dashboard-card" style={{ padding: '1.5rem' }}>
      
      {/* Navigation tabs */}
      <div className="tab-container" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Inventory Stock Ledger
        </button>
        <button
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <Clipboard size={16} style={{ marginRight: '0.375rem', display: 'inline', verticalAlign: 'middle' }} />
          Stock Transaction logs
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Inventory filters */}
          <div style={toolbarStyle}>
            <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap', maxWidth: '800px' }}>
              <div style={searchContainerStyle}>
                <Search size={18} style={searchIconStyle} />
                <input
                  type="text"
                  placeholder="Search item name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={searchInputStyle}
                />
              </div>

              <div style={filterContainerStyle}>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={filterSelectStyle}
                >
                  <option value="All">All Categories</option>
                  <option value="supplies">Medical Supplies</option>
                  <option value="equipment">Ward Equipment</option>
                  <option value="consumables">Consumables</option>
                  <option value="office">Office Supplies</option>
                </select>
              </div>

              <div style={filterContainerStyle}>
                <select
                  value={stockStateFilter}
                  onChange={(e) => setStockStateFilter(e.target.value as any)}
                  style={filterSelectStyle}
                >
                  <option value="All">All Stock Levels</option>
                  <option value="Alert">Low Stock Alerts</option>
                  <option value="Out">Out of Stock</option>
                </select>
              </div>
            </div>

            {profile?.role && ['admin', 'staff'].includes(profile.role) && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAddItem}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              >
                <Plus size={18} /> Add Catalog Item
              </button>
            )}
          </div>

          {/* Catalog directory table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading inventory definitions...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No inventory catalog items match your search.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Item Name</th>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Stock Level</th>
                      <th style={thStyle}>Alert Minimum</th>
                      <th style={thStyle}>Price/Unit</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const isExpired = i.stock_qty === 0;
                      const isLowStock = i.stock_qty > 0 && i.stock_qty <= i.min_stock_alert;
                      return (
                        <tr key={i.id} style={tableRowStyle}>
                          <td style={tdStyle}><strong>{i.name}</strong></td>
                          <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{i.category}</td>
                          <td style={tdStyle}>
                            {isExpired ? (
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>Out of Stock</span>
                            ) : isLowStock ? (
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Low: {i.stock_qty} left</span>
                            ) : (
                              <span>{i.stock_qty} units</span>
                            )}
                          </td>
                          <td style={tdStyle}>{i.min_stock_alert} units</td>
                          <td style={tdStyle}>₹{i.price_per_unit}</td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleOpenTx(i)}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                              >
                                Transaction
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleOpenEditItem(i)}
                                style={{ padding: '0.25rem 0.5rem' }}
                              >
                                <Edit size={14} />
                              </button>
                              {profile?.role === 'admin' && (
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleDeleteItem(i.id, i.name)}
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
                  Showing {Math.min((currentPage - 1) * limit + 1, totalCount)} to {Math.min(currentPage * limit, totalCount)} of {totalCount} items
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
          {/* Stock Transactions Queue Tab */}
          <div style={toolbarStyle}>
            <h3 style={{ margin: 0 }}>Stock Movement Logs</h3>
          </div>

          {txLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading transaction records...</div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No stock movement logs recorded yet.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Date & Time</th>
                      <th style={thStyle}>Item Name</th>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Action Type</th>
                      <th style={thStyle}>Quantity</th>
                      <th style={thStyle}>Notes / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} style={tableRowStyle}>
                        <td style={tdStyle}>{new Date(tx.created_at).toLocaleString()}</td>
                        <td style={tdStyle}><strong>{tx.inventory_items?.name}</strong></td>
                        <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{tx.inventory_items?.category}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '50px', backgroundColor: tx.transaction_type === 'in' ? '#ecfdf5' : tx.transaction_type === 'out' ? '#fee2e2' : '#e0f2fe', color: tx.transaction_type === 'in' ? '#065f46' : tx.transaction_type === 'out' ? '#b91c1c' : '#0369a1', fontWeight: 600 }}>
                            {tx.transaction_type.toUpperCase()}
                          </span>
                        </td>
                        <td style={tdStyle}>{tx.quantity} units</td>
                        <td style={tdStyle}>{tx.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={paginationContainerStyle}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {Math.min((txPage - 1) * limit + 1, txTotal)} to {Math.min(txPage * limit, txTotal)} of {txTotal} transactions
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={txPage === 1}
                    onClick={() => setTxPage(prev => Math.max(prev - 1, 1))}
                    style={paginationBtnStyle}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>
                    Page {txPage} of {txTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={txPage === txTotalPages}
                    onClick={() => setTxPage(prev => Math.min(prev + 1, txTotalPages))}
                    style={paginationBtnStyle}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>{selectedItem ? 'Modify Item definition' : 'Add Catalog Item'}</h2>
              <button onClick={() => setShowItemModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {itemErrorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{itemErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <AuthInput
                  label="Item Name *"
                  icon={Package}
                  type="text"
                  placeholder="Syringe 5ml"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  disabled={itemSubmitting}
                  required
                />
                {itemErrors.name && <span style={errorLabelStyle}>{itemErrors.name}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Category *</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value as any)}
                  style={selectStyle}
                  disabled={itemSubmitting}
                >
                  <option value="supplies">Medical Supplies</option>
                  <option value="equipment">Ward Equipment</option>
                  <option value="consumables">Consumables</option>
                  <option value="office">Office Supplies</option>
                </select>
                {itemErrors.category && <span style={errorLabelStyle}>{itemErrors.category}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <AuthInput
                    label="Current Stock *"
                    icon={Package}
                    type="number"
                    value={itemStock}
                    onChange={(e) => setItemStock(e.target.value)}
                    disabled={itemSubmitting}
                    required
                  />
                  {itemErrors.stockQty && <span style={errorLabelStyle}>{itemErrors.stockQty}</span>}
                </div>
                <div className="form-group">
                  <AuthInput
                    label="Alert Minimum *"
                    icon={AlertTriangle}
                    type="number"
                    value={itemAlert}
                    onChange={(e) => setItemAlert(e.target.value)}
                    disabled={itemSubmitting}
                    required
                  />
                  {itemErrors.minStockAlert && <span style={errorLabelStyle}>{itemErrors.minStockAlert}</span>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Unit Cost (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  style={searchInputStyle}
                  disabled={itemSubmitting}
                  required
                />
                {itemErrors.pricePerUnit && <span style={errorLabelStyle}>{itemErrors.pricePerUnit}</span>}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowItemModal(false)}
                  style={{ flex: 1 }}
                  disabled={itemSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={itemSubmitting} loadingText="Saving...">
                  Save Item
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transaction Modal */}
      {showTxModal && selectedTxItem && (
        <div className="modal-overlay" style={modalOverlayStyle}>
          <div className="modal-content" style={modalContentStyle}>
            <div className="modal-header" style={modalHeaderStyle}>
              <h2>Stock Transaction: {selectedTxItem.name}</h2>
              <button onClick={() => setShowTxModal(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>

            {txErrorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <span>{txErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleTxSubmit} className="auth-form" noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Action Type *</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  style={selectStyle}
                  disabled={txSubmitting}
                >
                  <option value="in">Restock (+ IN)</option>
                  <option value="out">Dispense (- OUT)</option>
                  <option value="adjustment">Quantity Adjustment (SET)</option>
                </select>
                {txErrors.transactionType && <span style={errorLabelStyle}>{txErrors.transactionType}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <AuthInput
                  label="Quantity *"
                  icon={Package}
                  type="number"
                  min="1"
                  value={txQty}
                  onChange={(e) => setTxQty(e.target.value)}
                  disabled={txSubmitting}
                  required
                />
                {txErrors.quantity && <span style={errorLabelStyle}>{txErrors.quantity}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Notes / Remarks</label>
                <textarea
                  placeholder="Reason for adjustment, restock bill number, etc..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  style={textareaStyle}
                  rows={2}
                  disabled={txSubmitting}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTxModal(false)}
                  style={{ flex: 1 }}
                  disabled={txSubmitting}
                >
                  Cancel
                </button>
                <AuthButton type="submit" loading={txSubmitting} loadingText="Submitting...">
                  Submit Transaction
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
  maxWidth: '480px',
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

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  resize: 'none',
  fontFamily: 'var(--font-family)',
  fontSize: '0.925rem'
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

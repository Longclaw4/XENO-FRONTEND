import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, PlusCircle, Users, Receipt, ShoppingCart, Upload, FileText } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  metadata: {
    favorite_category?: string;
    preferred_channel?: string;
    city?: string;
    age?: number;
  };
  total_orders: number;
  total_spent: number;
}

interface Order {
  id: string;
  customer_name: string;
  amount: number;
  status: string;
  items: string[];
  created_at: string;
}

const parseCSV = (text: string) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseRow = (rowText: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) continue;
    const rowObj: any = {};
    headers.forEach((header, index) => {
      rowObj[header] = cells[index] || '';
    });
    rows.push(rowObj);
  }
  return { headers, rows };
};

const CustomerList: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'shoppers' | 'orders'>('shoppers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showCustModal, setShowCustModal] = useState<boolean>(false);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [csvType, setCsvType] = useState<'shoppers' | 'transactions'>('shoppers');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState<boolean>(false);

  // Customer form state
  const [custName, setCustName] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custCategory, setCustCategory] = useState<string>('Coffee');
  const [custChannel, setCustChannel] = useState<string>('whatsapp');
  const [custCity, setCustCity] = useState<string>('');
  const [custAge, setCustAge] = useState<string>('');

  // Order form state
  const [orderCustId, setOrderCustId] = useState<string>('');
  const [orderAmount, setOrderAmount] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<string>('COMPLETED');
  const [orderItems, setOrderItems] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, ordRes] = await Promise.all([
        axios.get('/api/customers'),
        axios.get('/api/orders')
      ]);
      setCustomers(custRes.data);
      setOrders(ordRes.data);
    } catch (error) {
      console.error('Failed to fetch shoppers/orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set default customer for order creation modal if shoppers are loaded
  useEffect(() => {
    if (customers.length > 0 && !orderCustId) {
      setOrderCustId(customers[0].id);
    }
  }, [customers]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custEmail || !custPhone) {
      alert('Please fill in Name, Email, and Phone');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: custName,
        email: custEmail,
        phone: custPhone,
        metadata: {
          favorite_category: custCategory,
          preferred_channel: custChannel,
          city: custCity || 'Unknown',
          age: custAge ? parseInt(custAge) : 30
        }
      };

      await axios.post('/api/customers', payload);
      
      // Reset forms & states
      setCustName('');
      setCustEmail('');
      setCustPhone('');
      setCustCity('');
      setCustAge('');
      setShowCustModal(false);
      
      // Refresh list
      fetchData();
    } catch (error: any) {
      alert(`Ingestion failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCustId || !orderAmount) {
      alert('Please select a Shopper and specify Amount');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: orderCustId,
        amount: parseFloat(orderAmount),
        status: orderStatus,
        items: orderItems ? orderItems.split(',').map(i => i.trim()).filter(i => i.length > 0) : ['General Purchase']
      };

      await axios.post('/api/orders', payload);

      // Reset
      setOrderAmount('');
      setOrderItems('');
      setShowOrderModal(false);

      // Refresh list
      fetchData();
    } catch (error: any) {
      alert(`Order creation failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset preview data when type changes
  useEffect(() => {
    setCsvFile(null);
    setParsedData([]);
    setCsvError(null);
  }, [csvType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (!parsed || parsed.rows.length === 0) {
          setCsvError("No data rows found in the CSV file.");
          setParsedData([]);
          return;
        }

        if (csvType === 'shoppers') {
          const mapped = parsed.rows.map((r: any) => {
            const name = r.name || r.shoppername || r.fullname || '';
            const email = r.email || r.emailaddress || '';
            const phone = r.phone || r.phonenumber || r.contact || '';
            const favCat = r.favoritecategory || r.category || r.favcategory || 'Coffee';
            const prefChan = r.preferredchannel || r.channel || r.prefchannel || 'whatsapp';
            const city = r.city || r.region || 'Unknown';
            const ageVal = parseInt(r.age || r.shopperage || '30');

            return {
              name,
              email,
              phone,
              metadata: {
                favorite_category: favCat,
                preferred_channel: prefChan,
                city,
                age: isNaN(ageVal) ? 30 : ageVal
              }
            };
          });
          
          setParsedData(mapped);
          const validCount = mapped.filter(c => c.name && c.email && c.phone).length;
          if (validCount === 0) {
            setCsvError("No valid rows. Shoppers must have Name, Email, and Phone columns.");
          }
        } else {
          const mapped = parsed.rows.map((r: any) => {
            const customerId = r.customerid || r.shopperid || r.id || '';
            const amountVal = parseFloat(r.amount || r.price || r.orderamount || '0');
            const status = r.status || r.orderstatus || 'COMPLETED';
            const rawItems = r.items || r.purchaseditems || 'General Purchase';
            const items = typeof rawItems === 'string'
              ? rawItems.split(',').map(i => i.trim()).filter(i => i.length > 0)
              : ['General Purchase'];

            return {
              customer_id: customerId,
              amount: isNaN(amountVal) ? 0 : amountVal,
              status: status.toUpperCase(),
              items
            };
          });
          setParsedData(mapped);
          const validCount = mapped.filter(o => o.customer_id && o.amount > 0).length;
          if (validCount === 0) {
            setCsvError("No valid rows. Transactions must have customer_id and amount columns.");
          }
        }
      } catch (err: any) {
        setCsvError(`Error parsing CSV file: ${err.message}`);
        setParsedData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedData.length === 0) {
      alert("No data available to import.");
      return;
    }

    setCsvImporting(true);
    try {
      if (csvType === 'shoppers') {
        const validCustomers = parsedData.filter(c => c.name && c.email && c.phone);
        if (validCustomers.length === 0) {
          alert("No valid shopper records to import.");
          setCsvImporting(false);
          return;
        }

        const res = await axios.post('/api/customers/bulk', { customers: validCustomers });
        alert(`Successfully imported ${res.data.count} shoppers!`);
      } else {
        const validOrders = parsedData.filter(o => o.customer_id && o.amount > 0);
        if (validOrders.length === 0) {
          alert("No valid transaction records to import.");
          setCsvImporting(false);
          return;
        }

        const res = await axios.post('/api/orders/bulk', { orders: validOrders });
        alert(`Successfully imported ${res.data.count} transactions!`);
      }

      setCsvFile(null);
      setParsedData([]);
      setShowCsvModal(false);
      fetchData();
    } catch (err: any) {
      alert(`Import failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setCsvImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      
      {/* Header bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Database Explorer</h1>
          <p className="subtitle">Browse shopper profiles, order transactions, and simulated customer properties.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Action buttons */}
          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'rgba(147, 51, 234, 0.4)', color: 'hsl(var(--primary-hover))' }}
            onClick={() => setShowCustModal(true)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={14} />
              <span>Ingest Shopper</span>
            </span>
          </button>
          
          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'rgba(6, 182, 212, 0.4)', color: 'hsl(var(--secondary))' }}
            onClick={() => {
              // Trigger customer load if empty
              if (customers.length === 0) {
                axios.get('/api/customers').then(res => {
                  setCustomers(res.data);
                  if (res.data.length > 0) setOrderCustId(res.data[0].id);
                });
              }
              setShowOrderModal(true);
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={14} />
              <span>Add Transaction</span>
            </span>
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ade80' }}
            onClick={() => {
              setCsvFile(null);
              setParsedData([]);
              setCsvError(null);
              setShowCsvModal(true);
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={14} />
              <span>Import CSV</span>
            </span>
          </button>

          {/* Toggle between Shoppers & Orders */}
          <div style={{ display: 'flex', gap: '8px', background: 'hsl(var(--bg-surface))', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))' }}>
            <button
              className={`btn ${activeSubTab === 'shoppers' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              onClick={() => setActiveSubTab('shoppers')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} />
                <span>Shopper base ({customers.length})</span>
              </span>
            </button>
            <button
              className={`btn ${activeSubTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              onClick={() => setActiveSubTab('orders')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Receipt size={14} />
                <span>Transactions ({orders.length})</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table views */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>Loading database contents...</div>
      ) : activeSubTab === 'shoppers' ? (
        <div className="table-container glass-panel">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Shopper Name</th>
                <th>Contact details</th>
                <th>Favorite Category</th>
                <th>Pref. Channel</th>
                <th>Region</th>
                <th>Orders</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'white' }}>{c.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>{c.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-email" style={{ textTransform: 'capitalize' }}>
                      {c.metadata.favorite_category || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${c.metadata.preferred_channel}`}>
                      {c.metadata.preferred_channel || 'sms'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                    {c.metadata.city || 'N/A'} (Age: {c.metadata.age || 'N/A'})
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{c.total_orders}</td>
                  <td style={{ fontWeight: 600, color: 'hsl(var(--success))', fontFamily: 'var(--font-mono)' }}>
                    ₹{(c.total_spent || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container glass-panel">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Shopper Name</th>
                <th>Purchase Items</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Transaction Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{o.id}</td>
                  <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {o.items.map((item, idx) => (
                        <span key={idx} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'hsl(var(--success))', fontFamily: 'var(--font-mono)' }}>
                    ₹{o.amount.toFixed(2)}
                  </td>
                  <td>
                    <span className={`badge ${o.status === 'COMPLETED' ? 'badge-delivered' : o.status === 'REFUNDED' ? 'badge-failed' : 'badge-draft'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                    {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL 1: Ingest Shopper --- */}
      {showCustModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-panel card glowing-border" style={{ width: '460px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '10px', color: 'hsl(var(--primary-hover))', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} /> Ingest Customer Profile
            </h3>
            
            <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Full Name *</label>
                <input
                  type="text" className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                  required value={custName} onChange={(e) => setCustName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Email *</label>
                  <input
                    type="email" className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    required value={custEmail} onChange={(e) => setCustEmail(e.target.value)}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Phone *</label>
                  <input
                    type="text" className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    required value={custPhone} onChange={(e) => setCustPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Brand Category</label>
                  <select
                    className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    value={custCategory} onChange={(e) => setCustCategory(e.target.value)}
                  >
                    <option value="Coffee">Coffee</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Home">Home Decor</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Pref. Channel</label>
                  <select
                    className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    value={custChannel} onChange={(e) => setCustChannel(e.target.value)}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="rcs">RCS</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>City</label>
                  <input
                    type="text" className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    placeholder="e.g. Seattle" value={custCity} onChange={(e) => setCustCity(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Age</label>
                  <input
                    type="number" className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    placeholder="e.g. 28" value={custAge} onChange={(e) => setCustAge(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => setShowCustModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit" className="btn btn-primary" style={{ flex: 1 }}
                  disabled={submitting}
                >
                  {submitting ? 'Ingesting...' : 'Add Shopper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Record Order --- */}
      {showOrderModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-panel card glowing-border" style={{ width: '460px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '10px', color: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} /> Add Transaction Record
            </h3>
            
            <form onSubmit={handleAddOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Select Customer *</label>
                {customers.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', padding: '10px 0' }}>
                    No shoppers found in database to link order. Ingest a customer first!
                  </div>
                ) : (
                  <select
                    className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    value={orderCustId} onChange={(e) => setOrderCustId(e.target.value)}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Amount (₹ INR) *</label>
                  <input
                    type="number" step="0.01" className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    required value={orderAmount} onChange={(e) => setOrderAmount(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Status</label>
                  <select
                    className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                    value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}
                  >
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Purchase Items (comma-separated)</label>
                <input
                  type="text" className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                  placeholder="e.g. Denim Jacket, Cotton Socks"
                  value={orderItems} onChange={(e) => setOrderItems(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => setShowOrderModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit" className="btn btn-primary"
                  disabled={submitting || customers.length === 0}
                  style={{ flex: 1, background: 'linear-gradient(135deg, hsl(var(--secondary)) 0%, #0891b2 100%)', boxShadow: '0 4px 20px rgba(6,182,212,0.4)' }}
                >
                  {submitting ? 'Recording...' : 'Add Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: CSV Import --- */}
      {showCsvModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-panel card glowing-border" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '10px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} /> Bulk Import CSV Data
            </h3>
            
            <form onSubmit={handleCsvImport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Type Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Select Dataset Type</label>
                <select
                  className="ai-textarea" style={{ height: '38px', padding: '0 12px' }}
                  value={csvType} onChange={(e) => setCsvType(e.target.value as any)}
                >
                  <option value="shoppers">Shopper Profiles (Customers)</option>
                  <option value="transactions">Transaction Records (Orders)</option>
                </select>
              </div>

              {/* Supported columns guidelines */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                <strong style={{ color: 'hsl(var(--text-primary))', display: 'block', marginBottom: '4px' }}>Expected CSV Headers:</strong>
                {csvType === 'shoppers' ? (
                  <>
                    <span style={{ color: 'hsl(var(--primary-hover))', fontWeight: 700 }}>Required:</span> <code>name</code>, <code>email</code>, <code>phone</code><br />
                    <span style={{ color: 'hsl(var(--secondary))', fontWeight: 700 }}>Optional:</span> <code>favorite_category</code>, <code>preferred_channel</code>, <code>city</code>, <code>age</code>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'hsl(var(--primary-hover))', fontWeight: 700 }}>Required:</span> <code>customer_id</code> (matching database), <code>amount</code><br />
                    <span style={{ color: 'hsl(var(--secondary))', fontWeight: 700 }}>Optional:</span> <code>status</code> (COMPLETED, PENDING, REFUNDED), <code>items</code> (comma-separated)
                  </>
                )}
              </div>

              {/* File Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Choose CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid hsl(var(--border-color))',
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}
                  required
                />
              </div>

              {csvFile && (
                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '-4px' }}>
                  <FileText size={12} style={{ color: '#10b981' }} />
                  <span>Selected: <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

              {/* Parsing feedback or error */}
              {csvError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {csvError}
                </div>
              )}

              {/* Data Preview */}
              {parsedData.length > 0 && !csvError && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 650, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} />
                    <span>Parsed {parsedData.length} records successfully (Previewing first 3):</span>
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border-color))', borderRadius: 'var(--radius-sm)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)' }}>
                          {csvType === 'shoppers' ? (
                            <>
                              <th style={{ padding: '6px 12px' }}>Name</th>
                              <th style={{ padding: '6px 12px' }}>Email</th>
                              <th style={{ padding: '6px 12px' }}>Phone</th>
                              <th style={{ padding: '6px 12px' }}>Category</th>
                            </>
                          ) : (
                            <>
                              <th style={{ padding: '6px 12px' }}>Customer ID</th>
                              <th style={{ padding: '6px 12px' }}>Amount</th>
                              <th style={{ padding: '6px 12px' }}>Status</th>
                              <th style={{ padding: '6px 12px' }}>Items</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 3).map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            {csvType === 'shoppers' ? (
                              <>
                                <td style={{ padding: '6px 12px', color: 'white' }}>{row.name || '-'}</td>
                                <td style={{ padding: '6px 12px', color: 'hsl(var(--text-secondary))' }}>{row.email || '-'}</td>
                                <td style={{ padding: '6px 12px', color: 'hsl(var(--text-muted))' }}>{row.phone || '-'}</td>
                                <td style={{ padding: '6px 12px', color: 'hsl(var(--text-muted))' }}>{row.metadata?.favorite_category || '-'}</td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '6px 12px', color: 'white' }}>{row.customer_id || '-'}</td>
                                <td style={{ padding: '6px 12px', color: 'white' }}>₹{row.amount}</td>
                                <td style={{ padding: '6px 12px', color: 'hsl(var(--text-secondary))' }}>{row.status || '-'}</td>
                                <td style={{ padding: '6px 12px', color: 'hsl(var(--text-muted))' }}>{row.items?.join(', ') || '-'}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => setShowCsvModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit" className="btn btn-primary"
                  disabled={csvImporting || parsedData.length === 0 || !!csvError}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: '1px solid rgba(16, 185, 129, 0.4)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)', color: 'white' }}
                >
                  {csvImporting ? 'Importing...' : `Import ${parsedData.length} Records`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;

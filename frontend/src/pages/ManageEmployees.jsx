import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Receipt, DownloadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config';

export default function ManageEmployees() {
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', username: '', password: '', baseSalary: 0 });
  const [customFields, setCustomFields] = useState([]);
  
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build custom data JSON natively
      const customData = {};
      customFields.forEach(field => {
        if (field.key && field.value) customData[field.key] = field.value;
      });

      await axios.post(`${API_URL}/api/employees`, { ...newEmp, customData }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setNewEmp({ name: '', username: '', password: '', baseSalary: 0 });
      setCustomFields([]);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add employee');
    }
  };

  const addCustomField = () => setCustomFields([...customFields, { key: '', value: '' }]);
  const updateCustomField = (index, field, value) => {
    const newFields = [...customFields];
    newFields[index][field] = value;
    setCustomFields(newFields);
  };
  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleViewSlip = (userId) => {
    const month = new Date().toISOString().slice(0, 7); // current month YYYY-MM
    navigate(`/salary-slip/${userId}/${month}`);
  };

  const handleBulkExport = async () => {
    try {
      const month = new Date().toISOString().slice(0, 7);
      let csvStr = "ID,Name,BaseSalary,DaysPresent,DaysAbsent,OvertimePay,ShortDeduction,NetSalary\n";
      
      // We manually aggregate each user's salary payload, in a real env the backend does this in one SQL jump!
      for (const emp of employees) {
         try {
           const res = await axios.get(`${API_URL}/api/salary/${emp.id}?month=${month}`, { headers: { Authorization: `Bearer ${token}` }});
           const d = res.data;
           csvStr += `${emp.id},"${emp.name}",${emp.baseSalary},${d.attendanceStats.presentDays},${d.attendanceStats.absentDays},${d.calculation.overtimePay},${d.calculation.shortDeduction},${d.calculation.netSalary}\n`;
         } catch(e) {}
      }

      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payroll_Export_${month}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Manage Employees</h1>
          <p>Directory and Payroll Hub</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" style={{ background: 'var(--secondary)' }} onClick={handleBulkExport}>
            <DownloadCloud size={20} /> Export Bulk CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={20} /> Add New Employee
          </button>
        </div>
      </div>

      <div className="glass-panel table-responsive" style={{ padding: '1.5rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Base Salary</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td># {emp.id}</td>
                <td>
                  <strong>{emp.name}</strong>
                  {emp.customData && Object.keys(emp.customData).length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {Object.keys(emp.customData).map(k => (
                        <span key={k} style={{ marginRight: '0.5rem' }}>{k}: {emp.customData[k]}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td>@{emp.username}</td>
                <td>$ {emp.baseSalary.toLocaleString()} / mo</td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn" style={{ background: 'rgba(79, 70, 229, 0.2)', color: 'var(--text-main)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleViewSlip(emp.id)}>
                    <Receipt size={16} /> Salary Slip
                  </button>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No employees added yet!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0 }}>Create Employee Profiles</h2>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Full Name</label>
                <input className="input-field" type="text" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} required />
              </div>
              <div>
                <label>Username</label>
                <input className="input-field" type="text" value={newEmp.username} onChange={e => setNewEmp({...newEmp, username: e.target.value})} required />
              </div>
              <div>
                <label>Password</label>
                <input className="input-field" type="password" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} required />
              </div>
              <div>
                <label>Monthly Base Salary ($)</label>
                <input className="input-field" type="number" min="0" value={newEmp.baseSalary} onChange={e => setNewEmp({...newEmp, baseSalary: Number(e.target.value)})} required />
              </div>

              {/* Dynamic Credentials Builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.5rem 0' }}>
                   <label>Extra Details (Optional)</label>
                   <button type="button" className="btn" style={{ background: 'var(--surface)', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={addCustomField}>+ Add Field</button>
                </div>
                {customFields.map((field, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input className="input-field" type="text" placeholder="e.g. Department" value={field.key} onChange={(e) => updateCustomField(idx, 'key', e.target.value)} />
                    <input className="input-field" type="text" placeholder="e.g. Engineering" value={field.value} onChange={(e) => updateCustomField(idx, 'value', e.target.value)} />
                    <button type="button" className="btn btn-danger" style={{ padding: '0.4rem 0.8rem' }} onClick={() => removeCustomField(idx)}>X</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Create</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

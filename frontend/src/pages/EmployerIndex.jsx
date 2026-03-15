import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, CheckCircle, XCircle, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import GeoLocationCard from '../components/GeoLocationCard';
import API_URL from '../config';

export default function EmployerIndex() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  
  // Using today's local date
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA')); // en-CA gives YYYY-MM-DD reliably
  
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEmployees();
    fetchLeaves();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [date]);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/employees`, { headers });
      setEmployees(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAttendance = async () => {
    try {
      const month = date.slice(0, 7);
      const res = await axios.get(`${API_URL}/api/attendance?month=${month}`, { headers });
      setAttendance(res.data); // We store whole month for charts
    } catch (err) { console.error(err); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/leaves`, { headers });
      setLeaves(res.data);
    } catch (err) { console.error(err); }
  };

  const markAttendance = async (userId, targetStatus, loginTime, logoutTime) => {
    try {
      await axios.post(`${API_URL}/api/attendance`, { userId, date, status: targetStatus, loginTime, logoutTime }, { headers });
      fetchAttendance();
    } catch (err) { alert('Failed to mark attendance'); }
  };

  const markAllPresent = async () => {
    try {
      await axios.post(`${API_URL}/api/attendance/bulk`, { date, status: 'Present' }, { headers });
      fetchAttendance();
      alert('All employees marked as Present for ' + date);
    } catch (err) { alert('Bulk update failed'); }
  };

  const handleLeave = async (id, status, userId, startDate) => {
    try {
      await axios.put(`${API_URL}/api/leaves/${id}`, { status, userId, startDate }, { headers });
      fetchLeaves();
      fetchAttendance();
    } catch (err) { alert('Failed to alter leave status'); }
  };

  // Compute daily stats
  const dailyRecords = attendance.filter(a => a.date === date);
  const stats = {
    present: dailyRecords.filter(a => a.status === 'Present').length,
    absent: dailyRecords.filter(a => a.status === 'Absent').length,
    half: dailyRecords.filter(a => a.status === 'Half-day').length,
    leave: dailyRecords.filter(a => a.status === 'Leave').length,
  };

  // Compile data for Recharts (Recent 7 days)
  const chartData = [];
  const startDay = new Date(date);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startDay);
    d.setDate(d.getDate() - i);
    const dStr = d.toLocaleDateString('en-CA');
    
    chartData.push({
      name: dStr.slice(5), // MM-DD
      Present: attendance.filter(a => a.date === dStr && a.status === 'Present').length,
      Leaves: attendance.filter(a => a.date === dStr && a.status === 'Leave').length
    });
  }

  const getRecord = (userId) => dailyRecords.find(a => a.userId === userId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Operations Dashboard</h1>
          <p>Real-time Insights & Timesheets</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={markAllPresent}><Zap size={16}/> Auto-Mark All Present</button>
          <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <div className="grid-cards">
        <div className="glass-panel stat-card" style={{ gridColumn: 'span 2' }}>
           <div style={{ width: '100%', height: '100px', display: 'flex', flexDirection: 'column' }}>
             <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16}/> 7-Day Attendance Trend</h4>
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: 'none', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="Present" stroke="var(--secondary)" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Leaves" stroke="var(--primary)" strokeWidth={2} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="icon-circle" style={{ color: 'var(--secondary)' }}><CheckCircle size={24} /></div>
          <div><h3>{stats.present}</h3><p>Today Present</p></div>
        </div>
        <div className="glass-panel stat-card">
          <div className="icon-circle" style={{ color: 'var(--primary)' }}><Users size={24} /></div>
          <div><h3>{employees.length}</h3><p>Total Team</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Daily Timesheet */}
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <h2>Today's Timesheet ({date})</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Status</th>
                <th>Location Audit</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const record = getRecord(emp.id);
                const currentStatus = record ? record.status : 'Not Marked';
                
                return (
                  <tr key={emp.id}>
                    <td>
                      <strong>{emp.name}</strong> 
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                         In: {record?.loginTime || '--:--'} | Out: {record?.logoutTime || '--:--'}
                      </div>
                    </td>
                    <td><span className={`badge ${currentStatus.toLowerCase()}`}>{currentStatus}</span></td>
                    <td>
                      <GeoLocationCard
                        clockInLocation={record?.clockInLocation}
                        clockOutLocation={record?.clockOutLocation}
                      />
                    </td>
                    <td>
                      <select 
                        className="input-field" 
                        style={{ width: 'auto', padding: '0.4rem', border: 'none', background: 'rgba(0,0,0,0.2)' }}
                        value={currentStatus === 'Not Marked' ? '' : currentStatus}
                        onChange={(e) => markAttendance(emp.id, e.target.value, record?.loginTime, record?.logoutTime)}
                      >
                        <option value="" disabled>Status</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Half-day">Half-day</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No employees active.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Leave Workflow Queue */}
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <h2>Leave Request Workflow</h2>
          {leaves.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem' }}>No active requests pending!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {leaves.map(req => (
                <div key={req.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: req.status === 'Pending' ? '4px solid var(--warning)' : (req.status === 'Approved' ? '4px solid var(--secondary)' : '4px solid var(--danger)') }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <strong>{req.userName}</strong>
                       <p style={{ margin: '0.2rem 0', fontSize: '0.85rem' }}>{req.startDate} to {req.endDate}</p>
                       <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reason: {req.reason}</p>
                     </div>
                     <div>
                       {req.status === 'Pending' ? (
                         <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn" style={{ background: 'var(--secondary)', color: 'white', padding: '0.4rem 0.8rem' }} onClick={() => handleLeave(req.id, 'Approved', req.userId, req.startDate)}>Approve</button>
                            <button className="btn" style={{ background: 'var(--danger)', color: 'white', padding: '0.4rem 0.8rem' }} onClick={() => handleLeave(req.id, 'Denied', req.userId, req.startDate)}>Deny</button>
                         </div>
                       ) : (
                         <span className={`badge ${req.status === 'Approved' ? 'present' : 'absent'}`}>{req.status}</span>
                       )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </motion.div>
  );
}

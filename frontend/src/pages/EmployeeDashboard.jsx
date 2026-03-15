import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, Receipt, BadgeAlert, CheckCircle, Clock, MapPin, Send } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config';

export default function EmployeeDashboard() {
  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });
  
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyAttendance();
  }, [month]);

  const fetchMyAttendance = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/attendance?month=${month}`, { headers });
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const requestGeolocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve('No GPS Support');
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`),
        () => resolve('GPS Denied')
      );
    });
  };

  const handleClockIn = async () => {
    try {
      const loc = await requestGeolocation();
      await axios.post(`${API_URL}/api/clock-in`, { clockInLocation: loc }, { headers });
      fetchMyAttendance();
      alert('Success! Clock In Recorded.');
    } catch (err) { alert('Failed to clock in.'); }
  };

  const handleClockOut = async () => {
    try {
      const loc = await requestGeolocation();
      const today = new Date().toISOString().split('T')[0];
      await axios.post(`${API_URL}/api/clock-out`, { clockOutLocation: loc, date: today }, { headers });
      fetchMyAttendance();
      alert('Success! Clock Out Recorded.');
    } catch (err) { alert('Failed to clock out.'); }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/leaves`, leaveForm, { headers });
      setLeaveModal(false);
      alert('Leave requested! Pending employer approval.');
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
    } catch (err) { alert('Failed to submit leave.'); }
  };

  const calculateHours = (login, logout) => {
    if(!login || !logout) return '-';
    const [h1, m1] = login.split(':').map(Number);
    const [h2, m2] = logout.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if(diff < 0) diff += 24 * 60; 
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  const isWeekend = (dateStr) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const stats = {
    present: attendance.filter(a => a.status === 'Present').length,
    absent: attendance.filter(a => a.status === 'Absent').length,
    half: attendance.filter(a => a.status === 'Half-day').length,
    leave: attendance.filter(a => a.status === 'Leave').length,
  };

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <div className="main-content">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1>My Dashboard</h1>
              <p>Welcome back, {user.name}!</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--surface)', padding: '0.5rem', borderRadius: '8px', display: 'flex', gap: '0.5rem' }}>
                 <button className="btn btn-primary" onClick={handleClockIn}><MapPin size={16}/> Clock In Now</button>
                 <button className="btn btn-danger" onClick={handleClockOut} style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>Clock Out</button>
              </div>
              
              <button className="btn" style={{ background: 'var(--surface)', color: 'white', border: '1px solid var(--border)' }} onClick={() => setLeaveModal(true)}>
                <Send size={16}/> Request Leave
              </button>

              <button className="btn btn-primary" onClick={() => navigate(`/salary-slip/${user.id}/${month}`)}>
                <Receipt size={16} /> My Salary Slip
              </button>
            </div>
          </div>

          <div className="grid-cards">
            <div className="glass-panel stat-card">
              <div className="icon-circle" style={{ color: 'var(--secondary)' }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <h3>{stats.present}</h3>
                <p>Present Days</p>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="icon-circle" style={{ color: 'var(--danger)' }}>
                <BadgeAlert size={24} />
              </div>
              <div>
                <h3>{stats.absent}</h3>
                <p>Absent Days</p>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="icon-circle" style={{ color: 'var(--primary)' }}>
                <Clock size={24} />
              </div>
              <div>
                <h3>{stats.half}</h3>
                <p>Half Days</p>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={20}/> Attendance History</h2>
              <input type="month" className="input-field" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)} />
            </div>
            
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Login / Logout</th>
                  <th>Hours Logged</th>
                  <th style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GPS IP</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => {
                   const weekend = isWeekend(a.date);
                   return (
                    <tr key={a.id} style={{ background: weekend ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td>
                        <strong>{a.date}</strong>
                        {weekend && <div style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Weekend</div>}
                      </td>
                      <td><span className={`badge ${a.status.toLowerCase()}`}>{a.status}</span></td>
                      <td>
                        <span style={{ color: 'var(--secondary)' }}>{a.loginTime || '--:--'}</span> {" -> "} 
                        <span style={{ color: 'var(--warning)' }}>{a.logoutTime || '--:--'}</span>
                      </td>
                      <td><strong>{calculateHours(a.loginTime, a.logoutTime)}</strong></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        In: {a.clockInLocation || 'N/A'}<br/>
                        Out: {a.clockOutLocation || 'N/A'}
                      </td>
                    </tr>
                  )
                })}
                {attendance.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No attendance recorded for {month}.</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </motion.div>
      </div>

      {leaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginTop: 0 }}>Request Time Off</h2>
            <form onSubmit={handleLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Start Date</label>
                <input className="input-field" type="date" required value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} />
              </div>
              <div>
                <label>End Date</label>
                <input className="input-field" type="date" required value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} />
              </div>
              <div>
                <label>Reason for Leave</label>
                <input className="input-field" type="text" placeholder="e.g. Vacation, Sick Leave" required value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setLeaveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Submit</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

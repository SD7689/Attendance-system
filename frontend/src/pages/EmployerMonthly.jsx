import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import API_URL from '../config';

export default function EmployerMonthly() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [attendance, setAttendance] = useState([]);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (month && selectedEmp) {
      fetchAttendance();
    }
  }, [month, selectedEmp]);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/employees`, { headers });
      setEmployees(res.data);
      if (res.data.length > 0) setSelectedEmp(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/attendance?month=${month}`, { headers });
      // Filter for the selected employee only
      setAttendance(res.data.filter(a => a.userId === parseInt(selectedEmp)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAttendance = async (date, targetStatus, loginTime, logoutTime) => {
    if (!selectedEmp) return;
    try {
      await axios.post(`${API_URL}/api/attendance`, { 
        userId: parseInt(selectedEmp), 
        date, 
        status: targetStatus, 
        loginTime, 
        logoutTime 
      }, { headers });
      
      fetchAttendance(); // Refresh to show new counts and marks
    } catch (err) {
      console.error(err);
      alert('Failed to update attendance');
    }
  };

  const calculateHours = (login, logout) => {
    if (!login || !logout) return '-';
    const [h1, m1] = login.split(':').map(Number);
    const [h2, m2] = logout.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if(diff < 0) diff += 24 * 60; // Just in case
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  const getRecord = (dateStr) => {
    return attendance.find(a => a.date === dateStr);
  };

  // Generate array of days for the selected month
  const getDaysInMonth = () => {
    if (!month) return [];
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;
    const date = new Date(year, monthIndex, 1);
    const days = [];
    while (date.getMonth() === monthIndex) {
      // format YYYY-MM-DD
      const dOptions = new Date(date);
      // Ensure local timezone doesn't shift the day incorrectly, best standard approach:
      const y = dOptions.getFullYear();
      const m = String(dOptions.getMonth() + 1).padStart(2, '0');
      const d = String(dOptions.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const daysList = getDaysInMonth();
  const selectedEmployeeName = employees.find(e => e.id === parseInt(selectedEmp))?.name || 'Employee';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Monthly Tracker</h1>
          <p>Mark attendance for an entire month per employee</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            className="input-field" 
            value={selectedEmp} 
            onChange={e => setSelectedEmp(e.target.value)}
          >
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} (@{e.username})</option>)}
          </select>
          <input 
            type="month" 
            className="input-field" 
            value={month} 
            onChange={e => setMonth(e.target.value)} 
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} color="var(--primary)" /> {selectedEmployeeName}'s Log for {month}
        </h2>
        
        {employees.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '2rem' }}>No employees added yet!</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Current Status</th>
                <th>Login Time</th>
                <th>Logout Time</th>
                <th>Total Hours</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {daysList.map(dateStr => {
                const record = getRecord(dateStr);
                const currentStatus = record ? record.status : 'Not Marked';
                const loginTime = record?.loginTime || '';
                const logoutTime = record?.logoutTime || '';
                
                // For a visually better readout of the day names
                const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <tr key={dateStr}>
                    <td><strong>{dateStr}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({dayName})</span></td>
                    <td>
                      <span className={`badge ${currentStatus.toLowerCase()}`}>
                        {currentStatus}
                      </span>
                    </td>
                    <td>
                      <input 
                        type="time" 
                        className="input-field" 
                        style={{ padding: '0.4rem', width: '130px', background: 'rgba(0,0,0,0.2)' }} 
                        value={loginTime} 
                        onChange={(e) => markAttendance(dateStr, currentStatus !== 'Not Marked' ? currentStatus : 'Present', e.target.value, logoutTime)} 
                      />
                    </td>
                    <td>
                      <input 
                        type="time" 
                        className="input-field" 
                        style={{ padding: '0.4rem', width: '130px', background: 'rgba(0,0,0,0.2)' }} 
                        value={logoutTime} 
                        onChange={(e) => markAttendance(dateStr, currentStatus !== 'Not Marked' ? currentStatus : 'Present', loginTime, e.target.value)} 
                      />
                    </td>
                    <td><strong>{calculateHours(loginTime, logoutTime)}</strong></td>
                    <td>
                      <select 
                        className="input-field" 
                        style={{ width: 'auto', padding: '0.4rem', border: 'none', background: 'rgba(0,0,0,0.2)' }}
                        value={currentStatus === 'Not Marked' ? '' : currentStatus}
                        onChange={(e) => markAttendance(dateStr, e.target.value, loginTime, logoutTime)}
                      >
                        <option value="" disabled>Select Status</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Half-day">Half-day</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

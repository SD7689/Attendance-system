import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, PieChart as PieIcon, Clock, Users, MapPin } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid,
  RadialBarChart, RadialBar
} from 'recharts';

const COLORS = {
  present: '#10B981',
  absent: '#EF4444',
  halfDay: '#F59E0B',
  leave: '#4F46E5',
  overtime: '#06B6D4',
  surface: 'rgba(30, 41, 59, 0.7)',
};

const PIE_COLORS = [COLORS.present, COLORS.absent, COLORS.halfDay, COLORS.leave];

const cardAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.75rem 1rem', backdropFilter: 'blur(8px)' }}>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '0.15rem 0', color: p.color, fontWeight: 600, fontSize: '0.85rem' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmp, setSelectedEmp] = useState('all');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [month]);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/employees', { headers });
      setEmployees(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/attendance?month=${month}`, { headers });
      setAttendance(res.data);
    } catch (err) { console.error(err); }
  };

  // Filter by employee selection
  const filtered = selectedEmp === 'all' ? attendance : attendance.filter(a => a.userId === parseInt(selectedEmp));

  // === CHART DATA COMPUTATIONS ===

  // 1. Pie: Overall status distribution
  const statusCounts = {
    Present: filtered.filter(a => a.status === 'Present').length,
    Absent: filtered.filter(a => a.status === 'Absent').length,
    'Half-day': filtered.filter(a => a.status === 'Half-day').length,
    Leave: filtered.filter(a => a.status === 'Leave').length,
  };
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

  // 2. Bar: Per-employee breakdown
  const perEmployeeData = employees.map(emp => {
    const empRecords = attendance.filter(a => a.userId === emp.id);
    return {
      name: emp.name.split(' ')[0], // First name only
      Present: empRecords.filter(a => a.status === 'Present').length,
      Absent: empRecords.filter(a => a.status === 'Absent').length,
      Leave: empRecords.filter(a => a.status === 'Leave').length,
    };
  });

  // 3. Area: Daily trend over the month
  const getDaysInMonth = () => {
    if (!month) return [];
    const [y, m] = month.split('-').map(Number);
    const days = [];
    const d = new Date(y, m - 1, 1);
    while (d.getMonth() === m - 1) {
      const ds = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push(ds);
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const dailyTrendData = getDaysInMonth().map(dateStr => {
    const dayRecords = filtered.filter(a => a.date === dateStr);
    return {
      date: dateStr.slice(8), // DD
      Present: dayRecords.filter(a => a.status === 'Present').length,
      Absent: dayRecords.filter(a => a.status === 'Absent').length,
      Leave: dayRecords.filter(a => a.status === 'Leave').length,
    };
  });

  // 4. Working hours analysis
  const hoursData = employees.map(emp => {
    const empRecords = attendance.filter(a => a.userId === emp.id && a.loginTime && a.logoutTime);
    let totalMins = 0;
    empRecords.forEach(r => {
      const [h1, m1] = r.loginTime.split(':').map(Number);
      const [h2, m2] = r.logoutTime.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff > 0) totalMins += diff;
    });
    return {
      name: emp.name.split(' ')[0],
      hours: parseFloat((totalMins / 60).toFixed(1)),
      fill: totalMins / 60 > (empRecords.length * 8) ? COLORS.overtime : COLORS.present,
    };
  }).filter(d => d.hours > 0);

  // 5. Geolocation data
  const geoRecords = attendance.filter(a => a.clockInLocation && a.clockInLocation !== 'No GPS Support' && a.clockInLocation !== 'GPS Denied');

  // Attendance rate KPI
  const totalMarked = filtered.length;
  const totalPresent = statusCounts.Present + statusCounts['Half-day'] * 0.5 + statusCounts.Leave;
  const attendanceRate = totalMarked > 0 ? ((totalPresent / totalMarked) * 100).toFixed(1) : 0;

  // Radial gauge data
  const radialData = [{ name: 'Attendance', value: parseFloat(attendanceRate), fill: parseFloat(attendanceRate) > 75 ? COLORS.present : parseFloat(attendanceRate) > 50 ? COLORS.halfDay : COLORS.absent }];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={32} color="var(--primary)" /> Analytics Center
          </h1>
          <p>Data visualization & workforce insights</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select className="input-field" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <input type="month" className="input-field" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto' }} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <motion.div {...cardAnim} className="glass-panel stat-card">
          <div className="icon-circle" style={{ color: COLORS.present }}><TrendingUp size={24} /></div>
          <div><h3>{attendanceRate}%</h3><p>Attendance Rate</p></div>
        </motion.div>
        <motion.div {...cardAnim} transition={{ delay: 0.1 }} className="glass-panel stat-card">
          <div className="icon-circle" style={{ color: COLORS.present }}><Users size={24} /></div>
          <div><h3>{statusCounts.Present}</h3><p>Total Present</p></div>
        </motion.div>
        <motion.div {...cardAnim} transition={{ delay: 0.2 }} className="glass-panel stat-card">
          <div className="icon-circle" style={{ color: COLORS.absent }}><Clock size={24} /></div>
          <div><h3>{statusCounts.Absent}</h3><p>Total Absent</p></div>
        </motion.div>
        <motion.div {...cardAnim} transition={{ delay: 0.3 }} className="glass-panel stat-card">
          <div className="icon-circle" style={{ color: COLORS.leave }}><MapPin size={24} /></div>
          <div><h3>{geoRecords.length}</h3><p>GPS Verified</p></div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>

        {/* Attendance Rate Gauge + Pie */}
        <motion.div {...cardAnim} transition={{ delay: 0.1 }} className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <PieIcon size={18} color="var(--primary)" /> Status Distribution
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <ResponsiveContainer width="50%" height={220}>
              <RadialBarChart innerRadius="60%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0} barSize={14}>
                <RadialBar cornerRadius={10} dataKey="value" />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="var(--text-main)" fontSize={24} fontWeight={700}>
                  {attendanceRate}%
                </text>
                <text x="50%" y="62%" textAnchor="middle" fill="var(--text-muted)" fontSize={11}>
                  Effectiveness
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Per-Employee Breakdown */}
        <motion.div {...cardAnim} transition={{ delay: 0.2 }} className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Users size={18} color="var(--secondary)" /> Per-Employee Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={perEmployeeData} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Present" fill={COLORS.present} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Absent" fill={COLORS.absent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Leave" fill={COLORS.leave} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Daily Trend Area Chart */}
        <motion.div {...cardAnim} transition={{ delay: 0.3 }} className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={18} color={COLORS.overtime} /> Daily Attendance Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyTrendData}>
              <defs>
                <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.present} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.present} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.absent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.absent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Present" stroke={COLORS.present} fillOpacity={1} fill="url(#gradPresent)" strokeWidth={2} />
              <Area type="monotone" dataKey="Absent" stroke={COLORS.absent} fillOpacity={1} fill="url(#gradAbsent)" strokeWidth={2} />
              <Area type="monotone" dataKey="Leave" stroke={COLORS.leave} fillOpacity={0.2} fill={COLORS.leave} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Working Hours Bar */}
        <motion.div {...cardAnim} transition={{ delay: 0.4 }} className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={18} color={COLORS.halfDay} /> Hours Worked This Month
          </h3>
          {hoursData.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem' }}>No time data recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hoursData} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={12} width={60} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]} fill={COLORS.present}>
                  {hoursData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* GPS Verification Log */}
        <motion.div {...cardAnim} transition={{ delay: 0.5 }} className="glass-panel" style={{ padding: '1.5rem', maxHeight: '380px', overflowY: 'auto' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <MapPin size={18} color={COLORS.present} /> Geolocation Audit Trail
          </h3>
          {geoRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <MapPin size={48} color="var(--text-muted)" style={{ opacity: 0.3 }} />
              <p style={{ marginTop: '1rem' }}>No GPS-verified entries this month.</p>
              <p style={{ fontSize: '0.8rem' }}>Employees can clock in with geolocation from the Employee Portal.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {geoRecords.slice(0, 20).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 1rem', borderRadius: 8, borderLeft: '3px solid var(--secondary)' }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>{r.userName}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>📍 {r.clockInLocation}</div>
                    {r.clockOutLocation && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>🏠 {r.clockOutLocation}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

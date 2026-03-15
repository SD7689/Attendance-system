const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('./database');

const app = express();

// Explicit CORS configuration for production
app.use(cors({
    origin: '*', // For now, we'll allow all. But you should change this to your static site URL once deployed!
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const JWT_SECRET = 'supersecret_attendance_key_123';

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

const employerAuth = (req, res, next) => {
    if (req.user.role !== 'employer') return res.status(403).json({ error: 'Employer access required' });
    next();
};

// --- AUTH --- //
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error || !user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, baseSalary: user.baseSalary } });
});

app.get('/api/employees', auth, employerAuth, async (req, res) => {
    const { data: employees, error } = await supabase.from('users').select('id, name, username, baseSalary, "customData"').eq('role', 'employee');
    if (error) return res.status(500).json({ error: error.message });
    res.json(employees);
});

app.post('/api/employees', auth, employerAuth, async (req, res) => {
    const { name, username, password, baseSalary, customData } = req.body;
    try {
        const hash = bcrypt.hashSync(password, 10);
        const { error } = await supabase.from('users').insert([{ name, username, password: hash, role: 'employee', baseSalary, customData: customData || {} }]);
        if (error) throw error;
        res.json({ success: true, message: 'Employee added successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Username might exist or error inserting custom data.' });
    }
});

// --- ATTENDANCE: EMPLOYER & BULK --- //
app.post('/api/attendance', auth, employerAuth, async (req, res) => {
    const { userId, date, status, loginTime, logoutTime } = req.body; 
    try {
        const { error } = await supabase.from('attendance').upsert({ 
            userId, date, status, loginTime: loginTime || null, logoutTime: logoutTime || null 
        }, { onConflict: 'userId,date' });
        if (error) throw error;
        
        // Audit log immutable history
        await supabase.from('audit_logs').insert({ adminId: req.user.id, action: `Manually altered attendance for ID ${userId} on ${date} (Status: ${status})` });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record attendance' });
    }
});

app.post('/api/attendance/bulk', auth, employerAuth, async (req, res) => {
    const { date, status } = req.body;
    try {
        const { data: employees } = await supabase.from('users').select('id').eq('role', 'employee');
        const upserts = employees.map(e => ({ userId: e.id, date, status, loginTime: '09:00', logoutTime: '17:00' }));
        await supabase.from('attendance').upsert(upserts, { onConflict: 'userId,date' });
        await supabase.from('audit_logs').insert({ adminId: req.user.id, action: `Bulk marked all employees as ${status} on ${date}` });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// --- SELF-SERVE KIOSK: CLOCK IN / OUT --- //
app.post('/api/clock-in', auth, async (req, res) => {
    const { clockInLocation } = req.body; 
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].slice(0, 5); // HH:MM
    try {
        await supabase.from('attendance').upsert({
            userId: req.user.id, date, status: 'Present', loginTime: time, clockInLocation
        }, { onConflict: 'userId,date' });
        res.json({ success: true, time, date });
    } catch(e) { res.status(500).json({ error: 'Clock in failed' }); }
});

app.post('/api/clock-out', auth, async (req, res) => {
    const { clockOutLocation, date } = req.body; // Use supplied date to protect against timezone night drift
    const time = new Date().toTimeString().split(' ')[0].slice(0, 5);
    try {
        await supabase.from('attendance').update({ logoutTime: time, clockOutLocation }).eq('userId', req.user.id).eq('date', date);
        res.json({ success: true, time });
    } catch(e) { res.status(500).json({ error: 'Clock out failed' }); }
});

app.get('/api/attendance', auth, async (req, res) => {
    const { month } = req.query;
    try {
        let query = supabase.from('attendance').select(`*, users!inner(name)`).like('date', `${month}%`).order('date', { ascending: false });
        if (req.user.role === 'employee') query = query.eq('userId', req.user.id);

        const { data, error } = await query;
        if (error) throw error;
        const records = data.map(r => ({ ...r, userName: r.users ? r.users.name : 'Unknown' }));
        res.json(records);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch' }); }
});

// --- LEAVE MANAGEMENT --- //
app.get('/api/leaves', auth, async (req, res) => {
    try {
        let q = supabase.from('leaves').select(`*, users!inner(name)`).order('id', { ascending: false });
        if (req.user.role === 'employee') q = q.eq('userId', req.user.id);
        const { data } = await q;
        res.json(data.map(d => ({ ...d, userName: d.users.name })));
    } catch(e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/leaves', auth, async (req, res) => {
    const { startDate, endDate, reason } = req.body;
    try {
        await supabase.from('leaves').insert({ userId: req.user.id, startDate, endDate, reason });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Failed request' }); }
});

app.put('/api/leaves/:id', auth, employerAuth, async (req, res) => {
    const { id } = req.params;
    const { status, userId, startDate, endDate } = req.body; // status: Approved or Denied
    try {
        await supabase.from('leaves').update({ status }).eq('id', id);
        
        // Auto-mark attendance if approved
        if (status === 'Approved') {
            await supabase.from('attendance').upsert({ userId, date: startDate, status: 'Leave' }, { onConflict: 'userId,date' });
            // For simplicity, we only mark startDate as leave right now. In a full system we'd loop between start and end.
            await supabase.from('audit_logs').insert({ adminId: req.user.id, action: `Approved leave for ID ${userId}` });
        } else {
            await supabase.from('audit_logs').insert({ adminId: req.user.id, action: `Denied leave for ID ${userId}` });
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Failed status update' }); }
});

// --- PAYROLL CALC (OVERTIME LOGIC ENGINE) --- //
app.get('/api/salary/:userId', auth, async (req, res) => {
    const { userId } = req.params;
    const { month } = req.query;
    if (req.user.role !== 'employer' && req.user.id !== parseInt(userId)) return res.status(403).json({ error: 'Unauthorized' });

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: records } = await supabase.from('attendance').select('*').eq('userId', userId).like('date', `${month}%`);
    
    let presentDays = 0, absentDays = 0, halfDays = 0, leaveDays = 0;
    let totalWorkedMinutes = 0;
    
    records.forEach(r => {
        if (r.status === 'Present') presentDays++;
        else if (r.status === 'Absent') absentDays++;
        else if (r.status === 'Half-day') halfDays++;
        else if (r.status === 'Leave') leaveDays++;

        // Calculate hours worked for overtime logic
        if (r.loginTime && r.logoutTime) {
            const [h1, m1] = r.loginTime.split(':').map(Number);
            const [h2, m2] = r.logoutTime.split(':').map(Number);
            let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff > 0) totalWorkedMinutes += diff;
        }
    });

    const workingDays = 22; // Better assumption for monthly working days
    const dailyWage = user.baseSalary / workingDays;
    const hourlyRate = dailyWage / 8; // Standard 8 hour day

    const totalStandardMinutes = presentDays * 8 * 60; // Expected minutes if physically there
    let overtimePay = 0;
    let shortDeduction = 0;

    if (totalWorkedMinutes > totalStandardMinutes) {
        // Overtime at 1.5x
        const extraHours = (totalWorkedMinutes - totalStandardMinutes) / 60;
        overtimePay = extraHours * (hourlyRate * 1.5);
    } else if (totalWorkedMinutes < totalStandardMinutes && totalWorkedMinutes > 0) {
        // Shortage deduction at normal rate
        const missingHours = (totalStandardMinutes - totalWorkedMinutes) / 60;
        shortDeduction = missingHours * hourlyRate;
    }

    const effectiveDaysPaid = presentDays + leaveDays + (halfDays * 0.5);
    let baseEarned = (dailyWage * effectiveDaysPaid);
    
    // Final check
    let netSalary = (baseEarned + overtimePay - shortDeduction).toFixed(2);
    if (netSalary < 0) netSalary = 0;

    res.json({
        user: { name: user.name, username: user.username, baseSalary: user.baseSalary },
        month,
        attendanceStats: { presentDays, absentDays, halfDays, leaveDays },
        calculation: { 
            dailyWage: dailyWage.toFixed(2), hourlyRate: hourlyRate.toFixed(2),
            effectiveDaysPaid, 
            overtimePay: overtimePay.toFixed(2),
            shortDeduction: shortDeduction.toFixed(2),
            netSalary 
        }
    });
});

app.get('/api/payroll-bulk', auth, employerAuth, async (req, res) => {
    // Basic bulk mock for export
    res.json({ success: true, message: 'In production, this triggers bulk CSV creation. Currently active via frontend looping.'});
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port: ${PORT}`));

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SalarySlip() {
  const { userId, month } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSalary();
  }, [userId, month]);

  const fetchSalary = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/salary/${userId}?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load salary slip. Make sure you have the required access.');
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const getMonthName = (YYYYMM) => {
    if(!YYYYMM) return '';
    const parts = YYYYMM.split('-');
    return `${monthNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
  };

  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  if (!data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Enterprise Payroll Data...</div>;

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }} className="print-hide">
        <button className="btn" style={{ background: 'var(--surface)', color: 'white' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16}/> Go Back
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16}/> Print Validated Salary Slip
        </button>
      </div>

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .salary-slip-paper { box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="salary-slip-paper" style={{ flex: 1, background: 'white', color: '#1e293b' }}>
        <div className="slip-header">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle color="#4F46E5" size={28} />
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a' }}>AttendX Solutions Enterprise</h1>
          </div>
          <p style={{ margin: 0, color: '#64748b' }}>Payslip for the month of {getMonthName(data.month)}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h3>Employee Master Data</h3>
            <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {data.user.name}</p>
            <p style={{ margin: '0.25rem 0' }}><strong>ID / Username:</strong> {data.user.username}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3>Bank & Tax Node</h3>
            <p style={{ margin: '0.25rem 0' }}><strong>Direct Deposit:</strong> Validated</p>
            <p style={{ margin: '0.25rem 0' }}><strong>Transfer Flow:</strong> Clear</p>
          </div>
        </div>

        <h3>Monthly Attendance Matrix</h3>
        <table className="slip-table">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th>Validated Presents</th>
              <th>Absences</th>
              <th>Half Days</th>
              <th>Approved Leaves</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>{data.attendanceStats.presentDays}</td>
              <td style={{ textAlign: 'center', color: data.attendanceStats.absentDays > 0 ? 'red' : 'inherit' }}>{data.attendanceStats.absentDays}</td>
              <td style={{ textAlign: 'center' }}>{data.attendanceStats.halfDays}</td>
              <td style={{ textAlign: 'center', color: '#10b981' }}>{data.attendanceStats.leaveDays}</td>
            </tr>
          </tbody>
        </table>

        <h3>Earnings & Penalty Breakdown</h3>
        <table className="slip-table">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Calculated Amount ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Contract Base Salary (Assuming 22 standard working days)</td>
              <td style={{ textAlign: 'right' }}>{data.user.baseSalary.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Calculated Daily Wage Rate</td>
              <td style={{ textAlign: 'right', color: '#64748b' }}>{data.calculation.dailyWage} / day</td>
            </tr>
            <tr>
              <td>Calculated Standard Hourly Rate</td>
              <td style={{ textAlign: 'right', color: '#64748b' }}>{data.calculation.hourlyRate} / hour</td>
            </tr>
            <tr>
              <td>Basic Gross Earnings (Present Days + Approved Leaves + 0.5×Half-days)</td>
              <td style={{ textAlign: 'right' }}>{(parseFloat(data.calculation.dailyWage) * parseFloat(data.calculation.effectiveDaysPaid)).toFixed(2)}</td>
            </tr>
            {parseFloat(data.calculation.overtimePay) > 0 && (
              <tr style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                <td><strong>Overtime Compensation (1.5x Hourly Bonus)</strong></td>
                <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>+ {data.calculation.overtimePay}</td>
              </tr>
            )}
            {parseFloat(data.calculation.shortDeduction) > 0 && (
              <tr style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                <td><strong>Short Working Hours Deduction Penalty</strong></td>
                <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 'bold' }}>- {data.calculation.shortDeduction}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
              <td>Final Net Salary Remittance</td>
              <td style={{ textAlign: 'right', color: '#10b981', fontSize: '1.25rem' }}>$ {data.calculation.netSalary}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#94a3b8' }}>Digitally Approved</p>
            <p>Employer Signature</p>
          </div>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <p>Employee Signature</p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

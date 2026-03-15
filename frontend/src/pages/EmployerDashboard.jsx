import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import EmployerIndex from './EmployerIndex';
import ManageEmployees from './ManageEmployees';
import EmployerMonthly from './EmployerMonthly';
import Analytics from './Analytics';

export default function EmployerDashboard() {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<EmployerIndex />} />
          <Route path="/monthly" element={<EmployerMonthly />} />
          <Route path="/employees" element={<ManageEmployees />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </div>
    </div>
  );
}

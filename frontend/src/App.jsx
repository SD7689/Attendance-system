import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import EmployerDashboard from './pages/EmployerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import SalarySlip from './pages/SalarySlip';
import InstallPrompt from './components/InstallPrompt';

// Simple Auth guard
const PrivateRoute = ({ children, roleRequired }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (!token) return <Navigate to="/" />;
  if (roleRequired && user?.role !== roleRequired) return <Navigate to="/" />;
  
  return children;
};

function App() {
  // Register Service Worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('✅ Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.log('⚠️ SW registration failed:', err);
          });
      });
    }
  }, []);

  return (
    <Router>
      <InstallPrompt />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/employer/*" 
          element={
            <PrivateRoute roleRequired="employer">
              <EmployerDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/employee/*" 
          element={
            <PrivateRoute roleRequired="employee">
              <EmployeeDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/salary-slip/:userId/:month" 
          element={
            <PrivateRoute>
              <SalarySlip />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;

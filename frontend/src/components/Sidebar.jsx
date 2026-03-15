import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, LogOut, CheckCircle, BarChart3, Wifi, WifiOff } from 'lucide-react';

export default function Sidebar({ user }) {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="sidebar glass-panel">
      <div style={{ padding: '0 1rem', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <CheckCircle className="text-primary" style={{ color: 'var(--primary)' }} />
          AttendX
        </h2>
        <p style={{ margin: 0, marginTop: '0.5rem', fontSize: '0.875rem' }}>{user.name} ({user.role})</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem', fontSize: '0.7rem', color: isOnline ? 'var(--secondary)' : 'var(--warning)' }}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline Mode'}
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {user.role === 'employer' ? (
          <>
            <NavLink to="/employer" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} /> Today's Log
            </NavLink>
            <NavLink to="/employer/monthly" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={20} /> Monthly Log
            </NavLink>
            <NavLink to="/employer/employees" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={20} /> Manage Employees
            </NavLink>
            <NavLink to="/employer/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BarChart3 size={20} /> Analytics
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/employee" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} /> My Attendance
            </NavLink>
          </>
        )}
      </nav>

      <button className="nav-link" onClick={handleLogout} style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%', padding: '0.75rem 1rem' }}>
        <LogOut size={20} color="var(--danger)" /> 
        <span style={{ color: 'var(--danger)' }}>Logout</span>
      </button>
    </div>
  );
}

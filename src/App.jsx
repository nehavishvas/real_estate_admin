import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStateContext } from './context/StateContext';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import AdminLayout from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import RealtorManagement from './components/RealtorManagement';
import PropertyManagement from './components/PropertyManagement';
import PortalManagement from './components/PortalManagement';
import AiManagement from './components/AiManagement';
import Reports from './components/Reports';
import SettingsComponent from './components/Settings';
import AuditLogs from './components/AuditLogs';
import Profile from './components/Profile';
import ChangePassword from './components/ChangePassword';

export default function App() {
  const { adminUser } = useStateContext();

  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 999999 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0a1f39',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.875rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            borderRadius: '10px'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff'
            }
          }
        }}
      />

      {/* Strict Authentication Guard: Without login, no route or page can be accessed */}
      {!adminUser ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/realtors" element={<RealtorManagement />} />
            <Route path="/properties" element={<PropertyManagement />} />
            <Route path="/portals" element={<PortalManagement />} />
            <Route path="/ai" element={<AiManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsComponent />} />
            <Route path="/logs" element={<AuditLogs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      )}
    </>
  );
}
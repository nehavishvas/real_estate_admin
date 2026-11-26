import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStateContext } from './context/StateContext';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import AdminLayout from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import RealtorManagement from './components/RealtorManagement';
import AgencyManagement from './components/AgencyManagement';
import TierManagement from './components/TierManagement';
import PropertyManagement from './components/PropertyManagement';
import PortalManagement from './components/PortalManagement';
import AiManagement from './components/AiManagement';
import Reports from './components/Reports';
import TermsAndConditions from './components/TermsAndConditions';
import TermsAndConditionsEdit from './components/TermsAndConditionsEdit';
import PrivacyPolicy from './components/PrivacyPolicy';
import PrivacyPolicyEdit from './components/PrivacyPolicyEdit';
import SettingsComponent from './components/Settings';
import AuditLogs from './components/AuditLogs';
import Profile from './components/Profile';
import ChangePassword from './components/ChangePassword';
import HelpSupport from './components/HelpSupport';
import HelpSupportEdit from './components/HelpSupportEdit';

export default function App() {
  const { adminUser } = useStateContext();
  console.log("Date:26-11-2026, Time:-18:25")

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

      {/* Authentication Guard: Terms & Conditions and Privacy Policy can be accessed without login */}
      {!adminUser ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/terms-and-conditions" element={<Navigate to="/terms" replace />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
          <Route path="/help-support" element={<HelpSupport />} />
          <Route path="/help" element={<Navigate to="/help-support" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          {/* Standalone Terms View: Outside AdminLayout so NO sidebar and NO admin header */}
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/terms-and-conditions" element={<Navigate to="/terms" replace />} />
          {/* Standalone Privacy Policy View: Outside AdminLayout so NO sidebar and NO admin header */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
          <Route path="/help-support" element={<HelpSupport />} />
          <Route path="/help" element={<Navigate to="/help-support" replace />} />
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/realtors" element={<RealtorManagement />} />
            <Route path="/agencies" element={<AgencyManagement />} />
            <Route path="/agency" element={<Navigate to="/agencies" replace />} />
            <Route path="/tiers" element={<TierManagement />} />
            <Route path="/tier" element={<Navigate to="/tiers" replace />} />
            <Route path="/properties" element={<PropertyManagement />} />
            <Route path="/portals" element={<PortalManagement />} />
            <Route path="/ai" element={<AiManagement />} />

            <Route path="/reports" element={<Reports />} />
            <Route path="/terms-edit" element={<TermsAndConditionsEdit />} />
            <Route path="/privacy-policy-edit" element={<PrivacyPolicyEdit />} />
            <Route path="/privacy-edit" element={<Navigate to="/privacy-policy-edit" replace />} />
            <Route path="/help-support-edit" element={<HelpSupportEdit />} />
            <Route path="/help-edit" element={<Navigate to="/help-support-edit" replace />} />
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
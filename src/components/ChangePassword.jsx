import React, { useState } from 'react';
import { useStateContext } from '../context/StateContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getCookie } from '../utils/cookies';
import axios from 'axios';

export default function ChangePassword() {
  const { adminUser, addAuditLog } = useStateContext();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const getAuthToken = () => {
    return (
      adminUser?.token ||
      getCookie('token') ||
      getCookie('klever_auth_data')?.data?.accessToken ||
      getCookie('klever_auth_data')?.data?.token ||
      getCookie('klever_auth_data')?.token
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please fill out all fields.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      
      const res = await axios.put(`${baseUrl}/users/change-password`, {
        oldPassword: currentPassword,
        newPassword: newPassword
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res?.data?.success === false) {
        toast.error(res.data?.message || 'Old password is incorrect');
        return;
      }

      addAuditLog('Security', 'Admin changed account login password via API');
      toast.success(res?.data?.message || 'Password updated successfully!');

      // Clean up fields
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error('Failed to change password:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem',
      alignItems: 'center',
      width: '100%',
      // padding: '2rem 0'
    }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '700px' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary btn-sm btn-icon"
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          disabled={loading}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2>Change Account Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Update your account password and security credentials.
          </p>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '700px' }}>
        <form className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleSubmit}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Security Verification</h3>

          <div className="form-group">
            <label className="form-label">Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingRight: '2.75rem' }}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: showCurrentPassword ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingRight: '2.75rem' }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: showNewPassword ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ alignSelf: 'flex-start', gap: '0.5rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? (
              <span>Updating...</span>
            ) : (
              <>
                <Save size={16} />
                <span>Update Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

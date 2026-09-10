import React, { useState, useEffect } from 'react';
import { useStateContext } from '../context/StateContext';
import { useNavigate } from 'react-router-dom';
import { User, Save, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const { adminUser, setAdminUser, addAuditLog } = useStateContext();
  const navigate = useNavigate();

  const [name, setName] = useState(adminUser?.name || '');
  const [username, setUsername] = useState(adminUser?.username || '');
  const [phone, setPhone] = useState(adminUser?.phone || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(adminUser?.avatar || '');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Fetch latest profile details on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!adminUser?.token) return;
      
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${baseUrl}/users/profile`, {
          headers: {
            Authorization: `Bearer ${adminUser.token}`
          }
        });
        
        const userObj = response.data?.data?.user || response.data?.data || response.data?.user || response.data;
        if (userObj) {
          setName(userObj.name || '');
          setUsername(userObj.email || '');
          setPhone(userObj.phone || '');
          
          const rawAvatar = userObj.profileImage || userObj.avatar || '';
          const serverUrl = baseUrl.replace(/\/api$/, '');
          const avatarUrl = rawAvatar 
            ? (rawAvatar.startsWith('http') ? rawAvatar : `${serverUrl}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`)
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
          
          setImagePreview(avatarUrl);

          setAdminUser(prev => ({
            ...prev,
            name: userObj.name || prev.name,
            username: userObj.email || prev.username,
            phone: userObj.phone || prev.phone,
            avatar: avatarUrl,
            rawAvatar: rawAvatar
          }));
        }
      } catch (err) {
        console.error('Failed to load profile via API:', err);
        setError(err.response?.data?.message || err.message || 'Failed to retrieve profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [adminUser?.token]);

  // Synchronize component state to context shifts
  useEffect(() => {
    if (adminUser) {
      setName(adminUser.name || '');
      setUsername(adminUser.username || '');
      setPhone(adminUser.phone || '');
      if (!selectedFile) {
        setImagePreview(adminUser.avatar || '');
      }
    }
  }, [adminUser, selectedFile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !username) {
      toast.error('Name and Email are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', username);
      formData.append('phone', phone);
      if (selectedFile) {
        formData.append('profileImage', selectedFile);
      }

      const response = await axios.put(`${baseUrl}/users/profile`, formData, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      const data = response.data;
      const updatedUser = data.data?.user || data.data || data.user || data;

      const rawAvatar = updatedUser.profileImage || updatedUser.avatar || '';
      const serverUrl = baseUrl.replace(/\/api$/, '');
      const avatarUrl = rawAvatar 
        ? (rawAvatar.startsWith('http') ? rawAvatar : `${serverUrl}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`)
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

      setAdminUser({
        ...adminUser,
        name: updatedUser.name || name,
        username: updatedUser.email || username,
        phone: updatedUser.phone || phone,
        avatar: avatarUrl,
        rawAvatar: rawAvatar
      });

      addAuditLog('User', `Updated admin profile settings via API: ${updatedUser.name}`);
      toast.success('Profile updated successfully!');
      setSelectedFile(null);
    } catch (err) {
      console.error('Failed to save profile settings:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary btn-sm btn-icon"
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2>Admin Profile Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage your personal administrative profile, contact details, and avatar image.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Loading profile data...</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }} className="grid-cols-2">
          {/* Profile Card Summary */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: 'fit-content' }}>
            <img
              src={imagePreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt="Avatar"
              style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--primary)', marginBottom: '1.25rem', boxShadow: 'var(--shadow-md)' }}
            />
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{name || ''}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>{username || ""}</p>
            {phone && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: '0 0 1rem 0' }}>📞 {phone}</p>}
            <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
              {adminUser?.role || 'Admin'}
            </span>
          </div>

          {/* Edit Form */}
          <form className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleSubmit}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Edit Personal Details</h3>
            
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', fontSize: '0.8rem', color: 'hsl(350, 89%, 75%)' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                type="email"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 565474646"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Profile Image (Select from System)</label>
              <input
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handleFileChange}
                style={{ padding: '0.5rem' }}
                disabled={saving}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Choose a PNG, JPG, or WEBP file to upload.
              </span>
            </div>   

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', gap: '0.5rem', marginTop: '0.5rem' }} disabled={saving}>
              {saving ? (
                <>Saving Changes...</>
              ) : (
                <>
                  <Save size={16} />
                  Save Profile Changes
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

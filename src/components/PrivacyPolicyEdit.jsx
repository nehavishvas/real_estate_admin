import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStateContext } from '../context/StateContext';
import { getCookie } from '../utils/cookies';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Shield,
  Edit3,
  Globe,
  Save,
  RotateCcw,
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { formatContentToHtml } from '../utils/termsFormatter';

export default function PrivacyPolicyEdit() {
  const { adminUser, addAuditLog } = useStateContext();
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';

  // Selected language: 'english' | 'spanish'
  const [selectedLanguage, setSelectedLanguage] = useState('english');

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  // Saved data from server (to detect unsaved changes)
  const [savedData, setSavedData] = useState({
    title: '',
    content: '',
    updatedAt: null
  });

  // Async states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // CKEditor 5 refs & state
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);

  // Helper to safely retrieve token (Used for PUT/POST update API)
  const getAuthToken = useCallback(() => {
    if (adminUser?.token) return adminUser.token;
    try {
      const c = getCookie('klever_auth_data');
      if (c) {
        const t = c?.data?.accessToken || c?.data?.token || c?.accessToken || c?.token;
        if (t) return t;
      }
    } catch {}
    try {
      const directToken = getCookie('token');
      if (directToken) return directToken;
    } catch {}
    try {
      const ls = localStorage.getItem('klever_admin_session');
      if (ls) {
        const parsed = JSON.parse(ls);
        const t = parsed?.data?.accessToken || parsed?.token || parsed?.accessToken;
        if (t) return t;
      }
    } catch {}
    try {
      const rawLsToken = localStorage.getItem('token');
      if (rawLsToken) return rawLsToken;
    } catch {}
    return '';
  }, [adminUser?.token]);

  // Determine if there are unsaved modifications
  const hasUnsavedChanges = useMemo(() => {
    return title !== savedData.title || content !== savedData.content;
  }, [title, content, savedData]);

  // Live Statistics
  const stats = useMemo(() => {
    // Strip HTML tags for clean word & character count
    const plain = (content || '').replace(/<[^>]*>/g, ' ').trim();
    const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
    const chars = plain.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTime };
  }, [content]);

  // 1. GET current privacy policy data for editing
  const fetchPrivacyPolicy = useCallback(async (lang = selectedLanguage) => {
    try {
      setLoading(true);

      const token = getAuthToken();
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await axios.get(`${baseUrl}/admin/privacy-policy`, {
        params: { language: lang },
        headers
      });

      const raw = res.data?.data?.privacyPolicy || res.data?.data?.policy || res.data?.data?.privacy || res.data?.data?.terms || res.data?.data || res.data?.privacyPolicy || res.data?.policy || res.data;
      const doc = Array.isArray(raw) ? raw[0] : raw;

      const serverTitle = (doc && typeof doc === 'object') ? (doc.title || doc.heading || '') : '';
      const serverContent = (doc && typeof doc === 'object') ? (doc.content || doc.body || doc.description || '') : (typeof doc === 'string' ? doc : '');
      const serverUpdated = (doc && typeof doc === 'object') ? (doc.updatedAt || doc.updated_at || doc.createdAt || null) : null;

      const htmlContent = formatContentToHtml(serverContent);

      setTitle(serverTitle);
      setContent(htmlContent);
      setUpdatedAt(serverUpdated);

      setSavedData({
        title: serverTitle,
        content: htmlContent,
        updatedAt: serverUpdated
      });

      // Update active CKEditor instance if already mounted
      if (editorInstanceRef.current) {
        editorInstanceRef.current.setData(htmlContent);
      }
    } catch (err) {
      console.error('Failed to fetch privacy policy for editing:', err);
      if (err.response?.status === 404) {
        setTitle('');
        setContent('');
        setUpdatedAt(null);
        setSavedData({ title: '', content: '', updatedAt: null });
        if (editorInstanceRef.current) {
          editorInstanceRef.current.setData('');
        }
      } else {
        const errMsg = err.response?.data?.message || err.message || 'Failed to load privacy policy from server.';
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [baseUrl, selectedLanguage, getAuthToken]);

  useEffect(() => {
    fetchPrivacyPolicy(selectedLanguage);
  }, [selectedLanguage, fetchPrivacyPolicy]);

  // 2. Initialize CKEditor 5 Classic WYSIWYG
  useEffect(() => {
    if (loading) return;

    let destroyed = false;
    let pollTimer = null;

    const initCKEditor = () => {
      if (!window.ClassicEditor || !editorRef.current || editorInstanceRef.current || destroyed) return;

      window.ClassicEditor.create(editorRef.current, {
        toolbar: {
          items: [
            'heading',
            '|',
            'bold',
            'italic',
            '|',
            'bulletedList',
            'numberedList',
            '|',
            'blockQuote',
            'insertTable',
            '|',
            'undo',
            'redo'
          ]
        },
        heading: {
          options: [
            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
          ]
        }
      })
        .then((editor) => {
          if (destroyed) {
            editor.destroy().catch(() => {});
            return;
          }
          editorInstanceRef.current = editor;
          setEditorReady(true);

          const formattedHtml = formatContentToHtml(content);
          editor.setData(formattedHtml);

          editor.model.document.on('change:data', () => {
            const currentData = editor.getData();
            setContent(currentData);
          });
        })
        .catch((err) => {
          console.error('Failed to initialize CKEditor 5 for Privacy Policy:', err);
        });
    };

    if (window.ClassicEditor) {
      initCKEditor();
    } else {
      pollTimer = setInterval(() => {
        if (window.ClassicEditor) {
          clearInterval(pollTimer);
          initCKEditor();
        }
      }, 100);
    }

    return () => {
      destroyed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy().catch(() => {});
        editorInstanceRef.current = null;
        setEditorReady(false);
      }
    };
  }, [loading]);

  // Handle language change with unsaved warning
  const handleLanguageChange = (newLang) => {
    if (newLang === selectedLanguage) return;

    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes in this language. Switching language will discard your edits. Do you wish to continue?'
      );
      if (!confirmSwitch) return;
    }

    setSelectedLanguage(newLang);
  };

  // 3. PUT/POST UPDATE PRIVACY POLICY: /admin/privacy-policy?language=english|spanish (TOKEN REQUIRED)
  const handleSavePrivacyPolicy = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const dataToSave = editorInstanceRef.current ? editorInstanceRef.current.getData() : content;

    if (!title.trim()) {
      toast.error('Please enter a document title.');
      return;
    }

    if (!dataToSave.trim()) {
      toast.error('Please enter the privacy policy content.');
      return;
    }

    try {
      setSaving(true);
      const headers = { 'Content-Type': 'application/json' };
      const token = getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Try PUT update endpoint first, fallback to POST if needed
      let res;
      try {
        res = await axios.put(
          `${baseUrl}/admin/privacy-policy`,
          {
            title: title.trim(),
            content: dataToSave.trim(),
            language: selectedLanguage
          },
          {
            headers,
            params: { language: selectedLanguage }
          }
        );
      } catch (putErr) {
        if (putErr.response?.status === 405 || putErr.response?.status === 404) {
          res = await axios.post(
            `${baseUrl}/admin/privacy-policy`,
            {
              title: title.trim(),
              content: dataToSave.trim(),
              language: selectedLanguage
            },
            {
              headers,
              params: { language: selectedLanguage }
            }
          );
        } else {
          throw putErr;
        }
      }

      const successMsg = res.data?.message || 'Privacy Policy updated successfully!';
      toast.success(successMsg);

      const now = new Date().toISOString();
      setUpdatedAt(now);
      setSavedData({
        title: title.trim(),
        content: dataToSave.trim(),
        updatedAt: now
      });

      if (typeof addAuditLog === 'function') {
        addAuditLog(
          'Privacy & Security',
          `Updated Privacy Policy for ${selectedLanguage === 'spanish' ? 'Spanish' : 'English'}`
        );
      }
    } catch (err) {
      console.error('Failed to update privacy policy:', err);
      if (err.response?.status === 401) {
        toast.error('Admin authentication required. Please log in.');
      } else {
        const errMsg = err.response?.data?.message || err.message || 'Failed to update Privacy Policy.';
        toast.error(errMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Discard local edits
  const handleDiscardChanges = () => {
    if (hasUnsavedChanges) {
      const confirmReset = window.confirm('Are you sure you want to discard your unsaved changes?');
      if (!confirmReset) return;
    }
    setTitle(savedData.title);
    setContent(savedData.content);
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setData(savedData.content);
    }
    toast('Changes discarded.', { icon: 'ℹ️' });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div style={{
              background: 'rgba(250, 179, 25, 0.15)',
              color: 'var(--primary)',
              padding: '0.45rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={20} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Edit Privacy Policy
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage the official Privacy & Security legal document published across SpeddyProp web and mobile platforms.
          </p>
        </div>

        {/* Live sync / unsaved indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {hasUnsavedChanges ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '20px',
                color: '#b45309',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <AlertCircle size={13} />
              <span>Unsaved modifications</span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '20px',
                color: '#047857',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span>Up to date on server</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon"
            onClick={() => fetchPrivacyPolicy(selectedLanguage)}
            disabled={loading}
            title="Reload from server"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Language Switcher Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          background: '#ffffff',
          marginBottom: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Language Version:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'inline-flex', background: '#faf8f5', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => handleLanguageChange('english')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: selectedLanguage === 'english' ? 'var(--primary)' : 'transparent',
                color: selectedLanguage === 'english' ? '#0a1f39' : 'var(--text-secondary)',
                fontWeight: selectedLanguage === 'english' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🇬🇧</span>
              <span>English</span>
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange('spanish')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: selectedLanguage === 'spanish' ? 'var(--primary)' : 'transparent',
                color: selectedLanguage === 'spanish' ? '#0a1f39' : 'var(--text-secondary)',
                fontWeight: selectedLanguage === 'spanish' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🇪🇸</span>
              <span>Español</span>
            </button>
          </div>

          {/* Link to View Privacy Policy page */}
          <Link
            to={`/privacy-policy?language=${selectedLanguage}`}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', height: '36px' }}
          >
            <Eye size={14} />
            <span>View Public Page ({selectedLanguage === 'spanish' ? 'Spanish' : 'English'})</span>
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '4rem 1.5rem', textAlign: 'center', background: '#ffffff', borderRadius: '16px' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
          <h4 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            Loading content for {selectedLanguage === 'spanish' ? 'Spanish' : 'English'}...
          </h4>
        </div>
      ) : (
        /* Edit Form Card */
        <form
          onSubmit={handleSavePrivacyPolicy}
          className="glass-panel"
          style={{
            padding: '2rem',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: '0 4px 25px rgba(10, 31, 57, 0.05)'
          }}
        >
          {/* Document Title Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: '0.875rem' }}>
                Document Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {title.length} / 150 characters
              </span>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Privacy Policy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              required
              style={{ fontWeight: 600, fontSize: '0.95rem' }}
            />
          </div>

          {/* CKEditor 5 WYSIWYG Content Editor */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: '0.875rem' }}>
                Privacy Policy Content <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {stats.words} words • {stats.chars} characters
              </span>
            </div>

            <div className="ckeditor-wrapper" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div ref={editorRef} />
            </div>
          </div>

          {/* Form Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDiscardChanges}
                disabled={saving || !hasUnsavedChanges}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <RotateCcw size={13} />
                <span>Reset Changes</span>
              </button>

              <Link
                to={`/privacy-policy?language=${selectedLanguage}`}
                className="btn btn-ghost btn-sm"
                style={{ textDecoration: 'none' }}
              >
                Cancel
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                API: PUT /admin/privacy-policy?language={selectedLanguage}
              </span>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.4rem',
                  fontWeight: 700
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Update Content (Save)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* CKEditor Custom Styles */}
      <style>{`
        .ckeditor-wrapper .ck-editor__editable {
          min-height: 420px !important;
          max-height: 700px !important;
          font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif) !important;
          font-size: 0.95rem !important;
          line-height: 1.8 !important;
          color: var(--text-secondary, #2c3e50) !important;
          padding: 1.5rem !important;
        }
        .ckeditor-wrapper .ck-toolbar {
          background: #faf8f5 !important;
          border-color: rgba(10, 31, 57, 0.12) !important;
          border-top-left-radius: 12px !important;
          border-top-right-radius: 12px !important;
        }
        .ckeditor-wrapper .ck.ck-editor__main>.ck-editor__editable:not(.ck-focused) {
          border-color: rgba(10, 31, 57, 0.12) !important;
          border-bottom-left-radius: 12px !important;
          border-bottom-right-radius: 12px !important;
        }
        .ckeditor-wrapper .ck.ck-editor__main>.ck-editor__editable.ck-focused {
          border-color: var(--primary, #fab319) !important;
          box-shadow: 0 0 0 3px rgba(250, 179, 25, 0.15) !important;
        }
        .ckeditor-wrapper .ck-content h1,
        .ckeditor-wrapper .ck-content h2,
        .ckeditor-wrapper .ck-content h3 {
          color: var(--text-primary, #0a1f39) !important;
          font-weight: 700 !important;
        }
        .ckeditor-wrapper .ck-content strong,
        .ckeditor-wrapper .ck-content b {
          color: var(--text-primary, #0a1f39) !important;
          font-weight: 700 !important;
        }
        .ckeditor-wrapper .ck-content p {
          margin-bottom: 1rem !important;
        }
      `}</style>
    </div>
  );
}

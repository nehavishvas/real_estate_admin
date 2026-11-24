import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import {
  Building,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Download,
  Search,
  Filter,
  FileText,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  Loader2,
  Upload,
  RefreshCw,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Eye,
  ExternalLink,
  X,
  MessageSquare,
  Users,
  Award,
  Sparkles,
  Flame,
  MapPin,
  CreditCard,
  DollarSign,
  Calendar,
  Home,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ShieldCheck,
  Globe
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';
const defaultImageUrl = import.meta.env.VITE_IMAGE_URL || 'https://mobappssolutiondevelopment.com/kleverProp';

// Helper to safely extract string values from strings or nested objects
const safeRenderText = (val, fallback = '—') => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return val.name || val.agencyName || val.title || val.en || val.es || val.number || val.licenseNumber || val.value || fallback;
  }
  return String(val);
};

// Color palette generator for consistent monogram initial avatar circles
const getAvatarColors = (name = '') => {
  const palettes = [
    { bg: 'linear-gradient(135deg, rgba(250, 179, 25, 0.22) 0%, rgba(250, 179, 25, 0.42) 100%)', text: '#b47404', border: 'var(--primary)' },
    { bg: 'linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(14, 165, 233, 0.35) 100%)', text: '#0284c7', border: '#38bdf8' },
    { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.35) 100%)', text: '#059669', border: '#34d399' },
    { bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0.35) 100%)', text: '#7c3aed', border: '#a78bfa' },
    { bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, rgba(244, 63, 94, 0.35) 100%)', text: '#e11d48', border: '#fb7185' },
    { bg: 'linear-gradient(135deg, rgba(10, 31, 57, 0.15) 0%, rgba(10, 31, 57, 0.28) 100%)', text: '#0a1f39', border: '#64748b' }
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palettes[Math.abs(hash) % palettes.length];
};

// Helper to generate candidate URLs with robust normalization using VITE_IMAGE_URL
const getMediaUrlCandidates = (mediaPath, baseUrl = defaultApiBaseUrl, imageUrl = defaultImageUrl) => {
  if (!mediaPath) return [];
  if (typeof mediaPath === 'object') {
    mediaPath = mediaPath.url || mediaPath.secure_url || mediaPath.path || mediaPath.uri || mediaPath.src || '';
  }
  if (!mediaPath || typeof mediaPath !== 'string') return [];

  let clean = mediaPath.trim().replace(/\\/g, '/');
  if (!clean) return [];

  if (clean.startsWith('blob:') || clean.startsWith('data:')) {
    return [clean];
  }

  const baseImage = (import.meta.env.VITE_IMAGE_URL || imageUrl || (baseUrl || defaultApiBaseUrl).replace(/\/api\/?$/, '')).replace(/\/+$/, '');

  // Strip any legacy local dev IPs or localhost from database records
  if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?\//i.test(clean)) {
    clean = clean.replace(/^https?:\/\/[^/]+/i, '');
  }

  // If already a valid remote URL (e.g. CloudFront, S3), return it directly
  if (/^https?:\/\//i.test(clean)) {
    return [clean];
  }

  // Extract clean uploads relative path
  let relPath = clean;
  if (/^[a-zA-Z]:\//i.test(relPath) || relPath.includes('/uploads/')) {
    const match = relPath.match(/(uploads\/.*)$/i);
    if (match) relPath = match[1];
  }
  relPath = relPath.replace(/^\/+/, '')
                   .replace(/^(kleverProp\/)+/i, '')
                   .replace(/^(api\/)+/i, '')
                   .replace(/^public\//i, '');

  const uploadsPath = relPath.includes('uploads/')
    ? relPath.slice(relPath.indexOf('uploads/'))
    : (relPath.startsWith('uploads') ? relPath : 'uploads/' + relPath);

  // Return primary normalized URL with .env VITE_IMAGE_URL
  return [
    `${baseImage}/${uploadsPath}`,
    `${baseImage}/${relPath}`
  ];
};

// Primary Media URL Helper
const getMediaUrl = (mediaPath, baseUrl = defaultApiBaseUrl, imageUrl = defaultImageUrl) => {
  const list = getMediaUrlCandidates(mediaPath, baseUrl, imageUrl);
  return list.length > 0 ? list[0] : null;
};

// Resilient Realtor Avatar with smooth error fallback to monogram circle
const RealtorAvatar = ({ src, name = 'Agent', size = 38, fontSize = '0.9rem', border = '2px solid var(--primary)', style = {}, baseUrl = defaultApiBaseUrl, imageUrl = defaultImageUrl }) => {
  const [imgError, setImgError] = useState(false);
  const formattedUrl = useMemo(() => getMediaUrl(src, baseUrl, imageUrl), [src, baseUrl, imageUrl]);

  useEffect(() => {
    setImgError(false);
  }, [formattedUrl]);

  const initial = (name && typeof name === 'string' && name.trim() && name !== '—') ? name.trim().charAt(0).toUpperCase() : 'A';
  const colors = getAvatarColors(name);

  if (formattedUrl && !imgError) {
    return (
      <img
        src={formattedUrl}
        alt={name}
        onError={() => setImgError(true)}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          border,
          flexShrink: 0,
          background: '#f1f5f9',
          ...style
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: colors.bg,
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize,
        color: colors.text,
        flexShrink: 0,
        userSelect: 'none',
        ...style
      }}
      title={name}
    >
      {initial}
    </div>
  );
};

// Dedicated, Resilient Document Review & Lightbox Component
const RealtorDocumentSection = ({ agent, details, baseUrl = defaultApiBaseUrl }) => {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  // Extract all uploaded documents from agent details
  const documentsList = useMemo(() => {
    const list = [];
    const agentObj = details?.agent || details || agent || {};

    // 1. ID Document Front (Passport / Cedula)
    if (agentObj.idDocumentFront) {
      list.push({
        id: 'idFront',
        name: `${agentObj.idType || 'ID / Passport'} (Front)`,
        category: 'Legal Identification',
        number: agentObj.idNumber,
        path: agentObj.idDocumentFront
      });
    }

    // 2. ID Document Back
    if (agentObj.idDocumentBack) {
      list.push({
        id: 'idBack',
        name: `${agentObj.idType || 'ID / Passport'} (Back)`,
        category: 'Legal Identification',
        number: agentObj.idNumber,
        path: agentObj.idDocumentBack
      });
    }

    // 3. AEI Membership Card (Dominican Real Estate Association)
    if (agentObj.aeiCard) {
      list.push({
        id: 'aeiCard',
        name: 'AEI Membership Card',
        category: 'Association License',
        number: agentObj.aeiNumber,
        path: agentObj.aeiCard
      });
    }

    // 4. Agency Accreditation Letter
    if (agentObj.accreditationLetter) {
      list.push({
        id: 'accreditationLetter',
        name: 'Agency Accreditation Letter',
        category: 'Agency Verification',
        number: agentObj.employeeId,
        path: agentObj.accreditationLetter
      });
    }

    // 5. Legacy & alternative candidate document fields
    const legacyCandidates = [
      { path: agentObj.document, name: 'License / Verification Document' },
      { path: agentObj.documentUrl, name: 'Document on File' },
      { path: agentObj.verificationDocument, name: 'Verification Document' },
      { path: agentObj.licenseDocument, name: 'License Document' },
      { path: agentObj.certificate, name: 'Accreditation Certificate' },
      { path: agentObj.licenseDoc, name: 'License Doc' },
      { path: agentObj.licenseFile, name: 'License File' },
      { path: agentObj.doc, name: 'Uploaded Doc' },
      { path: agentObj.idProof, name: 'Identity Proof' },
      { path: agentObj.identityDocument, name: 'Identity Document' }
    ];

    if (Array.isArray(agentObj.documents)) {
      agentObj.documents.forEach((doc, idx) => {
        if (!doc) return;
        const p = typeof doc === 'string' ? doc.trim() : (doc.url || doc.path || doc.uri || '');
        if (p) legacyCandidates.push({ path: p, name: doc.name || `Document ${idx + 1}` });
      });
    }

    legacyCandidates.forEach((cand, idx) => {
      const p = typeof cand.path === 'string' ? cand.path.trim() : (cand.path?.url || cand.path?.path || '');
      if (p && !list.some(item => item.path === p)) {
        list.push({
          id: `legacy_${idx}`,
          name: cand.name,
          category: 'Supporting Documentation',
          path: p
        });
      }
    });

    return list;
  }, [agent, details]);

  // Ensure activeDocIndex stays within bounds
  useEffect(() => {
    if (activeDocIndex >= documentsList.length && documentsList.length > 0) {
      setActiveDocIndex(0);
    }
  }, [documentsList.length, activeDocIndex]);

  const activeDoc = documentsList[activeDocIndex] || documentsList[0] || null;
  const rawDoc = activeDoc?.path || null;

  const candidates = useMemo(() => getMediaUrlCandidates(rawDoc, baseUrl), [rawDoc, baseUrl]);
  const activeUrl = candidates[candidateIndex] || (rawDoc ? getMediaUrl(rawDoc, baseUrl) : null);

  useEffect(() => {
    setCandidateIndex(0);
    setHasError(false);
    setIsImgLoaded(false);
    setZoom(1);
    setRotation(0);
  }, [rawDoc, activeDocIndex]);

  const handleImgError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex(prev => prev + 1);
      setIsImgLoaded(false);
    } else {
      setHasError(true);
      setIsImgLoaded(false);
    }
  };

  const handleImgLoad = () => {
    setIsImgLoaded(true);
    setHasError(false);
  };

  const isPdf = Boolean(rawDoc && (/\.pdf($|\?)/i.test(rawDoc) || rawDoc.toLowerCase().includes('application/pdf')));
  const isImage = Boolean(rawDoc && !isPdf);

  const docFileName = useMemo(() => {
    if (!rawDoc) return 'document.png';
    const clean = rawDoc.split('?')[0].replace(/\\/g, '/');
    const parts = clean.split('/');
    return parts[parts.length - 1] || 'Verification Document';
  }, [rawDoc]);

  const handleDownload = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetUrl = activeUrl || getMediaUrl(rawDoc, baseUrl);
    if (!targetUrl) return;

    try {
      setDownloading(true);
      toast.loading(`Downloading ${activeDoc?.name || 'document'}...`, { id: 'doc-download' });
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = docFileName || 'document.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      toast.success(`${activeDoc?.name || 'Document'} downloaded successfully`, { id: 'doc-download' });
    } catch (err) {
      console.warn('Direct blob download fallback:', err);
      try {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.setAttribute('download', docFileName || 'document.png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.dismiss('doc-download');
      } catch {
        window.open(targetUrl, '_blank');
        toast.dismiss('doc-download');
      }
    } finally {
      setDownloading(false);
    }
  };

  if (documentsList.length === 0) {
    return (
      <div style={{
        background: '#faf8f5',
        border: '1px solid var(--border-color)',
        padding: '1.75rem 1.25rem',
        borderRadius: '12px',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }}>
        <FileText size={42} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
        <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700 }}>
          No Verification Documents Uploaded
        </h4>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
          This realtor has not uploaded any official identification or accreditation documents yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{
        background: '#faf8f5',
        border: '1px solid var(--border-color)',
        padding: '1.25rem',
        borderRadius: '12px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(250, 179, 25, 0.12)', color: '#b47404', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            <FileCheck size={14} /> Official Verification Documents ({documentsList.length} files attached)
          </div>
          <h4 style={{ color: 'var(--text-primary)', margin: '0 0 0.25rem', fontSize: '1.05rem', fontWeight: 700 }}>
            {activeDoc?.name || 'Realtor Credentials'}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            {activeDoc?.category || 'Official licensing and accreditation document on file for this realtor.'}
          </p>
          {activeDoc?.number && (
            <p style={{ fontSize: '0.78rem', color: '#b47404', fontWeight: 600, margin: '0.2rem 0 0' }}>
              Reference ID: <code style={{ fontFamily: 'monospace', fontWeight: 700, background: 'rgba(250, 179, 25, 0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{activeDoc.number}</code>
            </p>
          )}
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0', fontFamily: 'monospace' }}>
            File: {docFileName}
          </p>
        </div>

        {/* Multi-Document Selector Pills */}
        {documentsList.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            overflowX: 'auto',
            padding: '0.4rem 0.6rem',
            background: 'rgba(10, 31, 57, 0.04)',
            borderRadius: '10px',
            maxWidth: '100%',
            scrollbarWidth: 'thin',
            width: '100%',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {documentsList.map((doc, idx) => {
              const isSelected = idx === activeDocIndex;
              return (
                <button
                  key={doc.id || idx}
                  type="button"
                  onClick={() => setActiveDocIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary)' : '#ffffff',
                    color: isSelected ? '#0a1f39' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? '0 2px 6px rgba(250, 179, 25, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileCheck size={13} />
                  <span>{doc.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Preview Container */}
        <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
          {isPdf ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1.5rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <FileText size={48} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                PDF Document Attached
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {docFileName}
              </span>
            </div>
          ) : isImage && !hasError ? (
            <div
              onClick={() => setShowLightbox(true)}
              style={{
                position: 'relative',
                display: 'inline-block',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                maxWidth: '100%'
              }}
              title="Click to view full size"
            >
              {!isImgLoaded && (
                <div style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" />
                  <span style={{ fontSize: '0.75rem' }}>Loading {activeDoc?.name || 'document'}...</span>
                </div>
              )}
              <img
                src={activeUrl}
                alt={activeDoc?.name || 'Verification Document'}
                onLoad={handleImgLoad}
                onError={handleImgError}
                style={{
                  maxWidth: '100%',
                  maxHeight: '220px',
                  objectFit: 'contain',
                  display: isImgLoaded ? 'block' : 'none',
                  transition: 'transform 0.2s ease',
                  margin: '0 auto'
                }}
              />
              {isImgLoaded && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(10, 31, 57, 0.75)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <Maximize2 size={11} /> Click to Enlarge
                </div>
              )}
            </div>
          ) : (
            /* Fallback Card if image failed across all candidate URLs */
            <div style={{
              background: '#ffffff',
              border: '1px solid #fed7aa',
              borderRadius: '10px',
              padding: '1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <FileCheck size={38} style={{ color: '#ea580c' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Document Stored on Server
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-all', textAlign: 'center' }}>
                {docFileName}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#c2410c', background: '#fff7ed', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                Click below to view or download directly
              </span>
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowLightbox(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <Eye size={14} /> View Document
          </button>
          <a
            href={activeUrl || getMediaUrl(rawDoc, baseUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <ExternalLink size={14} /> Open in New Tab
          </a>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer' }}
            title="Download Document"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>

      {/* In-App Full-Screen Document Lightbox Modal */}
      {showLightbox && createPortal(
        <div
          className="modal-overlay"
          style={{ zIndex: 1200, background: 'rgba(10, 31, 57, 0.88)', backdropFilter: 'blur(10px)' }}
          onClick={() => setShowLightbox(false)}
        >
          <div
            style={{
              width: '92vw',
              maxWidth: '920px',
              height: '88vh',
              background: '#ffffff',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#faf8f5',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FileCheck size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activeDoc?.name || 'Realtor Document'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {safeRenderText(agent?.name || details?.name)} • {docFileName}
                    {documentsList.length > 1 && (
                      <span style={{ marginLeft: '0.5rem', fontWeight: 600, color: 'var(--primary)' }}>
                        ({activeDocIndex + 1} of {documentsList.length})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {documentsList.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveDocIndex(prev => (prev > 0 ? prev - 1 : documentsList.length - 1))}
                      title="Previous Document"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveDocIndex(prev => (prev < documentsList.length - 1 ? prev + 1 : 0))}
                      title="Next Document"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                )}
                {isImage && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon"
                      onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
                      title="Zoom In"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon"
                      onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                      title="Zoom Out"
                    >
                      <ZoomOut size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon"
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      title="Rotate Clockwise"
                    >
                      <RotateCw size={15} />
                    </button>
                    {(zoom !== 1 || rotation !== 0) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setZoom(1); setRotation(0); }}
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                      >
                        Reset
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-icon"
                  onClick={handleDownload}
                  disabled={downloading}
                  title="Download Document"
                >
                  {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                </button>
                <a
                  href={activeUrl || getMediaUrl(rawDoc, baseUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm btn-icon"
                  title="Open in New Tab"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => setShowLightbox(false)}
                  title="Close Viewer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Lightbox Body */}
            <div style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflow: 'auto',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0f172a'
            }}>
              {isPdf ? (
                <iframe
                  src={activeUrl || getMediaUrl(rawDoc, baseUrl)}
                  title="License Document PDF"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#ffffff'
                  }}
                />
              ) : (
                <img
                  src={activeUrl || getMediaUrl(rawDoc, baseUrl)}
                  alt={activeDoc?.name || 'Document Preview'}
                  onError={handleImgError}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                    background: '#ffffff'
                  }}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default function RealtorManagement() {
  const {
    adminUser,
    handleUpdateRealtor: onUpdateRealtor,
    addAuditLog: onAddAuditLog
  } = useStateContext();

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';

  // API Agent List & State
  const [agentsList, setAgentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores agent ID during row action

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  });

  // Filter States (status=pending, approved, rejected, suspended)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'pending' | 'approved' | 'rejected' | 'suspended'

  // Modals State
  const [selectedAgent, setSelectedAgent] = useState(null); // Basic agent object from row
  const [agentDetails, setAgentDetails] = useState(null); // Full { agent, leads, stats } from GET /admin/agents/:id
  const [activeViewTab, setActiveViewTab] = useState('credentials'); // 'credentials' (default) | 'leads'
  const [leadStatusFilter, setLeadStatusFilter] = useState('All'); // 'All' | 'pending' | 'contacted' | 'won'
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null); // For Edit Agent Modal
  const [agentToDelete, setAgentToDelete] = useState(null); // For Delete Agent Modal
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Status Change Modal State (Opened by clicking the status action button in the row)
  const [statusModalAgent, setStatusModalAgent] = useState(null);
  const [statusModalValue, setStatusModalValue] = useState('approved');
  const [statusModalReason, setStatusModalReason] = useState('');
  const [statusModalLoading, setStatusModalLoading] = useState(false);

  // Rejection State in Document Review
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Edit Form Fields (PUT /admin/agents/edit/:id or DELETE /admin/agents/edit/:id)
  const [agenciesList, setAgenciesList] = useState([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAgencyName, setFormAgencyName] = useState('');
  const [formLicenseNumber, setFormLicenseNumber] = useState('');
  const [formStatus, setFormStatus] = useState('approved'); // 'pending' | 'approved' | 'rejected' | 'suspended'
  const [formProfileImageFile, setFormProfileImageFile] = useState(null);
  const [formProfileImagePreview, setFormProfileImagePreview] = useState('');
  const [formDocumentFile, setFormDocumentFile] = useState(null);
  const [formDocumentName, setFormDocumentName] = useState('');

  // Search debounce ref
  const searchTimeoutRef = useRef(null);



  // Normalize status string to lowercase ('approved', 'pending', 'rejected', 'suspended')
  const normalizeStatus = (status) => {
    if (!status) return 'pending';
    const s = String(status).toLowerCase().trim();
    if (s === 'verified' || s === 'approved') return 'approved';
    if (s === 'suspended') return 'suspended';
    if (s === 'rejected') return 'rejected';
    return 'pending';
  };

  // Status Badge UI (Clean text display without background fill)
  const renderStatusBadge = (status, isActive) => {
    if (isActive === false) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'hsl(350, 89%, 45%)'
          }}
        >
          <UserX size={13} /> Inactive
        </span>
      );
    }
    const norm = normalizeStatus(status);
    if (norm === 'approved') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'hsl(142, 70%, 35%)'
          }}
        >
          <CheckCircle size={13} /> Approved
        </span>
      );
    }
    if (norm === 'pending') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'hsl(38, 92%, 40%)'
          }}
        >
          <Clock size={13} /> Pending
        </span>
      );
    }
    if (norm === 'suspended') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'hsl(350, 89%, 45%)'
          }}
        >
          <UserX size={13} /> Suspended
        </span>
      );
    }
    if (norm === 'rejected') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'hsl(350, 89%, 45%)'
          }}
        >
          <XCircle size={13} /> Rejected
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'transparent',
          border: 'none',
          padding: 0,
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: isActive !== false ? 'hsl(142, 70%, 35%)' : 'hsl(350, 89%, 45%)'
        }}
      >
        {isActive !== false ? <CheckCircle size={13} /> : <UserX size={13} />} {isActive !== false ? 'Active' : 'Inactive'}
      </span>
    );
  };

  // Lead Status Badge UI
  const renderLeadStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') {
      return <span className="badge badge-info" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>Approved</span>;
    }
    if (s === 'completed' || s === 'won') {
      return <span className="badge badge-success" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>{s === 'won' ? 'Won' : 'Completed'}</span>;
    }
    if (s === 'pending') {
      return <span className="badge badge-warning" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>Pending</span>;
    }
    if (s === 'rejected') {
      return <span className="badge badge-danger" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>Rejected</span>;
    }
    if (s === 'contacted') {
      return <span className="badge badge-info" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>Contacted</span>;
    }
    return <span className="badge badge-secondary" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>{status || 'Inquiry'}</span>;
  };

  // AI Lead Sheet Quality Badge UI
  const renderLeadQualityBadge = (quality) => {
    const q = (quality || '').toUpperCase();
    if (q === 'HOT') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.15rem 0.55rem',
            borderRadius: '9999px',
            fontSize: '0.68rem',
            fontWeight: 700,
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.28)',
            letterSpacing: '0.03em'
          }}
        >
          <Flame size={12} style={{ color: '#ef4444' }} /> HOT LEAD
        </span>
      );
    }
    if (q === 'WARM') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.15rem 0.55rem',
            borderRadius: '9999px',
            fontSize: '0.68rem',
            fontWeight: 700,
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#d97706',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            letterSpacing: '0.03em'
          }}
        >
          <Sparkles size={12} style={{ color: '#f59e0b' }} /> WARM LEAD
        </span>
      );
    }
    if (q === 'COLD') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.15rem 0.55rem',
            borderRadius: '9999px',
            fontSize: '0.68rem',
            fontWeight: 700,
            background: 'rgba(100, 116, 139, 0.12)',
            color: '#475569',
            border: '1px solid rgba(100, 116, 139, 0.28)',
            letterSpacing: '0.03em'
          }}
        >
          COLD LEAD
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.15rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.68rem',
          fontWeight: 700,
          background: 'rgba(10, 31, 57, 0.08)',
          color: 'var(--text-secondary)',
          border: '1px solid rgba(10, 31, 57, 0.15)'
        }}
      >
        <Sparkles size={11} /> {quality || 'AI ANALYZED'}
      </span>
    );
  };

  // 1. GET ALL AGENTS WITH PAGINATION & STATUS FILTER: /admin/agents?status=pending,approved,rejected,suspended
  const fetchAgents = useCallback(async (
    targetPage = currentPage,
    targetLimit = limit,
    targetStatus = statusFilter,
    search = searchTerm
  ) => {
    if (!adminUser?.token) return;
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: targetLimit
      };

      if (targetStatus && targetStatus !== 'All') {
        params.status = targetStatus.toLowerCase();
      }

      if (search && search.trim()) {
        params.search = search.trim();
      }

      const res = await axios.get(`${baseUrl}/admin/agents`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        },
        params
      });

      const rawAgents = res.data?.data?.agents || res.data?.agents || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const paginationData = res.data?.data?.pagination || res.data?.pagination || {
        total: rawAgents.length,
        page: targetPage,
        limit: targetLimit,
        pages: Math.ceil(rawAgents.length / targetLimit) || 1
      };

      const mapped = rawAgents.map(a => {
        const idVal = a._id || a.id;
        const normStatus = normalizeStatus(a.status);
        const nameVal = safeRenderText(a.name, '—');
        const emailVal = safeRenderText(a.email, '—');
        const phoneVal = safeRenderText(a.phone, '');
        const agencyVal = safeRenderText(a.agencyName || a.agency, '—');
        const licenseVal = safeRenderText(a.licenseNumber || a.liceneseNumber || a.license, '—');

        const isActiveVal = a.isActive !== undefined ? Boolean(a.isActive) : (a.status ? normStatus === 'approved' : true);

        return {
          _id: idVal,
          id: idVal,
          name: nameVal,
          email: emailVal,
          phone: phoneVal,
          agency: agencyVal,
          agencyName: agencyVal,
          license: licenseVal,
          licenseNumber: licenseVal,
          status: normStatus,
          rawStatus: a.status,
          isActive: isActiveVal,
          tier: a.tier || a.agency?.tier || null,
          profileImage: a.profileImage || a.profile_image || a.profilePic || a.avatar || a.image || a.photo || a.agentImage || (a.user?.profileImage) || (a.user?.avatar) || (a.userId?.profileImage) || '',
          document: a.document || a.documentUrl || a.verificationDocument || a.licenseDocument || a.licenseDoc || a.certificate || a.idProof || a.doc || (Array.isArray(a.documents) ? a.documents[0] : a.documents) || (a.user?.document) || (a.user?.verificationDocument) || (typeof a.license === 'string' && /\.(png|jpg|jpeg|webp|pdf)$/i.test(a.license) ? a.license : '') || '',
          verificationDate: a.verificationDate || a.updatedAt || null,
          createdAt: a.createdAt || null,
          rejectionReason: a.rejectionReason || '',
          raw: a
        };
      });

      setAgentsList(mapped);
      setPagination(paginationData);
      setCurrentPage(paginationData.page || targetPage);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch realtors from server');
      setAgentsList([]);
      setPagination({ total: 0, page: 1, limit: targetLimit, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [adminUser?.token, baseUrl, currentPage, limit, statusFilter, searchTerm]);

  // Fetch Agencies list from API for dropdown selection
  const fetchAgencies = useCallback(async () => {
    if (!adminUser?.token) return;
    try {
      setAgenciesLoading(true);
      const headers = { Authorization: `Bearer ${adminUser.token}` };
      const candidateEndpoints = [
        `${baseUrl}/admin/agency`,
        `${baseUrl}/admin/agencies`,
        `${baseUrl}/admin/agency/all`,
        `${baseUrl}/agency`
      ];

      let rawAgencies = null;
      for (const endpoint of candidateEndpoints) {
        try {
          const response = await axios.get(endpoint, { headers });
          const candidateData = response.data?.data?.agencies || response.data?.agencies || response.data?.data || response.data;
          if (Array.isArray(candidateData)) {
            rawAgencies = candidateData;
            break;
          }
        } catch {
          // continue fallback
        }
      }

      if (Array.isArray(rawAgencies)) {
        setAgenciesList(rawAgencies);
      }
    } catch (err) {
      console.error('Failed to fetch agencies for dropdown:', err);
    } finally {
      setAgenciesLoading(false);
    }
  }, [adminUser?.token, baseUrl]);

  // Initial Fetch & Dependency Triggers
  useEffect(() => {
    fetchAgents(currentPage, limit, statusFilter, searchTerm);
    fetchAgencies();
  }, [adminUser?.token, currentPage, limit, statusFilter, fetchAgencies]);

  // Search input change with debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchAgents(1, limit, statusFilter, value);
    }, 350);
  };

  // Status Filter change: status=pending, approved, rejected, suspended
  const handleStatusFilterChange = (e) => {
    const newStatus = e.target.value;
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchAgents(1, limit, newStatus, searchTerm);
  };

  // Page Navigation Handlers
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > (pagination.pages || 1) || newPage === currentPage) return;
    setCurrentPage(newPage);
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimit(newLimit);
    setCurrentPage(1);
    fetchAgents(1, newLimit, statusFilter, searchTerm);
  };

  // 2. GET AGENT BY ID: /admin/agents/:id (Loads detailed Agent + Leads + Stats)
  const handleInspectAgent = async (agent, defaultTab = 'credentials') => {
    setSelectedAgent(agent);
    setAgentDetails(null);
    setShowRejectForm(false);
    setRejectReason('');
    setLeadStatusFilter('All');
    setActiveViewTab(defaultTab);
    setDrawerLoading(true);

    const agentId = agent._id || agent.id;
    try {
      const res = await axios.get(`${baseUrl}/admin/agents/${agentId}`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });
      const resData = res.data?.data || res.data || {};
      setAgentDetails(resData);
    } catch (err) {
      console.error('Failed to load detailed agent profile:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch full agent details');
    } finally {
      setDrawerLoading(false);
    }
  };

  // 3. CHANGE STATUS OF AGENTS: PUT /admin/agents/:id/status (Parameter: status)
  const handleChangeStatus = async (agent, nextStatus, customReason = '') => {
    const agentId = agent._id || agent.id;
    if (!adminUser?.token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setActionLoading(agentId);
      const payload = {
        status: nextStatus
      };
      if (customReason) {
        payload.rejectionReason = customReason;
        payload.reason = customReason;
      }

      const res = await axios.put(`${baseUrl}/admin/agents/${agentId}/status`, payload, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      const displayStatus = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
      toast.success(res.data?.message || `Agent status updated to ${displayStatus}`);

      // Update state locally
      setAgentsList(prev => prev.map(a => {
        if ((a._id || a.id) === agentId) {
          return {
            ...a,
            status: nextStatus,
            rejectionReason: customReason || a.rejectionReason,
            verificationDate: nextStatus === 'approved' ? new Date().toISOString().split('T')[0] : a.verificationDate
          };
        }
        return a;
      }));

      // If view modal is open for this agent, update it
      if (selectedAgent && (selectedAgent._id || selectedAgent.id) === agentId) {
        setSelectedAgent(prev => ({
          ...prev,
          status: nextStatus,
          rejectionReason: customReason || prev.rejectionReason
        }));
        if (agentDetails?.agent) {
          setAgentDetails(prev => ({
            ...prev,
            agent: {
              ...prev.agent,
              status: nextStatus
            }
          }));
        }
      }

      // Context sync & audit log
      if (typeof onUpdateRealtor === 'function') {
        onUpdateRealtor({
          ...agent,
          status: displayStatus,
          rejectionReason: customReason
        });
      }
      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Realtor', `Updated agent status for ${agent.name} (${agent.agency || agent.agencyName}) to ${displayStatus}`);
      }

      setShowRejectForm(false);
      setRejectReason('');
      if (nextStatus === 'approved' || nextStatus === 'rejected') {
        setSelectedAgent(null);
      }
    } catch (err) {
      console.error('Failed to update agent status:', err);
      toast.error(err.response?.data?.message || 'Failed to update agent status on server');
    } finally {
      setActionLoading(null);
    }
  };

  // Open the dedicated Status Change Modal (called by the action button in the row)
  const handleOpenStatusModal = (agent) => {
    setStatusModalAgent(agent);
    setStatusModalValue(normalizeStatus(agent.status));
    setStatusModalReason(agent.rejectionReason || '');
  };

  // Save status from dedicated Status Change Modal
  const handleSaveStatusModal = async (e) => {
    e.preventDefault();
    if (!statusModalAgent) return;
    if (statusModalValue === 'rejected' && !statusModalReason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }
    try {
      setStatusModalLoading(true);
      await handleChangeStatus(statusModalAgent, statusModalValue, statusModalReason.trim());
      setStatusModalAgent(null);
    } finally {
      setStatusModalLoading(false);
    }
  };

  // 4. DELETE AGENT: DELETE /admin/agents/:id
  const handleDeleteClick = (agent) => {
    setAgentToDelete(agent);
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    const agentId = agentToDelete._id || agentToDelete.id;
    if (!adminUser?.token) {
      toast.error('Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setDeleteLoading(true);
      setActionLoading(agentId);

      const res = await axios.delete(`${baseUrl}/admin/agents/${agentId}`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`
        }
      });

      toast.success(res.data?.message || `Agent ${agentToDelete.name} deleted successfully`);

      setAgentsList(prev => prev.filter(a => (a._id || a.id) !== agentId));
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, (prev.total || 1) - 1)
      }));

      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Realtor', `Permanently deleted agent account ${agentToDelete.name} (ID: ${agentId})`);
      }

      if (selectedAgent && (selectedAgent._id || selectedAgent.id) === agentId) {
        setSelectedAgent(null);
        setAgentDetails(null);
      }

      setAgentToDelete(null);

      if (agentsList.length <= 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      console.error('Failed to delete agent:', err);
      toast.error(err.response?.data?.message || 'Failed to delete agent from server');
    } finally {
      setDeleteLoading(false);
      setActionLoading(null);
    }
  };

  // 5. UPDATE AGENT: /admin/agents/edit/:id
  const handleEditClick = (agent) => {
    setEditingAgent(agent);
    setFormName(agent.name !== '—' ? safeRenderText(agent.name, '') : '');
    setFormEmail(agent.email !== '—' ? safeRenderText(agent.email, '') : '');
    setFormPhone(safeRenderText(agent.phone, ''));
    setFormAgencyName(agent.agencyName !== '—' ? safeRenderText(agent.agencyName || agent.agency, '') : '');
    setFormLicenseNumber(agent.licenseNumber !== '—' ? safeRenderText(agent.licenseNumber || agent.license, '') : '');
    setFormStatus(normalizeStatus(agent.status));
    setFormProfileImageFile(null);
    setFormProfileImagePreview(getMediaUrl(agent.profileImage) || '');
    setFormDocumentFile(null);
    setFormDocumentName(agent.document ? 'Current document on file' : '');
    if (agenciesList.length === 0) {
      fetchAgencies();
    }
  };

  const handleProfileImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormProfileImageFile(file);
      setFormProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormDocumentFile(file);
      setFormDocumentName(file.name);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAgent) return;
    const agentId = editingAgent._id || editingAgent.id;

    try {
      setEditLoading(true);
      setActionLoading(agentId);

      const formData = new FormData();
      formData.append('name', formName);
      formData.append('email', formEmail);
      formData.append('phone', formPhone);
      formData.append('agencyName', formAgencyName);
      formData.append('licenseNumber', formLicenseNumber);

      if (formProfileImageFile) {
        formData.append('profileImage', formProfileImageFile);
      }
      if (formDocumentFile) {
        formData.append('document', formDocumentFile);
      }

      let res;
      try {
        res = await axios.put(`${baseUrl}/admin/agents/edit/${agentId}`, formData, {
          headers: {
            Authorization: `Bearer ${adminUser.token}`
          }
        });
      } catch (firstErr) {
        if (firstErr.response && (firstErr.response.status === 404 || firstErr.response.status === 405)) {
          try {
            res = await axios.delete(`${baseUrl}/admin/agents/edit/${agentId}`, {
              headers: {
                Authorization: `Bearer ${adminUser.token}`
              },
              data: formData
            });
          } catch (secondErr) {
            if (secondErr.response && (secondErr.response.status === 404 || secondErr.response.status === 405)) {
              res = await axios.put(`${baseUrl}/admin/agents/${agentId}`, formData, {
                headers: {
                  Authorization: `Bearer ${adminUser.token}`
                }
              });
            } else {
              throw secondErr;
            }
          }
        } else {
          throw firstErr;
        }
      }

      // If status was changed in the edit form, update status via PUT /admin/agents/:id/status
      if (formStatus && formStatus !== normalizeStatus(editingAgent.status)) {
        try {
          await axios.put(`${baseUrl}/admin/agents/${agentId}/status`, {
            status: formStatus
          }, {
            headers: {
              Authorization: `Bearer ${adminUser.token}`
            }
          });
        } catch (statusErr) {
          console.warn('Status update alongside profile edit failed:', statusErr);
        }
      }

      toast.success(res.data?.message || 'Realtor profile updated successfully');

      const updatedObj = res.data?.data?.agent || res.data?.agent || res.data?.data;

      setAgentsList(prev => prev.map(a => {
        if ((a._id || a.id) === agentId) {
          return {
            ...a,
            name: formName,
            email: formEmail,
            phone: formPhone,
            agency: formAgencyName,
            agencyName: formAgencyName,
            license: formLicenseNumber,
            licenseNumber: formLicenseNumber,
            status: formStatus || a.status,
            profileImage: updatedObj?.profileImage || (formProfileImageFile ? formProfileImagePreview : a.profileImage),
            document: updatedObj?.document || a.document
          };
        }
        return a;
      }));

      if (typeof onAddAuditLog === 'function') {
        onAddAuditLog('Realtor', `Modified agent profile details for ${formName} (${formAgencyName})`);
      }

      setEditingAgent(null);
    } catch (err) {
      console.error('Failed to update agent profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update agent profile');
    } finally {
      setEditLoading(false);
      setActionLoading(null);
    }
  };

  // Export CSV Handler
  const handleExportRealtors = () => {
    if (agentsList.length === 0) {
      toast.error('No agent data available to export');
      return;
    }
    const csvRows = [
      ['Name', 'Email', 'Phone', 'Agency', 'License', 'Status'],
      ...agentsList.map(a => [
        `"${a.name || ''}"`,
        `"${a.email || ''}"`,
        `"${a.phone || ''}"`,
        `"${a.agency || a.agencyName || ''}"`,
        `"${a.license || a.licenseNumber || ''}"`,
        `"${a.status || ''}"`
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `realtors_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof onAddAuditLog === 'function') {
      onAddAuditLog('Reports', 'Exported Realtor Directory report as CSV');
    }
    toast.success('Realtor directory report downloaded successfully');
  };

  // Pagination Indices
  const totalPages = pagination.pages || Math.ceil((pagination.total || 0) / limit) || 1;
  const fromIndex = pagination.total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const toIndex = Math.min(currentPage * limit, pagination.total);

  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const detailedAgent = agentDetails?.agent || agentDetails || selectedAgent || {};
  const agentTier = (
    (detailedAgent.tier && typeof detailedAgent.tier === 'object' ? detailedAgent.tier : null) ||
    (selectedAgent?.tier && typeof selectedAgent.tier === 'object' ? selectedAgent.tier : null) ||
    (detailedAgent.agency?.tier && typeof detailedAgent.agency.tier === 'object' ? detailedAgent.agency.tier : null) ||
    (selectedAgent?.agency?.tier && typeof selectedAgent.agency.tier === 'object' ? selectedAgent.agency.tier : null) ||
    (detailedAgent.raw?.tier && typeof detailedAgent.raw.tier === 'object' ? detailedAgent.raw.tier : null) ||
    (selectedAgent?.raw?.tier && typeof selectedAgent.raw.tier === 'object' ? selectedAgent.raw.tier : null) ||
    (agentDetails?.tier && typeof agentDetails.tier === 'object' ? agentDetails.tier : null) ||
    (typeof detailedAgent.tier === 'string' ? { name: detailedAgent.tier } : null) ||
    (typeof selectedAgent?.tier === 'string' ? { name: selectedAgent.tier } : null)
  );
  const leadsList = Array.isArray(agentDetails?.leads) ? agentDetails.leads : [];
  const statsData = {
    totalLeads: agentDetails?.stats?.totalLeads ?? leadsList.length,
    pendingLeads: agentDetails?.stats?.pendingLeads ?? leadsList.filter(l => (l.status || '').toLowerCase() === 'pending').length,
    approvedLeads: agentDetails?.stats?.approvedLeads ?? leadsList.filter(l => (l.status || '').toLowerCase() === 'approved').length,
    completedLeads: agentDetails?.stats?.completedLeads ?? leadsList.filter(l => (l.status || '').toLowerCase() === 'completed' || (l.status || '').toLowerCase() === 'won').length,
    rejectedLeads: agentDetails?.stats?.rejectedLeads ?? leadsList.filter(l => (l.status || '').toLowerCase() === 'rejected').length
  };

  const filteredLeads = leadsList.filter(l => {
    if (leadStatusFilter === 'All') return true;
    return (l.status || '').toLowerCase() === leadStatusFilter.toLowerCase();
  });

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Tablet & Mobile Responsiveness Stylesheet */}
      <style>{`
        .realtor-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .realtor-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .realtor-filter-bar {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
          padding: 1rem;
        }
        .realtor-search-box {
          position: relative;
          flex: 1;
          min-width: 240px;
        }
        .realtor-table-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .realtor-custom-table {
          min-width: 650px;
          width: 100%;
        }
        .realtor-actions-cell {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          justify-content: flex-end;
          white-space: nowrap;
        }
        .realtor-pagination-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--border-color);
          background: #faf8f5;
          flex-wrap: wrap;
          gap: 1rem;
        }

        /* Desktop Table vs Mobile Cards */
        .realtor-desktop-table {
          display: block;
        }
        .realtor-mobile-list {
          display: none;
        }

        @media (max-width: 768px) {
          .realtor-desktop-table {
            display: none !important;
          }
          .realtor-mobile-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.85rem !important;
            padding: 0.85rem !important;
          }
        }

        /* View Modal: Rock-Solid Consistent Width & Padding */
        .realtor-view-modal {
          width: 100% !important;
          max-width: 780px !important;
          max-height: 90vh !important;
          display: flex !important;
          flex-direction: column !important;
          background: #ffffff !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: var(--shadow-lg) !important;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .realtor-view-modal .modal-header {
          flex-shrink: 0 !important;
        }

        .realtor-modal-body {
          padding: 1.25rem !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 1.25rem !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          flex: 1 1 0% !important;
          min-height: 0 !important;
        }

        /* Navigation Tabs with fixed alignment & permanent underline on active */
        .realtor-tabs-header {
          display: flex !important;
          align-items: stretch !important;
          flex-shrink: 0 !important;
          min-height: 48px !important;
          border-bottom: 1px solid var(--border-color) !important;
          background: #faf8f5 !important;
          padding: 0 1.25rem !important;
          gap: 0.5rem !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .realtor-view-modal .modal-footer {
          flex-shrink: 0 !important;
        }

        .realtor-tab-btn {
          position: relative;
          padding: 0.85rem 1rem;
          border: none;
          background: none;
          font-size: 0.875rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          white-space: nowrap;
          transition: all 0.15s ease;
          color: var(--text-secondary);
          font-weight: 500;
          border-bottom: 3px solid transparent;
          margin-bottom: -1px;
          font-family: inherit;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .realtor-tab-btn:hover {
          color: var(--text-primary);
        }

        .realtor-tab-btn.active {
          color: var(--primary) !important;
          font-weight: 700 !important;
          border-bottom: 3px solid var(--primary) !important;
          box-shadow: inset 0 -3px 0 var(--primary) !important;
        }

        .realtor-tab-badge {
          background: rgba(10, 31, 57, 0.08);
          color: var(--text-primary);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
          transition: all 0.15s ease;
        }

        .realtor-tab-btn.active .realtor-tab-badge {
          background: var(--primary);
          color: #ffffff;
        }

        .realtor-tab-text-mobile {
          display: none;
        }

        .realtor-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem;
        }

        .realtor-identity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        /* Tablet Breakpoint (<= 992px) */
        @media (max-width: 992px) {
          .realtor-header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.85rem;
          }
          .realtor-header-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .realtor-filter-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .realtor-search-box {
            width: 100%;
            min-width: 100%;
          }
          .realtor-filter-select-wrapper {
            width: 100%;
            display: flex;
            justify-content: flex-start;
          }
          .realtor-filter-select {
            width: 100% !important;
          }
          .custom-table th, .custom-table td {
            padding: 0.75rem 0.85rem !important;
            font-size: 0.8125rem !important;
          }
          .realtor-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          }
          .realtor-view-modal {
            width: 95vw !important;
            max-width: 95vw !important;
          }
        }

        /* Mobile / Smartphone Breakpoint (<= 600px) */
        @media (max-width: 600px) {
          .modal-overlay {
            padding: 0.5rem !important;
          }
          .realtor-view-modal {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 94vh !important;
            border-radius: 12px !important;
          }
          .realtor-modal-body {
            padding: 0.85rem !important;
            gap: 0.85rem !important;
          }
          .realtor-tabs-header {
            padding: 0 0.5rem !important;
            gap: 0.25rem !important;
            flex-shrink: 0 !important;
            min-height: 44px !important;
          }
          .realtor-tab-btn {
            flex: 1;
            justify-content: center;
            padding: 0.7rem 0.35rem;
            font-size: 0.8rem;
            gap: 0.35rem;
          }
          .realtor-tab-text-full {
            display: none;
          }
          .realtor-tab-text-mobile {
            display: inline;
          }
          .realtor-identity-grid {
            grid-template-columns: 1fr !important;
            gap: 0.5rem !important;
          }
          .realtor-header-row h2 {
            font-size: 1.25rem;
          }
          .realtor-header-actions {
            display: flex;
            width: 100%;
            gap: 0.5rem;
          }
          .realtor-header-actions button {
            flex: 1;
            justify-content: center;
            font-size: 0.78rem;
            padding: 0.5rem 0.6rem;
          }
          .realtor-custom-table {
            min-width: 560px;
          }
          .realtor-pagination-toolbar {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 0.75rem;
            padding: 0.85rem 1rem;
          }
          .realtor-pagination-left {
            flex-direction: column;
            gap: 0.4rem;
            align-items: center;
          }
          .realtor-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="realtor-header-row">
        <div>
          <h2>Realtor & Broker Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Verify real estate licenses, inspect assigned client leads, suspend policy violations, and manage registered agencies.
          </p>
        </div>
        <div className="realtor-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => fetchAgents(currentPage, limit, statusFilter, searchTerm)}
            disabled={loading}
            title="Refresh Directory"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={handleExportRealtors} style={{ gap: '0.5rem' }}>
            <Download size={16} />
            Export Directory CSV
          </button>
        </div>
      </div>

      {/* Search & Filter Bar (Status: pending, approved, rejected, suspended) */}
      <div className="glass-panel realtor-filter-bar">
        <div className="realtor-search-box">
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by agent name, brokerage firm, license code, phone..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex-align-center realtor-filter-select-wrapper" style={{ gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <select
            className="form-control form-select realtor-filter-select"
            style={{ width: '180px', padding: '0.5rem 2rem 0.5rem 1rem' }}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Realtor List Table & Mobile Card View */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* 1. DESKTOP & TABLET TABLE VIEW (Screens > 768px) */}
        <div className="realtor-desktop-table table-container realtor-table-wrapper">
          <table className="custom-table realtor-custom-table">
            <thead>
              <tr>
                <th>Agent Profile</th>
                <th>Brokerage Firm</th>
                <th>License ID</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <Loader2 className="animate-spin" size={20} color="var(--primary)" />
                      <span>Loading registered realtors from server...</span>
                    </div>
                  </td>
                </tr>
              ) : agentsList.length > 0 ? (
                agentsList.map((agent) => {
                  const isRowActioning = actionLoading === (agent._id || agent.id);
                  const normStatus = normalizeStatus(agent.status);

                  return (
                    <tr key={agent._id || agent.id}>
                      <td>
                        <div className="flex-align-center" style={{ gap: '0.75rem' }}>
                          <RealtorAvatar
                            src={agent.profileImage}
                            name={agent.name}
                            size={38}
                          />
                          <div>
                            <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{safeRenderText(agent.name)}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{safeRenderText(agent.email)}</p>
                            {agent.phone && (
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{safeRenderText(agent.phone, '')}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Building size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>{safeRenderText(agent.agency || agent.agencyName)}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{safeRenderText(agent.license || agent.licenseNumber)}</td>
                      <td>
                        {renderStatusBadge(agent.status, agent.isActive)}
                      </td>
                      <td>
                        <div className="realtor-actions-cell">
                          {normStatus === 'pending' ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleInspectAgent(agent, 'credentials')}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="Review License & Credentials"
                            >
                              <FileCheck size={13} />
                              Review Docs
                            </button>
                          ) : (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleInspectAgent(agent, 'credentials')}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                              title="View Profile, Agency & Credentials"
                            >
                              <Eye size={13} />
                              View
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleEditClick(agent)}
                            title="Edit Realtor Profile"
                          >
                            <Edit2 size={14} />
                          </button>
                          {/* Status Action Button: Opens the Change Agent Status Modal */}
                          <button
                            className={`btn btn-ghost btn-sm btn-icon ${normStatus === 'approved' ? 'text-success' : normStatus === 'pending' ? 'text-warning' : 'text-danger'}`}
                            onClick={() => handleOpenStatusModal(agent)}
                            disabled={isRowActioning}
                            title={`Change Status (Current: ${normStatus})`}
                          >
                            {isRowActioning ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : normStatus === 'approved' ? (
                              <UserCheck size={14} />
                            ) : (
                              <UserX size={14} />
                            )}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon text-danger"
                            onClick={() => handleDeleteClick(agent)}
                            title="Delete Realtor Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Building size={38} style={{ color: 'var(--text-muted)', opacity: 0.45, marginBottom: '0.25rem' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                        No realtors found
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                        {searchTerm || statusFilter !== 'All'
                          ? 'No registered realtors match your active search or status criteria.'
                          : 'There are currently no realtors registered on the platform.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 2. MOBILE CARD VIEW (Screens <= 768px - Complete Mobile Responsiveness) */}
        <div className="realtor-mobile-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Loader2 className="animate-spin" size={24} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
              <span>Loading registered realtors from server...</span>
            </div>
          ) : agentsList.length > 0 ? (
            agentsList.map((agent) => {
              const isRowActioning = actionLoading === (agent._id || agent.id);
              const normStatus = normalizeStatus(agent.status);

              return (
                <div
                  key={agent._id || agent.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Card Header: Avatar, Name, Email & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <RealtorAvatar
                        src={agent.profileImage}
                        name={agent.name}
                        size={42}
                        fontSize="1rem"
                      />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {agent.name}
                        </h4>
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {agent.email}
                        </p>
                        {agent.phone && (
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {agent.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    {renderStatusBadge(agent.status, agent.isActive)}
                  </div>

                  {/* Agency & License Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    background: '#faf8f5',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Brokerage Firm</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{safeRenderText(agent.agency || agent.agencyName, '—')}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>License ID</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{safeRenderText(agent.license || agent.licenseNumber, '—')}</span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    {normStatus === 'pending' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleInspectAgent(agent, 'credentials')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      >
                        <FileCheck size={14} />
                        Review Docs
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleInspectAgent(agent, 'credentials')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        title="View Profile, Agency & Credentials"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm btn-icon"
                      onClick={() => handleEditClick(agent)}
                      title="Edit Realtor Profile"
                      style={{ width: '36px', height: '36px', padding: 0 }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className={`btn btn-secondary btn-sm btn-icon ${normStatus === 'approved' ? 'text-success' : normStatus === 'pending' ? 'text-warning' : 'text-danger'}`}
                      onClick={() => handleOpenStatusModal(agent)}
                      disabled={isRowActioning}
                      title={`Change Status (Current: ${normStatus})`}
                      style={{ width: '36px', height: '36px', padding: 0 }}
                    >
                      {isRowActioning ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : normStatus === 'approved' ? (
                        <UserCheck size={15} />
                      ) : (
                        <UserX size={15} />
                      )}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm btn-icon text-danger"
                      onClick={() => handleDeleteClick(agent)}
                      title="Delete Realtor Account"
                      style={{ width: '36px', height: '36px', padding: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <Building size={34} style={{ color: 'var(--text-muted)', opacity: 0.45, margin: '0 auto 0.5rem' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>No realtors found</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                {searchTerm || statusFilter !== 'All' ? 'No realtors match your active filters.' : 'There are currently no realtors registered.'}
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION TOOLBAR */}
        <div className="realtor-pagination-toolbar">
          <div className="flex-align-center realtor-pagination-left" style={{ gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{fromIndex}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{toIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> realtors
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Rows per page:</span>
              <select
                className="form-control form-select"
                style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem', height: '32px' }}
                value={limit}
                onChange={handleLimitChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1 || loading || pagination.total === 0}
              title="First Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading || pagination.total === 0}
              title="Previous Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronLeft size={15} />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                className={`btn btn-sm ${pageNum === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePageChange(pageNum)}
                disabled={loading || pagination.total === 0}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  padding: '0 0.5rem',
                  fontWeight: pageNum === currentPage ? 700 : 500
                }}
              >
                {pageNum}
              </button>
            ))}

            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading || pagination.total === 0}
              title="Next Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronRight size={15} />
            </button>
            <button
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages || loading || pagination.total === 0}
              title="Last Page"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 1. AGENT VIEW MODAL: Leads, Stats & Credentials (GET /admin/agents/:id) */}
      {selectedAgent && createPortal(
        <div className="modal-overlay" onClick={() => { setSelectedAgent(null); setShowRejectForm(false); }}>
          <div
            className="modal-content realtor-view-modal"
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <RealtorAvatar
                  src={detailedAgent.profileImage || selectedAgent.profileImage}
                  name={detailedAgent.name || selectedAgent.name}
                  size={46}
                  fontSize="1.15rem"
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {safeRenderText(detailedAgent.name || selectedAgent.name)}
                    </h3>
                    {renderStatusBadge(detailedAgent.status || selectedAgent.status, detailedAgent.isActive !== undefined ? detailedAgent.isActive : selectedAgent.isActive)}
                    {detailedAgent.isEmailVerified && (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={11} /> Email Verified
                      </span>
                    )}
                    {detailedAgent.isCoveredByAgency && (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                        Agency Covered
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {safeRenderText(detailedAgent.agency?.name || detailedAgent.agencyName || detailedAgent.agency || selectedAgent.agency?.name || selectedAgent.agency || selectedAgent.agencyName)}
                    {(detailedAgent.aeiNumber || detailedAgent.licenseNumber || detailedAgent.employeeId || detailedAgent.idNumber) && (
                      <> • ID/AEI: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{detailedAgent.aeiNumber || detailedAgent.licenseNumber || detailedAgent.employeeId || detailedAgent.idNumber}</span></>
                    )}
                    {agentTier?.name && (
                      <> • <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{agentTier.name}</span></>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => { setSelectedAgent(null); setShowRejectForm(false); }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-header Navigation Tabs */}
            <div className="realtor-tabs-header" style={{ flexShrink: 0, minHeight: '48px' }}>
              <button
                type="button"
                onClick={() => setActiveViewTab('credentials')}
                className={`realtor-tab-btn ${activeViewTab === 'credentials' ? 'active' : 'inactive'}`}
              >
                <FileCheck size={16} />
                <span className="realtor-tab-text-full">Profile, Agency & Credentials</span>
                <span className="realtor-tab-text-mobile">Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewTab('leads')}
                className={`realtor-tab-btn ${activeViewTab === 'leads' ? 'active' : 'inactive'}`}
              >
                <Users size={16} />
                <span className="realtor-tab-text-full">Client Leads & Inquiries</span>
                <span className="realtor-tab-text-mobile">Leads</span>
                <span className="realtor-tab-badge">
                  {statsData.totalLeads}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body realtor-modal-body" style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto' }}>
              {drawerLoading ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Retrieving live agent details, client leads & stats from server...</p>
                </div>
              ) : activeViewTab === 'leads' ? (
                /* TAB 2: CLIENT LEADS & INQUIRIES */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                  {/* Lead Stats Bar */}
                  <div className="realtor-stats-grid">
                    <div style={{ background: '#faf8f5', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Total Leads</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: 'var(--text-primary)' }}>{statsData.totalLeads}</p>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#b47404', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Pending</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#d97706' }}>{statsData.pendingLeads}</p>
                    </div>
                    <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Approved</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#0284c7' }}>{statsData.approvedLeads}</p>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Completed</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#059669' }}>{statsData.completedLeads}</p>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Rejected</span>
                      <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#dc2626' }}>{statsData.rejectedLeads}</p>
                    </div>
                  </div>

                  {/* Filter Leads by Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Inquiries List ({filteredLeads.length})
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {['All', 'pending', 'approved', 'completed', 'rejected'].map(st => (
                        <button
                          key={st}
                          type="button"
                          className={`btn btn-sm ${leadStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', textTransform: 'capitalize' }}
                          onClick={() => setLeadStatusFilter(st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leads Cards */}
                  {filteredLeads.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {filteredLeads.map((lead) => {
                        const clientUser = lead.user || lead.userId || {};
                        const clientName = clientUser.name || lead.name || 'Anonymous Client';
                        const clientEmail = clientUser.email || lead.email || '';
                        const clientPhone = clientUser.phone || lead.phone || '';
                        const userImg = getMediaUrl(clientUser.profileImage || lead.profileImage);
                        const aiSheet = lead.aiLeadSheet;

                        return (
                          <div
                            key={lead._id || lead.id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid var(--border-color)',
                              borderRadius: '10px',
                              padding: '1.1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.85rem',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            {/* Client Header Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <RealtorAvatar
                                  src={userImg}
                                  name={clientName}
                                  size={40}
                                  fontSize="0.95rem"
                                  border="2px solid var(--primary)"
                                />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                      {clientName}
                                    </h4>
                                    {lead.isClaimed && (
                                      <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        color: '#059669',
                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                        borderRadius: '4px',
                                        padding: '0.1rem 0.4rem'
                                      }}>
                                        Claimed
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                                    {clientEmail && (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Mail size={12} style={{ color: 'var(--text-muted)' }} /> {clientEmail}
                                      </span>
                                    )}
                                    {clientPhone && (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Phone size={12} style={{ color: 'var(--text-muted)' }} /> {clientPhone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {renderLeadStatusBadge(lead.status)}
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                </span>
                              </div>
                            </div>

                            {/* Inquiry Message / Description */}
                            {lead.description && (
                              <div style={{
                                background: '#faf8f5',
                                border: '1px solid rgba(10, 31, 57, 0.08)',
                                borderRadius: '6px',
                                padding: '0.65rem 0.85rem',
                                fontSize: '0.8125rem',
                                color: 'var(--text-primary)',
                                lineHeight: 1.45,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem'
                              }}>
                                <MessageSquare size={14} style={{ color: 'var(--primary)', marginTop: '2px', flexShrink: 0 }} />
                                <span>{lead.description}</span>
                              </div>
                            )}

                            {/* AI Lead Sheet Section */}
                            {aiSheet && (
                              <div style={{
                                background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.06) 0%, rgba(10, 31, 57, 0.02) 100%)',
                                border: '1px solid rgba(250, 179, 25, 0.28)',
                                borderRadius: '8px',
                                padding: '0.85rem 1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                              }}>
                                {/* AI Sheet Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                    <div style={{
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '6px',
                                      background: 'var(--primary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#0a1f39'
                                    }}>
                                      <Sparkles size={13} />
                                    </div>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                                      AI Lead Intelligence Sheet
                                    </span>
                                    {aiSheet.extractedAt && (
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        • Analyzed {new Date(aiSheet.extractedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                    )}
                                  </div>

                                  {aiSheet.leadQuality && renderLeadQualityBadge(aiSheet.leadQuality)}
                                </div>

                                {/* Key Insights Grid */}
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                  gap: '0.5rem'
                                }}>
                                  {/* Verified Budget */}
                                  <div style={{
                                    background: '#ffffff',
                                    border: '1px solid rgba(10, 31, 57, 0.08)',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.65rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.2rem'
                                  }}>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <DollarSign size={11} style={{ color: 'var(--primary)' }} /> Budget
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {aiSheet.verifiedBudget?.formatted || (aiSheet.verifiedBudget?.amount ? `${aiSheet.verifiedBudget.currency || '$'}${aiSheet.verifiedBudget.amount}` : 'Not specified')}
                                    </span>
                                  </div>

                                  {/* Payment Method */}
                                  <div style={{
                                    background: '#ffffff',
                                    border: '1px solid rgba(10, 31, 57, 0.08)',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.65rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.2rem'
                                  }}>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <CreditCard size={11} style={{ color: 'var(--primary)' }} /> Payment
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                      {(aiSheet.paymentMethod || 'Undecided').toLowerCase()}
                                    </span>
                                  </div>

                                  {/* Timeline */}
                                  <div style={{
                                    background: '#ffffff',
                                    border: '1px solid rgba(10, 31, 57, 0.08)',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.65rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.2rem'
                                  }}>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Calendar size={11} style={{ color: 'var(--primary)' }} /> Timeline
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                      {(aiSheet.timeline || 'Undecided').toLowerCase()}
                                    </span>
                                  </div>

                                  {/* Preferred Property Type & Beds */}
                                  <div style={{
                                    background: '#ffffff',
                                    border: '1px solid rgba(10, 31, 57, 0.08)',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.65rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.2rem'
                                  }}>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Home size={11} style={{ color: 'var(--primary)' }} /> Property Type
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                      {(aiSheet.preferredPropertyType || 'Any Property').toLowerCase()}
                                      {aiSheet.preferredBedrooms ? ` • ${aiSheet.preferredBedrooms} Beds` : ''}
                                    </span>
                                  </div>
                                </div>

                                {/* Target Areas */}
                                {Array.isArray(aiSheet.areasOfInterest) && aiSheet.areasOfInterest.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Areas:</span>
                                    {aiSheet.areasOfInterest.map((area, idx) => (
                                      <span
                                        key={idx}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.2rem',
                                          background: '#ffffff',
                                          border: '1px solid rgba(10, 31, 57, 0.12)',
                                          borderRadius: '4px',
                                          padding: '0.15rem 0.45rem',
                                          fontSize: '0.72rem',
                                          fontWeight: 600,
                                          color: 'var(--text-primary)'
                                        }}
                                      >
                                        <MapPin size={10} style={{ color: 'var(--primary)' }} /> {area}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      background: '#faf8f5',
                      borderRadius: '10px',
                      border: '1px dashed var(--border-color)'
                    }}>
                      <Users size={32} style={{ color: 'var(--text-muted)', opacity: 0.5, margin: '0 auto 0.5rem' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>
                        No leads found
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        {leadStatusFilter !== 'All'
                          ? `No leads with status "${leadStatusFilter}" for this agent.`
                          : 'There are currently no customer leads assigned to this realtor.'}
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveViewTab('credentials')}
                        style={{ marginTop: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <FileCheck size={14} /> View Agent Profile & Uploaded Documents
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 1: PROFILE, AGENCY & CREDENTIALS (DEFAULT ACTIVE) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                  
                  {/* 1. APPLICANT PERSONAL & ACCOUNT IDENTITY */}
                  <div style={{ background: '#faf8f5', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Users size={17} style={{ color: 'var(--primary)' }} />
                        <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                          Applicant Identity & Contact
                        </h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {renderStatusBadge(detailedAgent.status || selectedAgent.status, detailedAgent.isActive !== undefined ? detailedAgent.isActive : selectedAgent.isActive)}
                        {detailedAgent.isEmailVerified ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={12} /> Email Verified
                          </span>
                        ) : (
                          <span className="badge" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'rgba(0,0,0,0.06)', color: 'var(--text-muted)' }}>
                            Email Unverified
                          </span>
                        )}
                        {detailedAgent.isCoveredByAgency && (
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                            Agency Covered
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="realtor-identity-grid">
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Full Name:</strong> {safeRenderText(detailedAgent.name || selectedAgent.name)}</p>
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>Email:</strong>{' '}
                        <a href={`mailto:${detailedAgent.email || selectedAgent.email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                          {safeRenderText(detailedAgent.email || selectedAgent.email)}
                        </a>
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>Phone:</strong>{' '}
                        {detailedAgent.phone || selectedAgent.phone ? (
                          <a href={`tel:${detailedAgent.phone || selectedAgent.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {safeRenderText(detailedAgent.phone || selectedAgent.phone)}
                          </a>
                        ) : 'Not specified'}
                      </p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{detailedAgent.role || 'Agent'}</span></p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Operational Status:</strong> <span style={{ fontWeight: 600, color: (detailedAgent.isActive ?? true) ? 'var(--success)' : 'var(--danger)' }}>{(detailedAgent.isActive ?? true) ? 'Active' : 'Disabled'}</span></p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Preferred Language:</strong> <span style={{ textTransform: 'capitalize' }}>{detailedAgent.preferredLanguage || 'English'}</span></p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Preferred Currency:</strong> <span style={{ textTransform: 'capitalize' }}>{detailedAgent.preferredCurrency || 'Dollar'}</span></p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Registered On:</strong> {detailedAgent.createdAt ? new Date(detailedAgent.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
                      <p><strong style={{ color: 'var(--text-secondary)' }}>Last Updated:</strong> {detailedAgent.updatedAt ? new Date(detailedAgent.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
                      <p style={{ gridColumn: '1 / -1' }}>
                        <strong style={{ color: 'var(--text-secondary)' }}>Terms & Conditions:</strong>{' '}
                        <span style={{ fontWeight: 600, color: detailedAgent.is_selected_checkBox ? 'var(--success)' : 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {detailedAgent.is_selected_checkBox ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                          {detailedAgent.is_selected_checkBox ? 'Accepted and Validated' : 'Not Accepted'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* 2. LEGAL IDENTIFICATION & AEI ACCREDITATION */}
                  <div style={{ background: '#ffffff', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <FileCheck size={17} style={{ color: 'var(--primary)' }} />
                        <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                          Identification & Association Credentials
                        </h4>
                      </div>
                      {detailedAgent.aeiNumber && (
                        <span className="badge badge-warning" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', fontWeight: 700 }}>
                          AEI Certified
                        </span>
                      )}
                    </div>

                    <div className="realtor-identity-grid">
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>ID Type:</strong>{' '}
                        <span style={{ fontWeight: 600 }}>{detailedAgent.idType || 'Passport / National ID'}</span>
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>ID Document Number:</strong>{' '}
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {detailedAgent.idNumber || '—'}
                        </code>
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>AEI Registration No:</strong>{' '}
                        <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#b47404', background: 'rgba(250, 179, 25, 0.12)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {detailedAgent.aeiNumber || detailedAgent.licenseNumber || '—'}
                        </code>
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>Employee / Broker ID:</strong>{' '}
                        <code style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {detailedAgent.employeeId || '—'}
                        </code>
                      </p>
                    </div>
                  </div>

                  {/* 3. AGENCY AFFILIATION & SPONSORSHIP */}
                  {detailedAgent.agency && typeof detailedAgent.agency === 'object' && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(253, 248, 238, 0.85) 100%)',
                      padding: '1.25rem',
                      border: '1px solid rgba(250, 179, 25, 0.35)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Building size={18} style={{ color: 'var(--primary)' }} />
                          <div>
                            <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                              Affiliated Agency: {detailedAgent.agency.name || 'Untitled Agency'}
                            </h4>
                            {detailedAgent.agency.description && (
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {detailedAgent.agency.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {detailedAgent.agency.isFoundingSponsor && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              background: 'linear-gradient(135deg, #fab319 0%, #f59e0b 100%)',
                              color: '#0a1f39',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '20px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              textTransform: 'uppercase'
                            }}>
                              <Sparkles size={11} /> Founding Sponsor
                            </span>
                          )}
                          {detailedAgent.agency.isVerified && (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                              <CheckCircle size={11} /> Verified Agency
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="realtor-identity-grid" style={{ marginTop: '0.65rem' }}>
                        <p>
                          <strong style={{ color: 'var(--text-secondary)' }}>Agency Website:</strong>{' '}
                          {detailedAgent.agency.website ? (
                            <a
                              href={detailedAgent.agency.website.startsWith('http') ? detailedAgent.agency.website : `https://${detailedAgent.agency.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                            >
                              {detailedAgent.agency.website.replace(/^https?:\/\/(www\.)?/, '')}
                              <ExternalLink size={11} />
                            </a>
                          ) : '—'}
                        </p>
                        <p>
                          <strong style={{ color: 'var(--text-secondary)' }}>Seat Coverage:</strong>{' '}
                          <span style={{ fontWeight: 600, color: detailedAgent.isCoveredByAgency ? 'var(--success)' : 'var(--text-primary)' }}>
                            {detailedAgent.isCoveredByAgency ? 'Covered under Agency Package' : 'Independent Seat'}
                          </span>
                        </p>
                        <p>
                          <strong style={{ color: 'var(--text-secondary)' }}>Agency Agent Seats:</strong>{' '}
                          <span style={{ fontWeight: 700 }}>
                            {detailedAgent.agency.coveredAgentsCount ?? 0} / {detailedAgent.agency.agentSeatsLimit ?? 10} filled
                          </span>
                        </p>
                        {detailedAgent.agency.brandColorHex && (
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <strong style={{ color: 'var(--text-secondary)' }}>Brand Color:</strong>
                            <span style={{
                              display: 'inline-block',
                              width: '14px',
                              height: '14px',
                              borderRadius: '3px',
                              backgroundColor: detailedAgent.agency.brandColorHex,
                              border: '1px solid rgba(0,0,0,0.2)'
                            }} />
                            <code style={{ fontSize: '0.75rem' }}>{detailedAgent.agency.brandColorHex}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. SUBSCRIPTION TIER DETAILS */}
                  {agentTier && (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(250, 179, 25, 0.08) 0%, rgba(250, 179, 25, 0.02) 100%)',
                        border: '1px solid rgba(250, 179, 25, 0.3)',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Award size={18} style={{ color: 'var(--primary)' }} />
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {agentTier.name || `Tier ${agentTier.tierLevel || 1}`}
                          </h4>
                        </div>
                        {agentTier.tierLevel !== undefined && (
                          <span
                            style={{
                              padding: '0.2rem 0.65rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'var(--primary)',
                              color: '#0a1f39',
                              boxShadow: '0 2px 4px rgba(250, 179, 25, 0.3)'
                            }}
                          >
                            Tier Level {agentTier.tierLevel}
                          </span>
                        )}
                      </div>
                      {agentTier.description && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                          {agentTier.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 5. AI CHAT & PLATFORM USAGE */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                      <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                      <h4 style={{ fontSize: '0.92rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                        AI Assistant & Platform Activity
                      </h4>
                    </div>
                    <div className="realtor-identity-grid">
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>AI Chat Usage:</strong>{' '}
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {detailedAgent.aiChatUsage?.count ?? 0} conversations
                        </span>
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>Last AI Chat:</strong>{' '}
                        <span>
                          {detailedAgent.aiChatUsage?.lastUsedDate
                            ? new Date(detailedAgent.aiChatUsage.lastUsedDate).toLocaleString()
                            : 'No sessions yet'}
                        </span>
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-secondary)' }}>AI Search Inquiries:</strong>{' '}
                        <span>
                          {Array.isArray(detailedAgent.aiSearchHistory) ? detailedAgent.aiSearchHistory.length : 0} recorded
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* 6. DOCUMENT REVIEW SECTION WITH MULTI-DOCUMENT VIEWER & LIGHTBOX */}
                  <RealtorDocumentSection agent={selectedAgent} details={detailedAgent} baseUrl={baseUrl} />

                  {/* Reject reason display if already rejected */}
                  {normalizeStatus(selectedAgent.status) === 'rejected' && selectedAgent.rejectionReason && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '0.85rem' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>Previous Rejection Reason:</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#7f1d1d' }}>{selectedAgent.rejectionReason}</p>
                    </div>
                  )}

                  {/* Reject Form */}
                  {showRejectForm && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!rejectReason.trim()) {
                        toast.error('Please specify a rejection reason');
                        return;
                      }
                      handleChangeStatus(selectedAgent, 'rejected', rejectReason.trim());
                    }} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label text-danger" style={{ fontWeight: 600 }}>Specify Rejection Reason</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="e.g. Expired licensing credentials, identity mismatch, unaccredited agency..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRejectForm(false)}>
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-danger btn-sm"
                          disabled={actionLoading === (selectedAgent._id || selectedAgent.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          {actionLoading === (selectedAgent._id || selectedAgent.id) && <Loader2 size={13} className="animate-spin" />}
                          Confirm Rejection
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!showRejectForm && (
              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedAgent(null)}>
                  Close
                </button>
                {normalizeStatus(selectedAgent.status) === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setShowRejectForm(true)}
                      disabled={actionLoading === (selectedAgent._id || selectedAgent.id)}
                    >
                      Reject Credentials
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => handleChangeStatus(selectedAgent, 'approved')}
                      disabled={actionLoading === (selectedAgent._id || selectedAgent.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {actionLoading === (selectedAgent._id || selectedAgent.id) ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Approve & Verify
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 2. EDIT AGENT MODAL (URL /admin/agents/edit/:id) */}
      {editingAgent && createPortal(
        <div className="modal-overlay" onClick={() => !editLoading && setEditingAgent(null)}>
          <form
            className="modal-content"
            style={{
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onSubmit={handleEditSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3 style={{ margin: 0 }}>Update Realtor Profile</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => !editLoading && setEditingAgent(null)}>
                <X size={16} />
              </button>
            </div>
            <div
              className="modal-body"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                flex: '1 1 0%',
                minHeight: 0,
                overflowY: 'auto'
              }}
            >
              {/* Profile Image Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  {formProfileImagePreview ? (
                    <img
                      src={formProfileImagePreview}
                      alt="Agent Avatar"
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid var(--primary)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    />
                  ) : (
                    <RealtorAvatar
                      src={editingAgent?.profileImage}
                      name={formName || editingAgent?.name}
                      size={72}
                      fontSize="1.75rem"
                      border="3px solid var(--primary)"
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="form-label" style={{ marginBottom: '0.35rem' }}>Profile Picture</label>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Upload size={14} />
                    Choose New Avatar
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleProfileImageFileChange}
                    />
                  </label>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    JPG, PNG, WebP up to 5MB
                  </p>
                </div>
              </div>

              {/* Form Input Fields with responsive grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="agent@agency.com"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +1 555-0199"
                  />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Agency Name *</label>
                    {agenciesLoading && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Loader2 size={11} className="animate-spin" /> Loading agencies...
                      </span>
                    )}
                  </div>
                  <select
                    className="form-control"
                    value={formAgencyName}
                    onChange={(e) => setFormAgencyName(e.target.value)}
                    required
                  >
                    <option value="">Select an Agency...</option>
                    {agenciesList.map((agency) => {
                      const agencyName = agency.name || agency.agencyName || agency.title || 'Unnamed Agency';
                      const agencyId = agency._id || agency.id || agencyName;
                      return (
                        <option key={agencyId} value={agencyName}>
                          {agencyName} {agency.isActive === false ? '(Inactive)' : ''}
                        </option>
                      );
                    })}
                    {formAgencyName && !agenciesList.some(ag => (ag.name || ag.agencyName || ag.title) === formAgencyName) && (
                      <option value={formAgencyName}>
                        {formAgencyName} (Current)
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">License Number / Code *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formLicenseNumber}
                  onChange={(e) => setFormLicenseNumber(e.target.value)}
                  placeholder="e.g. LIC-2025-4512"
                  required
                />
              </div>

              {/* Document Upload Field */}
              <div className="form-group" style={{ background: '#faf8f5', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Licensing Document / Certificate</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Upload size={14} />
                    Select Document (PDF/Image)
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      style={{ display: 'none' }}
                      onChange={handleDocumentFileChange}
                    />
                  </label>
                  <span style={{ fontSize: '0.8rem', color: formDocumentFile ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {formDocumentName || 'No document selected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingAgent(null)}
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {editLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* 3. DEDICATED CHANGE STATUS MODAL (Opened by clicking the status action button in Actions column) */}
      {statusModalAgent && createPortal(
        <div className="modal-overlay" onClick={() => !statusModalLoading && setStatusModalAgent(null)}>
          <form
            className="modal-content"
            style={{ maxWidth: '440px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
            onSubmit={handleSaveStatusModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Change Agent Status</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !statusModalLoading && setStatusModalAgent(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', padding: '1.25rem' }}>
              <div style={{ background: '#faf8f5', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {safeRenderText(statusModalAgent.name)}
                </p>
                <p style={{ margin: '0.15rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {safeRenderText(statusModalAgent.agency || statusModalAgent.agencyName)} • {safeRenderText(statusModalAgent.email)}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.45rem' }}>
                  Select New Status *
                </label>
                <select
                  className="form-control form-select"
                  value={statusModalValue}
                  onChange={(e) => setStatusModalValue(e.target.value)}
                  style={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    height: '44px',
                    lineHeight: 'normal',
                    padding: '0.5rem 2.5rem 0.5rem 1rem',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    borderColor: statusModalValue === 'approved' ? '#10b981' :
                      statusModalValue === 'pending' ? '#f59e0b' : '#ef4444',
                    background: statusModalValue === 'approved' ? '#ecfdf5' :
                      statusModalValue === 'pending' ? '#fffbeb' : '#fef2f2',
                    color: statusModalValue === 'approved' ? '#047857' :
                      statusModalValue === 'pending' ? '#b47404' : '#b91c1c'
                  }}
                >
                  <option value="pending" style={{ background: '#ffffff', color: '#b47404' }}>Pending</option>
                  <option value="approved" style={{ background: '#ffffff', color: '#047857' }}>Approved</option>
                  <option value="rejected" style={{ background: '#ffffff', color: '#b91c1c' }}>Rejected</option>
                  <option value="suspended" style={{ background: '#ffffff', color: '#b91c1c' }}>Suspended</option>
                </select>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Choose the updated account and license status for this agent.
                </p>
              </div>

              {statusModalValue === 'rejected' && (
                <div className="form-group">
                  <label className="form-label text-danger" style={{ fontWeight: 600 }}>Rejection Reason *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Specify reason for rejection..."
                    value={statusModalReason}
                    onChange={(e) => setStatusModalReason(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStatusModalAgent(null)}
                disabled={statusModalLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={statusModalLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {statusModalLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Updating Status...
                  </>
                ) : (
                  'Apply Status'
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* 4. DELETE AGENT MODAL (DELETE /admin/agents/:id) */}
      {agentToDelete && createPortal(
        <div className="modal-overlay" onClick={() => !deleteLoading && setAgentToDelete(null)}>
          <div className="modal-content" style={{ maxWidth: '460px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.1rem' }}>Delete Realtor Account</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => !deleteLoading && setAgentToDelete(null)}
                disabled={deleteLoading}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this realtor account?
              </p>

              <div style={{
                background: '#faf8f5',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <RealtorAvatar
                  src={agentToDelete.profileImage}
                  name={agentToDelete.name}
                  size={44}
                  fontSize="1.1rem"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {safeRenderText(agentToDelete.name)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>
                    {safeRenderText(agentToDelete.agency || agentToDelete.agencyName)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0', fontFamily: 'monospace' }}>
                    License: {safeRenderText(agentToDelete.license || agentToDelete.licenseNumber)}
                  </p>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                This will remove the realtor from the directory and unbind associated listing authorizations. This action <strong style={{ color: 'var(--danger)' }}>cannot be undone</strong>.
              </p>
            </div>

            <div className="modal-footer" style={{ background: '#faf8f5' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAgentToDelete(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting Realtor...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete Realtor
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
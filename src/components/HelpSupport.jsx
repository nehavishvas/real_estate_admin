import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  HelpCircle,
  Loader2,
  Mail
} from 'lucide-react';
import { formatContentToHtml } from '../utils/termsFormatter';
import logoImg from '../assets/logo.png';

export default function HelpSupport() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mobappssolutiondevelopment.com/kleverProp/api';
  const [searchParams] = useSearchParams();

  // Read language strictly from URL query: e.g. /help-support?language=english or /help-support?language=spanish
  const urlLang = searchParams.get('language') || searchParams.get('lang');
  const selectedLanguage = (urlLang && urlLang.toLowerCase() === 'spanish') ? 'spanish' : 'english';

  // Dynamic Content & Title from GET API
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');

  // Async states
  const [loading, setLoading] = useState(true);

  // 1. GET HELP AND SUPPORT (PUBLIC: NO TOKEN PASSED)
  // http://192.168.1.48:5002/api/admin/help-support
  const fetchHelpSupport = useCallback(async (lang = selectedLanguage) => {
    try {
      setLoading(true);

      const res = await axios.get(`${baseUrl}/admin/help-support`, {
        params: { language: lang }
      });

      let target = null;
      const resData = res.data?.data || res.data;

      if (resData && typeof resData === 'object') {
        if (resData[lang] && typeof resData[lang] === 'object') {
          target = resData[lang];
        } else if (resData.title !== undefined || resData.content !== undefined) {
          target = resData;
        } else if (res.data?.[lang] && typeof res.data[lang] === 'object') {
          target = res.data[lang];
        }
      }

      const serverTitle = target?.title || (lang === 'spanish' ? 'Ayuda y Soporte' : 'Help & Support');
      const serverSubtitle = target?.subtitle || (
        lang === 'spanish'
          ? 'Encuentra respuestas rápidas sobre búsquedas, herramientas para agentes y gestión de tu cuenta en Speddy.'
          : 'Find quick answers to common questions about properties, search tools, and account management.'
      );
      const serverContent = target?.content || '';

      setTitle(serverTitle);
      setSubtitle(serverSubtitle);
      setContent(serverContent);
    } catch (err) {
      console.error('Failed to fetch help and support:', err);
      if (err.response?.status === 404) {
        setTitle(lang === 'spanish' ? 'Ayuda y Soporte' : 'Help & Support');
        setSubtitle('');
        setContent('');
      } else {
        const errMsg = err.response?.data?.message || err.message || 'Failed to load help and support from server.';
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [baseUrl, selectedLanguage]);

  useEffect(() => {
    fetchHelpSupport(selectedLanguage);
  }, [selectedLanguage, fetchHelpSupport]);

  // Render formatted content using rich HTML or converted Markdown
  const renderFormattedContent = (rawText) => {
    if (!rawText || !rawText.trim()) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted, #5d6d7e)' }}>
          <HelpCircle size={48} style={{ opacity: 0.35, margin: '0 auto 1rem', display: 'block', color: 'var(--primary, #fab319)' }} />
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary, #0a1f39)', fontSize: '1.15rem', fontWeight: 700 }}>
            {selectedLanguage === 'spanish' ? 'No hay información de ayuda publicada' : 'No Help & Support Published'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6, color: 'var(--text-secondary, #2c3e50)' }}>
            {selectedLanguage === 'spanish'
              ? 'Actualmente no hay artículos o preguntas frecuentes publicadas en español.'
              : 'There is currently no help or support content published in English.'}
          </p>
        </div>
      );
    }

    const html = formatContentToHtml(rawText);
    return (
      <div
        className="terms-html-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base, #faf8f5)',
        padding: '3rem 1.5rem 5rem',
        boxSizing: 'border-box',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)"
      }}
    >
      {/* Centered Brand Header (Clean, exactly matching Terms & Conditions) */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.45rem 1.25rem',
            background: 'var(--bg-surface-solid, #ffffff)',
            borderRadius: '30px',
            border: '1px solid var(--border-color, rgba(10, 31, 57, 0.08))',
            boxShadow: 'var(--shadow-sm, 0 2px 8px -2px rgba(10, 31, 57, 0.06))'
          }}
        >
          <img
            src={logoImg}
            alt="SpeddyProp"
            style={{ height: '24px', width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #0a1f39)', letterSpacing: '-0.02em' }}>
            Speddy<span style={{ color: 'var(--primary, #fab319)' }}>Prop</span>
          </span>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary, #fab319)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted, #5d6d7e)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {selectedLanguage === 'spanish' ? 'Centro de Ayuda' : 'Help & Support'}
          </span>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div
          style={{
            maxWidth: '1020px',
            margin: '0 auto',
            padding: '5rem 1.5rem',
            textAlign: 'center',
            background: 'var(--bg-surface-solid, #ffffff)',
            borderRadius: '20px',
            border: '1px solid var(--border-color, rgba(10, 31, 57, 0.08))',
            boxShadow: 'var(--shadow-md, 0 4px 20px -4px rgba(10, 31, 57, 0.08))'
          }}
        >
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary, #fab319)', margin: '0 auto 1rem' }} />
          <h4 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary, #0a1f39)', fontSize: '1.1rem', fontWeight: 700 }}>
            {selectedLanguage === 'spanish' ? 'Cargando Centro de Ayuda y Soporte...' : 'Loading Help & Support...'}
          </h4>
        </div>
      ) : (
        /* ============================================================== */
        /* CLEAN DOCUMENT CARD MATCHING TERMS AND CONDITIONS DESIGN       */
        /* ============================================================== */
        <article
          className="terms-document-card"
          style={{
            background: 'var(--bg-surface-solid, #ffffff)',
            borderRadius: '20px',
            border: '1px solid var(--border-color, rgba(10, 31, 57, 0.08))',
            boxShadow: '0 12px 40px -10px rgba(10, 31, 57, 0.07)',
            borderTop: '4px solid var(--text-primary, #0a1f39)',
            padding: '3.75rem 4.5rem 5rem',
            boxSizing: 'border-box',
            maxWidth: '1020px',
            width: '100%',
            margin: '0 auto'
          }}
        >
          {/* Centered Document Title */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1
              style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                color: 'var(--text-primary, #0a1f39)',
                margin: '0 0 0.75rem',
                lineHeight: 1.25,
                letterSpacing: '-0.03em'
              }}
            >
              {title || (selectedLanguage === 'spanish' ? 'Ayuda y Soporte' : 'Help & Support')}
            </h1>

            {/* Subtle decorative gold accent bar under title */}
            <div
              style={{
                width: '56px',
                height: '3.5px',
                background: 'var(--primary, #fab319)',
                borderRadius: '2px',
                margin: '0.85rem auto 0'
              }}
            />

            {/* Subtitle Description */}
            {subtitle && (
              <p
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--text-secondary, #475569)',
                  maxWidth: '680px',
                  margin: '1.15rem auto 0',
                  lineHeight: 1.6
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Formatted Content Body */}
          <div style={{ boxSizing: 'border-box' }}>
            {renderFormattedContent(content)}
          </div>

          {/* Elegant Document Footer */}
          <div
            style={{
              marginTop: '3.5rem',
              paddingTop: '1.75rem',
              borderTop: '1px solid var(--border-color, rgba(10, 31, 57, 0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #5d6d7e)' }}>
              © {new Date().getFullYear()} SpeddyProp. {selectedLanguage === 'spanish' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #5d6d7e)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={13} style={{ color: 'var(--primary, #fab319)' }} />
              soporte@speedyprop.com
            </span>
          </div>
        </article>
      )}

      {/* TYPOGRAPHY, SPACING & PRINT STYLES */}
      <style>{`
        .terms-html-content {
          color: var(--text-secondary, #2c3e50);
          font-size: 0.985rem;
          line-height: 1.85;
          font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
        }
        .terms-html-content p {
          margin: 0 0 1.25rem 0;
          line-height: 1.85;
          color: #334155;
        }
        .terms-html-content h1,
        .terms-html-content h2,
        .terms-html-content h3,
        .terms-html-content h4 {
          color: var(--text-primary, #0a1f39);
          font-weight: 700;
          margin-top: 2.25rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
          letter-spacing: -0.015em;
        }
        .terms-html-content h1 { font-size: 1.6rem; }
        .terms-html-content h2 { font-size: 1.35rem; }
        .terms-html-content h3 { font-size: 1.15rem; }
        .terms-html-content ul,
        .terms-html-content ol {
          margin: 0.85rem 0 1.35rem 1.85rem;
          padding-left: 0;
          color: #334155;
          line-height: 1.85;
        }
        .terms-html-content li {
          margin-bottom: 0.45rem;
        }
        .terms-html-content strong,
        .terms-html-content b {
          color: var(--text-primary, #0a1f39);
          font-weight: 700;
        }
        .terms-html-content hr {
          border: none;
          border-top: 1px solid var(--border-color, rgba(10, 31, 57, 0.08));
          margin: 2.25rem 0;
        }
        .terms-html-content blockquote {
          border-left: 3px solid var(--primary, #fab319);
          padding-left: 1.15rem;
          margin: 1.5rem 0;
          color: var(--text-muted, #5d6d7e);
          font-style: italic;
        }
        @media (max-width: 768px) {
          .terms-document-card {
            padding: 2.25rem 1.5rem 3.5rem !important;
            border-radius: 14px !important;
          }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          article, article * {
            visibility: visible;
          }
          article {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

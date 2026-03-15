import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallEvent(e);
      // Don't show immediately, show after a small delay
      const wasDismissed = localStorage.getItem('pwa-install-dismissed');
      if (!wasDismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setInstallEvent(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(30, 27, 75, 0.98))',
          border: '1px solid rgba(79, 70, 229, 0.4)',
          borderRadius: 16,
          padding: '1.25rem 1.5rem',
          maxWidth: 340,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(79, 70, 229, 0.15)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--primary), #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
          }}>
            <Smartphone size={22} color="white" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Install AttendX</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Works offline • Fast access</p>
          </div>
        </div>

        <button
          onClick={handleInstall}
          style={{
            width: '100%',
            padding: '0.65rem 1rem',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, var(--primary), #7C3AED)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.5)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Download size={16} /> Install App
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

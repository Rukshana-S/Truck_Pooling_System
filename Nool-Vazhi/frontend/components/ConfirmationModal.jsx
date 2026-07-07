'use client';
import { useEffect, useRef } from 'react';

const typeStyles = {
  Danger: { color: '#EF4444', icon: 'fa-solid fa-triangle-exclamation' },
  Warning: { color: '#F97316', icon: 'fa-solid fa-circle-exclamation' },
  Success: { color: '#10B981', icon: 'fa-solid fa-circle-check' },
  Info: { color: '#1E3A8A', icon: 'fa-solid fa-circle-info' }
};

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'Danger',
  loading = false,
  onConfirm,
  onCancel,
  safeClose = true // allow clicking backdrop to close
}) {
  const modalRef = useRef(null);

  // Focus trap & ESC to close
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the cancel button by default for safety
      if (modalRef.current) {
        const cancelBtn = modalRef.current.querySelector('[data-id="cancel-btn"]');
        if (cancelBtn) cancelBtn.focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !loading && safeClose) {
          onCancel();
        }
        // Focus trap
        if (e.key === 'Tab') {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length === 0) return;
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, loading, onCancel, safeClose]);

  if (!isOpen) return null;

  const styleConfig = typeStyles[type] || typeStyles.Danger;

  return (
    <div 
      style={styles.overlay} 
      onClick={(e) => {
        if (e.target === e.currentTarget && safeClose && !loading) {
          onCancel();
        }
      }}
    >
      <div style={styles.modal} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div style={styles.iconContainer}>
          <i className={styleConfig.icon} style={{ color: styleConfig.color, fontSize: '2.5rem' }}></i>
        </div>
        <h2 id="modal-title" style={styles.title}>{title}</h2>
        <div style={styles.message}>
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        
        <div style={styles.buttonGroup}>
          <button 
            data-id="cancel-btn"
            style={styles.cancelBtn} 
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            style={{ ...styles.confirmBtn, backgroundColor: styleConfig.color, opacity: loading ? 0.7 : 1 }} 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner} className="fa-solid fa-circle-notch fa-spin"></span>
            ) : null}
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999, // Extremely high
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px 24px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    animation: 'scaleUp 0.2s ease-out',
  },
  iconContainer: {
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 12px 0',
    color: '#1E3A8A',
    fontSize: '1.25rem',
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    color: '#475569',
    fontSize: '0.95rem',
    textAlign: 'center',
    marginBottom: '24px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    width: '100%',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  confirmBtn: {
    flex: 1,
    padding: '10px 16px',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.2s',
  },
  spinner: {
    fontSize: '1rem',
  }
};

if (typeof document !== 'undefined') {
  if (!document.getElementById('confirmation-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'confirmation-modal-styles';
    style.innerHTML = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    `;
    document.head.appendChild(style);
  }
}

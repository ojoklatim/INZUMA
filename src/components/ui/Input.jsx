import React from 'react';
import './ui.css';

export default function Input({
  label,
  error,
  id,
  className = '',
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  return (
    <div className={`input-container ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className="input-element"
        style={error ? { borderColor: 'var(--danger)' } : {}}
        {...props}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
}

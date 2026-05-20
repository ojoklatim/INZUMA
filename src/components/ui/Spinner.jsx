import React from 'react';
import './ui.css';

export default function Spinner({ size = 16, className = '', ...props }) {
  return (
    <span className={`spinner-container ${className}`} {...props}>
      <svg
        className="spinner-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" />
        <path d="M12 2C6.47715 2 2 6.47715 2 12" />
      </svg>
    </span>
  );
}

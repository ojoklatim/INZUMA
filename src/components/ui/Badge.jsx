import React from 'react';
import './ui.css';

export default function Badge({
  children,
  variant = 'mood', // 'mood' | 'specialist' | 'success' | 'danger' | 'muted'
  className = '',
  ...props
}) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}

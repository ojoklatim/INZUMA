import React from 'react';
import Spinner from './Spinner';
import './ui.css';

export default function Button({
  children,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner size={14} />}
      {children}
    </button>
  );
}

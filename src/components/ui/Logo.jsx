import React from 'react';

/**
 * Premium high-contrast Inzuma geometric lightning monogram
 */
export default function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Background (Optional clean circular shadow or wrapper if desired, keeping it clean transparent here) */}
      
      {/* Monogram Monolith Geometric Path */}
      <path
        d="M50 135 L90 55 L75 55 L35 135 Z"
        fill="currentColor"
      />
      <path
        d="M135 135 L175 55 L160 55 L120 135 Z"
        fill="currentColor"
      />
      
      {/* Center crossing sharp lightning bolt zig-zag */}
      <path
        d="M75 145 L135 45 L105 45 L85 95 L115 95 L55 175 L85 105 L55 105 Z"
        fill="currentColor"
      />
    </svg>
  );
}

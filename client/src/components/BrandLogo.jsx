import React from 'react';

/**
 * BrandLogo - Centralized Logo component for Dizipay.
 * Responsive design rules:
 * - Desktop: Logo + Dizipay text
 * - Mobile: Logo only (text hidden on small viewports)
 */
export default function BrandLogo({
  className = '',
  imageClassName = 'h-7 w-auto object-contain',
  textClassName = 'font-display text-lg font-black tracking-tight text-slate-950',
  isAdmin = false,
  forceText = false
}) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src="/shortlogo.png"
        className={imageClassName}
        alt="Dizipay Logo"
        loading="lazy"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/shortlogo.webp';
        }}
      />
      <span className={`${textClassName} ${forceText ? 'inline-block' : 'hidden sm:inline-block'}`}>
        Dizipay
        {isAdmin && (
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full ml-1.5 border border-violet-100 font-sans inline-block align-middle -mt-0.5">
            Admin
          </span>
        )}
      </span>
    </div>
  );
}

import React from 'react';

// WHY: EmptyState informs users when a queue, table, or audit list contains no records.
// A layered circular icon container with subtle styling gives a polished, handcrafted feel
// across all 9 roles without visual clutter or heavy dependencies.
export const EmptyState = ({
  message,
  action,
  title,
  description,
  icon,
  className = '',
}) => {
  // Support both new spec (message, action) and existing callers (title, description)
  const displayTitle = title || (message ? message : 'No records found');
  const displayDesc = description || (title && message ? message : null);

  // Render contextual icon or fallback SVG
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }

    if (icon === 'shield') {
      return (
        <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    }

    if (icon === 'search') {
      return (
        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    }

    if (icon === 'inbox') {
      return (
        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      );
    }

    // Default: handcrafted document tray icon
    return (
      <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-gray-200 shadow-sm text-center ${className}`}>
      {/* Handcrafted layered focal well */}
      <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        {renderIcon()}
      </div>

      <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
        {displayTitle}
      </h3>

      {displayDesc && (
        <p className="text-sm text-gray-500 max-w-sm">
          {displayDesc}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

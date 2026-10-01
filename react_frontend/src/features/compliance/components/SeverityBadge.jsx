import React from 'react';

/**
 * Severity configuration for compliance risk levels
 */
const SEVERITY_CONFIG = {
  Low: {
    label: 'Low Risk',
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
    dot: '#10b981',
    icon: '●',
  },
  Medium: {
    label: 'Medium Risk',
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fde68a',
    dot: '#f59e0b',
    icon: '▲',
  },
  High: {
    label: 'High Risk',
    bg: '#fff7ed',
    text: '#c2410c',
    border: '#fed7aa',
    dot: '#ea580c',
    icon: '⚠',
  },
  Critical: {
    label: 'Critical Alert',
    bg: '#991b1b', // Deep crimson bg for high contrast
    text: '#ffffff',
    border: '#7f1d1d',
    dot: '#fca5a5',
    icon: '⚡',
    isAlert: true,
  },
};

/**
 * SeverityBadge Component
 * Categorical compliance risk indicators: Low, Medium, High, and Critical
 */
export function SeverityBadge({
  severity = 'Low',
  size = 'md', // 'sm' | 'md' | 'lg'
  showDot = true,
  showIcon = false,
  showLabel = true,
  isInteractive = false,
  isSelected = false,
  onClick,
  style = {},
  className = '',
}) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.Low;

  const sizeStyles = {
    sm: {
      padding: '2px 8px',
      fontSize: '11px',
      dotSize: '5px',
      gap: '4px',
    },
    md: {
      padding: '4px 10px',
      fontSize: '12px',
      dotSize: '7px',
      gap: '6px',
    },
    lg: {
      padding: '6px 14px',
      fontSize: '14px',
      dotSize: '8px',
      gap: '8px',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: currentSize.gap,
        padding: currentSize.padding,
        borderRadius: '9999px',
        fontSize: currentSize.fontSize,
        fontWeight: config.isAlert ? '700' : '600',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        boxShadow: config.isAlert
          ? '0 0 8px rgba(220, 38, 38, 0.45)'
          : isSelected
          ? '0 0 0 2px rgba(37, 99, 235, 0.4)'
          : 'none',
        cursor: isInteractive || onClick ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        transform: isSelected ? 'scale(1.04)' : 'none',
        ...style,
      }}
      className={`severity-badge severity-${severity.toLowerCase()} ${className}`}
    >
      {/* Visual Dot or Icon */}
      {showDot && (
        <span
          style={{
            width: currentSize.dotSize,
            height: currentSize.dotSize,
            borderRadius: '50%',
            backgroundColor: config.dot,
            display: 'inline-block',
            boxShadow: config.isAlert ? '0 0 4px #fca5a5' : 'none',
          }}
        />
      )}

      {showIcon && (
        <span style={{ fontSize: '11px', lineHeight: 1 }}>{config.icon}</span>
      )}

      {/* Label */}
      {showLabel && (
        <span>{config.label || severity}</span>
      )}
    </span>
  );
}

export default SeverityBadge;

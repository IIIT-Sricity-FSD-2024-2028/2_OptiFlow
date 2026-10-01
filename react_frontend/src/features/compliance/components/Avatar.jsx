import React from 'react';

/**
 * Deterministic color generation based on name string
 */
function getDeterministicColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    bg: `hsl(${hue}, 65%, 45%)`,
    lightBg: `hsl(${hue}, 70%, 92%)`,
    text: '#ffffff',
  };
}

/**
 * Extract 1-2 letter monogram from user's full name
 */
function getInitials(name = '') {
  if (!name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Role-based ring border colors for visual hierarchy
 */
const ROLE_RING_COLORS = {
  'Compliance Officer': '#7c3aed', // Purple / Violet
  'Project Manager': '#2563eb',    // Blue
  'HR': '#059669',                 // Emerald
  'Process Admin': '#d97706',      // Amber
  'Team Leader': '#0284c7',        // Sky Blue
  'Team Member': '#64748b',        // Slate
  'Auditor': '#dc2626',            // Crimson
};

/**
 * Avatar Component
 * - Initial-letter monograms
 * - Deterministic color generation
 * - Role ring borders
 * - Online presence indicator
 */
export function Avatar({
  name = 'Anonymous',
  role,
  src,
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status, // 'online' | 'offline' | 'away' | 'busy'
  showRing = true,
  className = '',
  style = {},
  onClick,
}) {
  const sizeMap = {
    xs: { px: 24, font: '10px', dot: 6 },
    sm: { px: 32, font: '12px', dot: 8 },
    md: { px: 40, font: '14px', dot: 10 },
    lg: { px: 48, font: '16px', dot: 12 },
    xl: { px: 56, font: '20px', dot: 14 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const colors = getDeterministicColor(name);
  const ringColor = role ? ROLE_RING_COLORS[role] || '#94a3b8' : null;

  const statusColors = {
    online: '#22c55e',
    offline: '#94a3b8',
    away: '#f59e0b',
    busy: '#ef4444',
  };

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${currentSize.px}px`,
        height: `${currentSize.px}px`,
        borderRadius: '50%',
        flexShrink: 0,
        boxSizing: 'border-box',
        border: showRing && ringColor ? `2px solid ${ringColor}` : '2px solid transparent',
        padding: showRing && ringColor ? '1px' : '0',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      className={className}
      title={`${name}${role ? ` (${role})` : ''}`}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: colors.bg,
          color: colors.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: currentSize.font,
          userSelect: 'none',
          letterSpacing: '0.5px',
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          getInitials(name)
        )}
      </div>

      {/* Online presence dot */}
      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: `${currentSize.dot}px`,
            height: `${currentSize.dot}px`,
            borderRadius: '50%',
            backgroundColor: statusColors[status] || statusColors.offline,
            border: '2px solid #ffffff',
            boxSizing: 'content-box',
          }}
        />
      )}
    </div>
  );
}

/**
 * AvatarGroup Component
 * - Overlapping cluster of avatars with +N counter
 */
export function AvatarGroup({
  users = [],
  max = 4,
  size = 'md',
  showRing = true,
  onMoreClick,
  style = {},
}) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const sizeMap = {
    xs: { px: 24, font: '10px', overlap: '-6px' },
    sm: { px: 32, font: '11px', overlap: '-8px' },
    md: { px: 40, font: '13px', overlap: '-10px' },
    lg: { px: 48, font: '14px', overlap: '-12px' },
    xl: { px: 56, font: '16px', overlap: '-14px' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexDirection: 'row',
        ...style,
      }}
    >
      {visibleUsers.map((user, idx) => (
        <div
          key={user.id || user.name || idx}
          style={{
            marginLeft: idx === 0 ? '0px' : currentSize.overlap,
            zIndex: visibleUsers.length - idx,
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <Avatar
            name={user.name}
            role={user.role}
            src={user.avatar}
            size={size}
            status={user.status}
            showRing={showRing}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          onClick={onMoreClick}
          style={{
            marginLeft: currentSize.overlap,
            zIndex: 0,
            width: `${currentSize.px}px`,
            height: `${currentSize.px}px`,
            borderRadius: '50%',
            backgroundColor: '#e2e8f0',
            border: '2px solid #ffffff',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: currentSize.font,
            cursor: onMoreClick ? 'pointer' : 'default',
            userSelect: 'none',
          }}
          title={`${remainingCount} more users`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export default Avatar;

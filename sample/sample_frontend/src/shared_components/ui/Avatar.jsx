import { clsx } from 'clsx';

// ─── Role ring color mapping ──────────────────────────────────────────────────
const ROLE_RING_COLORS = {
  SuperUser:         '#2563eb',
  System_Admin:      '#7c3aed',
  Process_Admin:     '#0891b2',
  Company_Owner:     '#b45309',
  Branch_Manager:    '#059669',
  Project_Manager:   '#2563eb',
  Compliance_Officer:'#dc2626',
  HR_Manager:        '#db2777',
  Team_Leader:       '#9333ea',
  Team_Member:       '#475569',
  Platform_Admin:    '#1d4ed8',
};

// ─── Presence status colors ───────────────────────────────────────────────────
const PRESENCE_COLORS = {
  online:  '#22c55e',
  away:    '#f59e0b',
  busy:    '#ef4444',
  offline: '#94a3b8',
};

// ─── Generate deterministic initials & color from name ───────────────────────
function getInitials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('');
}

function getAvatarColor(name = '') {
  const PALETTE = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#9333ea'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// ─── Single Avatar ────────────────────────────────────────────────────────────
/**
 * Avatar
 * ──────
 * Profile picture with initials fallback, online presence dot, and role ring.
 *
 * @param {string} name        - User display name (used for initials + color)
 * @param {string} [src]       - Avatar image URL (optional)
 * @param {string} [role]      - OptiFlow role (adds colored ring border)
 * @param {string} [presence]  - 'online' | 'away' | 'busy' | 'offline'
 * @param {number} [size]      - Pixel size (default: 36)
 */
export function Avatar({ name = '', src, role, presence, size = 36, className, style }) {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);
  const ringColor = role ? ROLE_RING_COLORS[role] : undefined;
  const fontSize = Math.max(10, Math.round(size * 0.38));
  const presenceDotSize = Math.max(7, Math.round(size * 0.28));

  return (
    <span
      className={clsx('avatar', className)}
      title={name}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        overflow: 'hidden',
        border: ringColor ? `2.5px solid ${ringColor}` : '2px solid var(--border-color)',
        backgroundColor: bgColor,
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <span style={{ color: '#fff', fontSize, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {initials || '?'}
        </span>
      )}

      {presence && (
        <span style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: presenceDotSize,
          height: presenceDotSize,
          borderRadius: '50%',
          backgroundColor: PRESENCE_COLORS[presence] ?? '#94a3b8',
          border: '2px solid white',
        }} />
      )}
    </span>
  );
}

// ─── Avatar Group ─────────────────────────────────────────────────────────────
/**
 * AvatarGroup
 * ───────────
 * Renders overlapping avatars with +N overflow indicator.
 *
 * @param {Array<{name, src, role}>} users  - Array of user objects
 * @param {number} [max]                    - Max visible avatars (default: 3)
 * @param {number} [size]                   - Avatar size in px (default: 30)
 */
export function AvatarGroup({ users = [], max = 3, size = 30 }) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const bgColor = getAvatarColor('overflow');

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {visible.map((user, i) => (
        <Avatar
          key={user.id ?? user.name ?? i}
          name={user.name}
          src={user.src}
          role={user.role}
          size={size}
          style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: visible.length - i }}
        />
      ))}
      {overflow > 0 && (
        <span
          title={`${overflow} more`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: '#e2e8f0',
            color: '#475569',
            fontSize: Math.max(9, Math.round(size * 0.35)),
            fontWeight: 600,
            marginLeft: -size * 0.3,
            border: '2px solid white',
            flexShrink: 0,
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}

export default Avatar;

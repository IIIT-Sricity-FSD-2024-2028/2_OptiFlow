import { useState, useRef, useCallback } from 'react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { Send, Trash2, Edit2, MoreHorizontal } from 'lucide-react';

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function CommentItem({ comment, currentUser, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const isOwn = comment.author?.id === currentUser?.id;

  return (
    <div
      style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--border-color)', position: 'relative' }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar name={comment.author?.name ?? ''} role={comment.author?.role} size={32} style={{ flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
            {comment.author?.name ?? 'Unknown'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {comment.author?.roleLabel ?? comment.author?.role?.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-placeholder)', marginLeft: 'auto' }}>
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {comment.body}
        </p>
      </div>

      {/* Owner actions */}
      {isOwn && showActions && (
        <div style={{ position: 'absolute', top: 12, right: 0, display: 'flex', gap: 4 }}>
          <button
            onClick={() => onDelete?.(comment.id)}
            aria-label="Delete comment"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--text-muted)', borderRadius: 4, display: 'flex',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * CommentThread
 * ─────────────
 * Nested chronological discussion feed on tasks and subtasks.
 * Features auto-expanding textarea, optimistic comment submission,
 * relative timestamps, and author deletion permissions.
 *
 * @param {Array}    comments            - Array of comment objects
 * @param {Function} onSubmit            - Called with { body } on submit
 * @param {Function} [onDelete]          - Called with commentId on delete
 * @param {boolean}  [isSubmitting]      - Shows loading state on submit
 */
export default function CommentThread({ comments = [], onSubmit, onDelete, isSubmitting = false }) {
  const [body, setBody] = useState('');
  const textareaRef = useRef(null);
  const { currentUser } = useAuth();

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    await onSubmit?.({ body: trimmed });
    setBody('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [body, onSubmit]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e);
    }
  };

  const autoResize = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  return (
    <div>
      {/* Comments list */}
      <div>
        {comments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>
            No comments yet. Be the first to comment.
          </p>
        ) : (
          comments.map((c, idx) => (
            <CommentItem
              key={c.id ?? idx}
              comment={c}
              currentUser={currentUser}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Compose */}
      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <Avatar name={currentUser?.name ?? ''} role={currentUser?.role} size={32} style={{ flexShrink: 0, marginTop: 4 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            ref={textareaRef}
            id="comment-input"
            value={body}
            onChange={e => { setBody(e.target.value); autoResize(e); }}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment… (Ctrl+Enter to submit)"
            rows={2}
            style={{
              width: '100%', resize: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)', padding: '10px 12px',
              fontSize: 13, fontFamily: 'inherit', outline: 'none',
              transition: 'border-color var(--transition-fast)',
              color: 'var(--text-main)',
              lineHeight: 1.55,
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 2px var(--primary-ring)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              id="comment-submit-btn"
              disabled={!body.trim() || isSubmitting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                background: body.trim() ? 'var(--primary-color)' : 'var(--surface-3)',
                color: body.trim() ? 'white' : 'var(--text-muted)',
                border: 'none', fontSize: 13, fontWeight: 500,
                cursor: body.trim() ? 'pointer' : 'not-allowed',
                transition: 'all var(--transition)',
              }}
            >
              <Send size={13} />
              {isSubmitting ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

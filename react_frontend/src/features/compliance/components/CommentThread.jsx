import React, { useState, useRef, useEffect } from 'react';
import Avatar from './Avatar';

/**
 * Utility: Format relative timestamp
 */
function getRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const now = Date.now();
  const past = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diffSeconds = Math.floor((now - past) / 1000);

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 172800) return 'Yesterday';
  return new Date(past).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * CommentThread Component
 * - Chronological discussion stream
 * - Author avatars with role ring borders
 * - Relative timestamps
 * - Auto-resizing textarea
 * - Ctrl+Enter keyboard shortcut
 * - Author deletion permissions
 */
export function CommentThread({
  comments = [],
  currentUser = {
    name: 'Vaitish S',
    role: 'Compliance Officer',
    email: 'vaitish.compliance@optiflow.io',
  },
  onAddComment,
  onDeleteComment,
  placeholder = 'Add to regulatory audit log or compliance discussion... (Ctrl+Enter to post)',
  title = 'Regulatory Audit Discussion Thread',
  style = {},
}) {
  const [commentText, setCommentText] = useState('');
  const [tag, setTag] = useState('Audit Note'); // 'Audit Note' | 'Policy Citation' | 'Evidence Query'
  const textareaRef = useRef(null);

  /**
   * Auto-resize textarea height as user types
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [commentText]);

  /**
   * Submit comment handler
   */
  const handlePost = () => {
    if (!commentText.trim()) return;

    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: currentUser.name,
      role: currentUser.role,
      avatar: currentUser.avatar,
      tag: tag,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    if (onAddComment) {
      onAddComment(newComment);
    }

    setCommentText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  /**
   * Keyboard shortcut: Ctrl+Enter / Cmd+Enter to post
   */
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handlePost();
    }
  };

  /**
   * Check if current user can delete the comment
   */
  const canDelete = (comment) => {
    if (!currentUser) return false;
    // Author can delete, or Compliance Officer can moderate
    return (
      comment.author === currentUser.name ||
      currentUser.role === 'Compliance Officer' ||
      currentUser.role === 'Admin'
    );
  };

  const tagStyles = {
    'Audit Note': { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
    'Policy Citation': { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    'Evidence Query': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    'Violation Flag': { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>💬</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              {title}
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {comments.length} {comments.length === 1 ? 'entry' : 'entries'} in audit trail
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          Shortcut: <kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Ctrl</kbd> + <kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Enter</kbd>
        </span>
      </div>

      {/* Chronological Stream */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '380px',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
            No regulatory notes logged yet. Start the compliance discussion below.
          </div>
        ) : (
          comments.map((comment) => {
            const currentTagStyle = tagStyles[comment.tag] || tagStyles['Audit Note'];
            const userCanDelete = canDelete(comment);

            return (
              <div
                key={comment.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Avatar
                  name={comment.author}
                  role={comment.role}
                  src={comment.avatar}
                  size="md"
                  status="online"
                />

                <div style={{ flex: 1 }}>
                  {/* Author meta line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                        {comment.author}
                      </span>
                      {comment.role && (
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                          • {comment.role}
                        </span>
                      )}
                      {comment.tag && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: currentTagStyle.bg,
                            color: currentTagStyle.text,
                            border: `1px solid ${currentTagStyle.border}`,
                          }}
                        >
                          {comment.tag}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {getRelativeTime(comment.createdAt)}
                      </span>
                      {userCanDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment && onDeleteComment(comment.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: '2px',
                            lineHeight: 1,
                          }}
                          title="Delete note (Author / Compliance Officer permission)"
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment body */}
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '13px',
                      color: '#334155',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {comment.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Tag as:</span>
          {['Audit Note', 'Policy Citation', 'Evidence Query', 'Violation Flag'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                border: '1px solid',
                borderColor: tag === t ? '#7c3aed' : '#e2e8f0',
                backgroundColor: tag === t ? '#f5f3ff' : '#ffffff',
                color: tag === t ? '#6d28d9' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Avatar
            name={currentUser.name}
            role={currentUser.role}
            size="md"
            status="online"
          />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                color: '#0f172a',
                resize: 'none',
                boxSizing: 'border-box',
                outline: 'none',
                lineHeight: '1.4',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handlePost}
                disabled={!commentText.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: commentText.trim() ? '#7c3aed' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: commentText.trim() ? '0 1px 2px rgba(124, 58, 237, 0.3)' : 'none',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Log Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommentThread;

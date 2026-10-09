import React from 'react';
import { Link } from 'react-router-dom';
import styles from './ShortcutCard.module.css';

export const ShortcutCard = ({
  to,
  title,
  description,
  icon,
  onClick,
  badge,
}) => {
  const content = (
    <div className={styles.card}>
      {icon && <div className={styles.iconWrapper}>{icon}</div>}
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={styles.link}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={styles.btn}>
      {content}
    </button>
  );
};

export default ShortcutCard;

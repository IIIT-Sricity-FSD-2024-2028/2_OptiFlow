import { Injectable } from '@nestjs/common';
import { DatabaseService, AppNotification } from '../../core/database/database.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): AppNotification[] {
    return this.db.notifications;
  }

  findByUser(userId: number): AppNotification[] {
    return this.db.notifications.filter(n => n.user_id === userId);
  }

  create(data: Partial<AppNotification>) {
    const newNotification: AppNotification = {
      notification_id: Date.now(),
      user_id: data.user_id || 0,
      title: data.title || 'Notification',
      message: data.message || '',
      type: data.type || 'System',
      is_read: false,
      link: data.link || '',
      created_at: new Date().toISOString(),
    };
    this.db.notifications.unshift(newNotification); // Newest first
    return newNotification;
  }

  markAsRead(id: number) {
    const n = this.db.notifications.find(x => x.notification_id === id);
    if (n) n.is_read = true;
    return n;
  }

  markAllAsRead(userId: number) {
    this.db.notifications
      .filter(n => n.user_id === userId)
      .forEach(n => n.is_read = true);
  }
}

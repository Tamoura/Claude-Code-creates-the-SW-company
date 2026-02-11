'use client';

import { useEffect, useState } from 'react';
import { apiClient, type Notification } from '../../../lib/api-client';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await apiClient.getNotifications();
        setNotifications(res.notifications);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  async function handleMarkRead(notificationId: string) {
    try {
      await apiClient.markNotificationRead(notificationId);
      setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You are all caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
          >
            {markingAll ? 'Marking all...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            You are all caught up. Notifications about assessments, career updates, and account activity will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => !notification.read && handleMarkRead(notification.id)}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
            >
              <div className="flex gap-3">
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{notification.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                  <p className="text-xs text-gray-400">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

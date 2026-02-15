/**
 * Mock data: Notifications
 * QDB One Unified Portal Prototype
 */

export interface Notification {
  id: string;
  personId: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  sourcePortal: 'financing' | 'guarantee' | 'advisory' | 'system';
  deepLink: string;
  read: boolean;
  createdAt: string;
}

// Mock Notifications
export const notifications: Notification[] = [
  {
    id: 'notif-001',
    personId: 'person-001', // Fatima Al-Kuwari
    title: 'Guarantee Signature Required',
    titleAr: 'مطلوب توقيع على الضمان',
    body: 'Guarantee GR-2024-789 requires your signature. Please review and sign to activate the bank guarantee for Qatar Tech Ventures.',
    bodyAr: 'الضمان GR-2024-789 يتطلب توقيعك. يرجى المراجعة والتوقيع لتفعيل الضمان البنكي لشركة قطر تك فنتشرز.',
    sourcePortal: 'guarantee',
    deepLink: '/guarantees/GR-2024-789',
    read: false,
    createdAt: '2026-02-15T11:30:00Z'
  },
  {
    id: 'notif-002',
    personId: 'person-001',
    title: 'Loan Application Approved!',
    titleAr: 'تمت الموافقة على طلب القرض!',
    body: 'Great news! Your Trade Finance application (LA-2025-038) for QAR 1,200,000 has been approved. Disbursement is pending final signature.',
    bodyAr: 'أخبار رائعة! تمت الموافقة على طلب التمويل التجاري (LA-2025-038) بقيمة 1,200,000 ريال قطري. الصرف معلق على التوقيع النهائي.',
    sourcePortal: 'financing',
    deepLink: '/financing/applications/LA-2025-038',
    read: false,
    createdAt: '2026-02-14T16:30:00Z'
  },
  {
    id: 'notif-003',
    personId: 'person-001',
    title: 'Advisory Session Confirmed',
    titleAr: 'تأكيد جلسة استشارية',
    body: 'Your advisory session "Financial Planning for Expansion" with Dr. Hassan Al-Mahmoud is confirmed for March 1, 2026 at 10:00 AM.',
    bodyAr: 'تم تأكيد جلستك الاستشارية "التخطيط المالي للتوسع" مع د. حسن المحمود في 1 مارس 2026 الساعة 10:00 صباحاً.',
    sourcePortal: 'advisory',
    deepLink: '/advisory/sessions/ADV-SES-001',
    read: true,
    createdAt: '2026-02-13T09:15:00Z'
  },
  {
    id: 'notif-004',
    personId: 'person-001',
    title: 'Upcoming Payment Reminder',
    titleAr: 'تذكير بالدفعة القادمة',
    body: 'Your loan payment of QAR 42,500 for Business Expansion Loan (LN-2024-001) is due on March 15, 2026.',
    bodyAr: 'دفعة القرض بقيمة 42,500 ريال قطري لقرض التوسع التجاري (LN-2024-001) مستحقة في 15 مارس 2026.',
    sourcePortal: 'financing',
    deepLink: '/financing/loans/LN-2024-001',
    read: true,
    createdAt: '2026-02-12T08:00:00Z'
  },
  {
    id: 'notif-005',
    personId: 'person-001',
    title: 'Document Upload Required',
    titleAr: 'مطلوب تحميل مستند',
    body: 'Please upload updated financial statements for loan application LA-2025-042 to continue the review process.',
    bodyAr: 'يرجى تحميل البيانات المالية المحدثة لطلب القرض LA-2025-042 لمتابعة عملية المراجعة.',
    sourcePortal: 'financing',
    deepLink: '/financing/applications/LA-2025-042/documents',
    read: true,
    createdAt: '2026-02-10T14:20:00Z'
  },
  {
    id: 'notif-006',
    personId: 'person-001',
    title: 'Program Milestone Completed',
    titleAr: 'إنجاز مرحلة البرنامج',
    body: 'Congratulations! You have completed the "Strategic Planning Workshop" milestone in the SME Growth Accelerator program.',
    bodyAr: 'تهانينا! لقد أكملت مرحلة "ورشة التخطيط الاستراتيجي" في برنامج تسريع نمو المؤسسات الصغيرة والمتوسطة.',
    sourcePortal: 'advisory',
    deepLink: '/advisory/programs/PRG-001',
    read: true,
    createdAt: '2025-12-18T16:45:00Z'
  },
  {
    id: 'notif-007',
    personId: 'person-001',
    title: 'Claim Filed on Guarantee',
    titleAr: 'تم تقديم مطالبة على الضمان',
    body: 'A claim (CLM-2025-001) has been filed against guarantee GR-2023-456. The claim is under review.',
    bodyAr: 'تم تقديم مطالبة (CLM-2025-001) على الضمان GR-2023-456. المطالبة قيد المراجعة.',
    sourcePortal: 'guarantee',
    deepLink: '/guarantees/GR-2023-456/claims',
    read: true,
    createdAt: '2025-02-01T10:30:00Z'
  },
  {
    id: 'notif-008',
    personId: 'person-001',
    title: 'System Maintenance Notice',
    titleAr: 'إشعار صيانة النظام',
    body: 'QDB One portal will undergo scheduled maintenance on February 20, 2026 from 2:00 AM to 6:00 AM. Services may be temporarily unavailable.',
    bodyAr: 'سيخضع بوابة QDB One لصيانة مجدولة في 20 فبراير 2026 من الساعة 2:00 صباحاً إلى 6:00 صباحاً. قد تكون الخدمات غير متاحة مؤقتاً.',
    sourcePortal: 'system',
    deepLink: '/system/maintenance',
    read: true,
    createdAt: '2026-02-08T12:00:00Z'
  }
];

// Helper functions
export function getNotificationsByPerson(personId: string): Notification[] {
  return notifications
    .filter(n => n.personId === personId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadNotifications(personId: string): Notification[] {
  return notifications.filter(n => n.personId === personId && !n.read);
}

export function getUnreadCount(personId: string): number {
  return getUnreadNotifications(personId).length;
}

export function getNotificationsByPortal(personId: string, portal: Notification['sourcePortal']): Notification[] {
  return notifications
    .filter(n => n.personId === personId && n.sourcePortal === portal)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markAsRead(notificationId: string): void {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
}

export function markAllAsRead(personId: string): void {
  notifications
    .filter(n => n.personId === personId)
    .forEach(n => n.read = true);
}

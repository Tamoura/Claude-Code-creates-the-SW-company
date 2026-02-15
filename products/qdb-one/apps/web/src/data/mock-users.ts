/**
 * Mock user sessions for prototype login
 * Maps persons data to AuthContext UserSession shape
 */
import type { UserSession } from '@/contexts/AuthContext';

export const mockUsers: Record<string, UserSession> = {
  'fatima': {
    personId: 'person-001',
    qid: '28412345678',
    fullNameAr: 'فاطمة الكواري',
    fullNameEn: 'Fatima Al-Kuwari',
    email: 'fatima@alkuwari-trading.qa',
    activeOrgId: 'org-001',
    personas: [
      {
        orgId: 'org-001',
        orgNameAr: 'الكواري للتجارة ذ.م.م',
        orgNameEn: 'Al-Kuwari Trading LLC',
        crNumber: '12345',
        roles: [
          { portal: 'financing', role: 'customer' },
          { portal: 'advisory', role: 'stakeholder' },
        ],
      },
      {
        orgId: 'org-002',
        orgNameAr: 'قطر تك فنتشرز',
        orgNameEn: 'Qatar Tech Ventures',
        crNumber: '67890',
        roles: [
          { portal: 'guarantee', role: 'authorized_signatory' },
        ],
      },
    ],
  },
  'ahmed': {
    personId: 'person-002',
    qid: '28498765432',
    fullNameAr: 'أحمد آل ثاني',
    fullNameEn: 'Ahmed Al-Thani',
    email: 'ahmed@qatartech.qa',
    activeOrgId: 'org-002',
    personas: [
      {
        orgId: 'org-002',
        orgNameAr: 'قطر تك فنتشرز',
        orgNameEn: 'Qatar Tech Ventures',
        crNumber: '67890',
        roles: [
          { portal: 'financing', role: 'customer' },
        ],
      },
    ],
  },
};

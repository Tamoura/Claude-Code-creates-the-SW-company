/**
 * Mock data: Activity Feed
 * QDB One Unified Portal Prototype
 */

export interface Activity {
  id: string;
  personId: string;
  orgId: string;
  sourcePortal: 'financing' | 'guarantee' | 'advisory';
  action: string;
  description: string;
  descriptionAr: string;
  sourceRecordId: string;
  deepLink: string;
  createdAt: string;
}

// Mock Activity Feed
export const activities: Activity[] = [
  {
    id: 'act-001',
    personId: 'person-001', // Fatima Al-Kuwari
    orgId: 'org-001', // Al-Kuwari Trading
    sourcePortal: 'financing',
    action: 'application_approved',
    description: 'Loan application LA-2025-038 (Trade Finance) approved for QAR 1,200,000',
    descriptionAr: 'تمت الموافقة على طلب القرض LA-2025-038 (التمويل التجاري) بقيمة 1,200,000 ريال قطري',
    sourceRecordId: 'LA-2025-038',
    deepLink: '/financing/applications/LA-2025-038',
    createdAt: '2026-02-14T16:30:00Z'
  },
  {
    id: 'act-002',
    personId: 'person-001',
    orgId: 'org-001',
    sourcePortal: 'advisory',
    action: 'session_scheduled',
    description: 'Advisory session "Financial Planning for Expansion" scheduled for March 1, 2026 with Dr. Hassan Al-Mahmoud',
    descriptionAr: 'تم جدولة جلسة استشارية "التخطيط المالي للتوسع" في 1 مارس 2026 مع د. حسن المحمود',
    sourceRecordId: 'ADV-SES-001',
    deepLink: '/advisory/sessions/ADV-SES-001',
    createdAt: '2026-02-13T09:15:00Z'
  },
  {
    id: 'act-003',
    personId: 'person-001',
    orgId: 'org-001',
    sourcePortal: 'financing',
    action: 'application_submitted',
    description: 'Equipment Finance application LA-2025-042 submitted for QAR 750,000',
    descriptionAr: 'تم تقديم طلب تمويل المعدات LA-2025-042 بقيمة 750,000 ريال قطري',
    sourceRecordId: 'LA-2025-042',
    deepLink: '/financing/applications/LA-2025-042',
    createdAt: '2026-02-10T09:30:00Z'
  },
  {
    id: 'act-004',
    personId: 'person-001',
    orgId: 'org-002', // Qatar Tech Ventures
    sourcePortal: 'guarantee',
    action: 'guarantee_created',
    description: 'Bank Guarantee GR-2024-789 created for QAR 1,000,000 - pending signature',
    descriptionAr: 'تم إنشاء الضمان البنكي GR-2024-789 بقيمة 1,000,000 ريال قطري - في انتظار التوقيع',
    sourceRecordId: 'GR-2024-789',
    deepLink: '/guarantees/GR-2024-789',
    createdAt: '2026-02-08T11:20:00Z'
  },
  {
    id: 'act-005',
    personId: 'person-001',
    orgId: 'org-002',
    sourcePortal: 'guarantee',
    action: 'claim_filed',
    description: 'Claim CLM-2025-001 filed against Performance Guarantee GR-2023-456 for QAR 125,000',
    descriptionAr: 'تم تقديم مطالبة CLM-2025-001 على ضمان الأداء GR-2023-456 بقيمة 125,000 ريال قطري',
    sourceRecordId: 'CLM-2025-001',
    deepLink: '/guarantees/GR-2023-456/claims',
    createdAt: '2025-02-01T09:45:00Z'
  },
  {
    id: 'act-006',
    personId: 'person-001',
    orgId: 'org-001',
    sourcePortal: 'advisory',
    action: 'session_completed',
    description: 'Completed advisory session "Market Entry Strategy for GCC Region" with Ms. Noora Al-Mannai',
    descriptionAr: 'تم إكمال الجلسة الاستشارية "استراتيجية دخول السوق لمنطقة الخليج" مع السيدة نورة المناعي',
    sourceRecordId: 'ADV-SES-002',
    deepLink: '/advisory/sessions/ADV-SES-002',
    createdAt: '2026-01-15T14:00:00Z'
  },
  {
    id: 'act-007',
    personId: 'person-001',
    orgId: 'org-001',
    sourcePortal: 'advisory',
    action: 'milestone_completed',
    description: 'Completed milestone "Strategic Planning Workshop" in SME Growth Accelerator program',
    descriptionAr: 'تم إكمال مرحلة "ورشة التخطيط الاستراتيجي" في برنامج تسريع نمو المؤسسات الصغيرة والمتوسطة',
    sourceRecordId: 'PRG-001',
    deepLink: '/advisory/programs/PRG-001',
    createdAt: '2025-12-18T16:45:00Z'
  },
  {
    id: 'act-008',
    personId: 'person-001',
    orgId: 'org-001',
    sourcePortal: 'advisory',
    action: 'assessment_completed',
    description: 'Business Maturity Assessment completed with overall score of 72/100',
    descriptionAr: 'تم إكمال تقييم نضج الأعمال بدرجة إجمالية 72/100',
    sourceRecordId: 'ASMT-001',
    deepLink: '/advisory/assessments/ASMT-001',
    createdAt: '2025-12-18T10:30:00Z'
  },
  {
    id: 'act-009',
    personId: 'person-001',
    orgId: 'org-001',
    sourcePortal: 'financing',
    action: 'payment_completed',
    description: 'Payment of QAR 42,500 processed for Business Expansion Loan LN-2024-001',
    descriptionAr: 'تم معالجة دفعة بقيمة 42,500 ريال قطري لقرض التوسع التجاري LN-2024-001',
    sourceRecordId: 'LN-2024-001',
    deepLink: '/financing/loans/LN-2024-001',
    createdAt: '2024-07-15T00:00:00Z'
  },
  {
    id: 'act-010',
    personId: 'person-001',
    orgId: 'org-001',
    sourcePortal: 'financing',
    action: 'loan_disbursed',
    description: 'Business Expansion Loan LN-2024-001 for QAR 2,000,000 disbursed',
    descriptionAr: 'تم صرف قرض التوسع التجاري LN-2024-001 بقيمة 2,000,000 ريال قطري',
    sourceRecordId: 'LN-2024-001',
    deepLink: '/financing/loans/LN-2024-001',
    createdAt: '2024-03-15T00:00:00Z'
  },
  {
    id: 'act-011',
    personId: 'person-001',
    orgId: 'org-002',
    sourcePortal: 'guarantee',
    action: 'guarantee_signed',
    description: 'Performance Guarantee GR-2023-456 signed and activated',
    descriptionAr: 'تم توقيع وتفعيل ضمان الأداء GR-2023-456',
    sourceRecordId: 'GR-2023-456',
    deepLink: '/guarantees/GR-2023-456',
    createdAt: '2023-09-12T14:30:00Z'
  },
  {
    id: 'act-012',
    personId: 'person-001',
    orgId: 'org-001',
    sourcePortal: 'guarantee',
    action: 'guarantee_signed',
    description: 'Bid Bond GR-2024-100 signed and activated',
    descriptionAr: 'تم توقيع وتفعيل ضمان العطاء GR-2024-100',
    sourceRecordId: 'GR-2024-100',
    deepLink: '/guarantees/GR-2024-100',
    createdAt: '2024-01-18T10:15:00Z'
  }
];

// Helper functions
export function getActivitiesByPerson(personId: string, limit?: number): Activity[] {
  const filtered = activities
    .filter(a => a.personId === personId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return limit ? filtered.slice(0, limit) : filtered;
}

export function getActivitiesByOrg(orgId: string, limit?: number): Activity[] {
  const filtered = activities
    .filter(a => a.orgId === orgId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return limit ? filtered.slice(0, limit) : filtered;
}

export function getActivitiesByPortal(
  personId: string,
  portal: Activity['sourcePortal'],
  limit?: number
): Activity[] {
  const filtered = activities
    .filter(a => a.personId === personId && a.sourcePortal === portal)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return limit ? filtered.slice(0, limit) : filtered;
}

export function getRecentActivities(personId: string, days: number = 30): Activity[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return activities
    .filter(a => a.personId === personId && new Date(a.createdAt) >= cutoffDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

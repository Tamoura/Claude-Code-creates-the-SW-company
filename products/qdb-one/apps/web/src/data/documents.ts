/**
 * Mock data: Documents
 * QDB One Unified Portal Prototype
 */

export interface Document {
  id: string;
  name: string;
  nameAr: string;
  type: string;
  sourcePortal: 'financing' | 'guarantee' | 'advisory';
  sourceRecordId: string;
  uploadedAt: string;
  size: string;
  mimeType: string;
}

// Mock Documents
export const documents: Document[] = [
  {
    id: 'doc-001',
    name: 'Commercial Registration Certificate',
    nameAr: 'شهادة السجل التجاري',
    type: 'Legal Document',
    sourcePortal: 'financing',
    sourceRecordId: 'LA-2025-042',
    uploadedAt: '2026-02-08T10:15:00Z',
    size: '1.2 MB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-002',
    name: 'Audited Financial Statements 2025',
    nameAr: 'القوائم المالية المدققة 2025',
    type: 'Financial Statement',
    sourcePortal: 'financing',
    sourceRecordId: 'LA-2025-042',
    uploadedAt: '2026-02-08T10:20:00Z',
    size: '3.4 MB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-003',
    name: 'Trade License',
    nameAr: 'الرخصة التجارية',
    type: 'Legal Document',
    sourcePortal: 'financing',
    sourceRecordId: 'LA-2025-038',
    uploadedAt: '2026-01-28T09:00:00Z',
    size: '856 KB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-004',
    name: 'Bank Guarantee Letter GR-2024-789',
    nameAr: 'خطاب الضمان البنكي GR-2024-789',
    type: 'Guarantee Letter',
    sourcePortal: 'guarantee',
    sourceRecordId: 'GR-2024-789',
    uploadedAt: '2026-02-08T11:20:00Z',
    size: '432 KB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-005',
    name: 'Collateral Valuation Report',
    nameAr: 'تقرير تقييم الضمانات',
    type: 'Valuation Report',
    sourcePortal: 'guarantee',
    sourceRecordId: 'GR-2024-789',
    uploadedAt: '2026-02-05T14:30:00Z',
    size: '2.8 MB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-006',
    name: 'Performance Guarantee GR-2023-456',
    nameAr: 'ضمان الأداء GR-2023-456',
    type: 'Guarantee Letter',
    sourcePortal: 'guarantee',
    sourceRecordId: 'GR-2023-456',
    uploadedAt: '2023-09-15T10:00:00Z',
    size: '524 KB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-007',
    name: 'Business Maturity Assessment Report',
    nameAr: 'تقرير تقييم نضج الأعمال',
    type: 'Assessment Report',
    sourcePortal: 'advisory',
    sourceRecordId: 'ASMT-001',
    uploadedAt: '2025-12-18T10:30:00Z',
    size: '1.9 MB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-008',
    name: 'SME Growth Accelerator - Program Guide',
    nameAr: 'دليل برنامج تسريع نمو المؤسسات الصغيرة والمتوسطة',
    type: 'Program Guide',
    sourcePortal: 'advisory',
    sourceRecordId: 'PRG-001',
    uploadedAt: '2025-09-15T08:00:00Z',
    size: '4.2 MB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-009',
    name: 'GCC Market Analysis',
    nameAr: 'تحليل سوق دول مجلس التعاون الخليجي',
    type: 'Market Research',
    sourcePortal: 'advisory',
    sourceRecordId: 'ADV-SES-002',
    uploadedAt: '2026-01-15T14:00:00Z',
    size: '2.1 MB',
    mimeType: 'application/pdf'
  },
  {
    id: 'doc-010',
    name: 'Loan Agreement LN-2024-001',
    nameAr: 'اتفاقية القرض LN-2024-001',
    type: 'Loan Agreement',
    sourcePortal: 'financing',
    sourceRecordId: 'LN-2024-001',
    uploadedAt: '2024-03-15T00:00:00Z',
    size: '1.8 MB',
    mimeType: 'application/pdf'
  }
];

// Helper functions
export function getDocumentsByPortal(portal: Document['sourcePortal']): Document[] {
  return documents
    .filter(d => d.sourcePortal === portal)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function getDocumentsByRecord(sourceRecordId: string): Document[] {
  return documents
    .filter(d => d.sourceRecordId === sourceRecordId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function getDocumentById(id: string): Document | undefined {
  return documents.find(d => d.id === id);
}

export function getDocumentsByType(type: string): Document[] {
  return documents
    .filter(d => d.type === type)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function getRecentDocuments(limit: number = 10): Document[] {
  return [...documents]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, limit);
}

export function searchDocuments(query: string): Document[] {
  const lowerQuery = query.toLowerCase();
  return documents.filter(d =>
    d.name.toLowerCase().includes(lowerQuery) ||
    d.nameAr.includes(query) ||
    d.type.toLowerCase().includes(lowerQuery) ||
    d.sourceRecordId.toLowerCase().includes(lowerQuery)
  );
}

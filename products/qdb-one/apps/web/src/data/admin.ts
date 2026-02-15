/**
 * Mock data: Admin - Data Steward Match Review Queue
 * QDB One Unified Portal Prototype
 */

export interface MatchReviewItem {
  id: string;
  confidence: number;
  sourceA: {
    system: string;
    name: string;
    email?: string;
    cr?: string;
    qid?: string;
  };
  sourceB: {
    system: string;
    name: string;
    email?: string;
    cr?: string;
    qid?: string;
  };
  matchedFields: string[];
  status: 'pending' | 'approved' | 'rejected';
}

// Mock Match Review Queue
export const matchReviewQueue: MatchReviewItem[] = [
  {
    id: 'match-001',
    confidence: 95,
    sourceA: {
      system: 'Financing Portal',
      name: 'Al-Kuwari Trading LLC',
      email: 'info@alkuwari-trading.qa',
      cr: '12345'
    },
    sourceB: {
      system: 'Advisory Portal',
      name: 'Al Kuwari Trading L.L.C',
      email: 'info@alkuwari-trading.qa',
      cr: '12345'
    },
    matchedFields: ['Commercial Registration Number', 'Email Address', 'Company Name (fuzzy)'],
    status: 'pending'
  },
  {
    id: 'match-002',
    confidence: 87,
    sourceA: {
      system: 'Guarantee Portal',
      name: 'Qatar Tech Ventures',
      email: 'contact@qatartech.qa',
      cr: '67890'
    },
    sourceB: {
      system: 'Financing Portal',
      name: 'Qatar Tech Ventures WLL',
      email: 'info@qatartech.qa',
      cr: '67890'
    },
    matchedFields: ['Commercial Registration Number', 'Company Name (fuzzy)'],
    status: 'pending'
  },
  {
    id: 'match-003',
    confidence: 78,
    sourceA: {
      system: 'Financing Portal',
      name: 'Fatima Al-Kuwari',
      email: 'fatima@alkuwari-trading.qa',
      qid: '28412345678'
    },
    sourceB: {
      system: 'Guarantee Portal',
      name: 'Fatima Mohammed Al-Kuwari',
      email: 'fatima.alkuwari@gmail.com',
      qid: '28412345678'
    },
    matchedFields: ['Qatar ID', 'First Name', 'Last Name'],
    status: 'pending'
  },
  {
    id: 'match-004',
    confidence: 72,
    sourceA: {
      system: 'Advisory Portal',
      name: 'Ahmed Al-Thani',
      email: 'ahmed@qatartech.qa',
      qid: '28498765432'
    },
    sourceB: {
      system: 'Financing Portal',
      name: 'Ahmed Abdullah Al Thani',
      email: 'a.althani@qatartech.qa',
      qid: '28498765432'
    },
    matchedFields: ['Qatar ID', 'Last Name', 'Organization Association'],
    status: 'pending'
  },
  {
    id: 'match-005',
    confidence: 68,
    sourceA: {
      system: 'Guarantee Portal',
      name: 'Gulf Trading and Contracting',
      email: 'info@gulftrading.qa',
      cr: '54321'
    },
    sourceB: {
      system: 'Advisory Portal',
      name: 'Gulf Trading & Contracting Co.',
      email: 'contact@gulftrading.com.qa',
      cr: '54321'
    },
    matchedFields: ['Commercial Registration Number', 'Company Name (fuzzy)'],
    status: 'pending'
  },
  {
    id: 'match-006',
    confidence: 92,
    sourceA: {
      system: 'Financing Portal',
      name: 'Maryam Al-Sulaiti',
      email: 'maryam@alsulaiti-enterprises.qa',
      qid: '28456789012'
    },
    sourceB: {
      system: 'Advisory Portal',
      name: 'Maryam Ahmed Al-Sulaiti',
      email: 'maryam@alsulaiti-enterprises.qa',
      qid: '28456789012'
    },
    matchedFields: ['Qatar ID', 'Email Address', 'Full Name (fuzzy)'],
    status: 'approved'
  },
  {
    id: 'match-007',
    confidence: 45,
    sourceA: {
      system: 'Guarantee Portal',
      name: 'Mohammed Al-Mannai',
      email: 'mohammed@techsolutions.qa',
      qid: '28423456789'
    },
    sourceB: {
      system: 'Financing Portal',
      name: 'Mohammed Hassan Al-Manai',
      email: 'mhm@techsolutions.com.qa',
      qid: '28423456780'
    },
    matchedFields: ['First Name', 'Organization Name (fuzzy)'],
    status: 'rejected'
  }
];

// Helper functions
export function getPendingMatches(): MatchReviewItem[] {
  return matchReviewQueue
    .filter(m => m.status === 'pending')
    .sort((a, b) => b.confidence - a.confidence);
}

export function getApprovedMatches(): MatchReviewItem[] {
  return matchReviewQueue.filter(m => m.status === 'approved');
}

export function getRejectedMatches(): MatchReviewItem[] {
  return matchReviewQueue.filter(m => m.status === 'rejected');
}

export function getMatchById(id: string): MatchReviewItem | undefined {
  return matchReviewQueue.find(m => m.id === id);
}

export function approveMatch(id: string): void {
  const match = matchReviewQueue.find(m => m.id === id);
  if (match) {
    match.status = 'approved';
  }
}

export function rejectMatch(id: string): void {
  const match = matchReviewQueue.find(m => m.id === id);
  if (match) {
    match.status = 'rejected';
  }
}

export function getHighConfidenceMatches(threshold: number = 80): MatchReviewItem[] {
  return matchReviewQueue
    .filter(m => m.status === 'pending' && m.confidence >= threshold)
    .sort((a, b) => b.confidence - a.confidence);
}

export function getLowConfidenceMatches(threshold: number = 70): MatchReviewItem[] {
  return matchReviewQueue
    .filter(m => m.status === 'pending' && m.confidence < threshold)
    .sort((a, b) => b.confidence - a.confidence);
}

export function getMatchesBySystem(systemName: string): MatchReviewItem[] {
  return matchReviewQueue.filter(m =>
    m.sourceA.system === systemName || m.sourceB.system === systemName
  );
}

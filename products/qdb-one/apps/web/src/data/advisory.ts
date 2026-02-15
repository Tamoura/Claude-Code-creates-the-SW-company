/**
 * Mock data: Advisory Portal (Programs, Sessions, Assessments)
 * QDB One Unified Portal Prototype
 */

export interface Program {
  id: string;
  orgId: string;
  nameAr: string;
  nameEn: string;
  description: string;
  status: 'enrolled' | 'completed' | 'in_progress';
  progress: number; // 0-100
  milestones: { name: string; completed: boolean; date?: string }[];
}

export interface AdvisorySession {
  id: string;
  programId: string;
  orgId: string;
  topic: string;
  advisorName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  materials?: string[];
}

export interface Assessment {
  id: string;
  orgId: string;
  programId: string;
  type: string;
  date: string;
  overallScore: number;
  categories: { name: string; score: number; maxScore: number }[];
  recommendations: string[];
}

// Mock Programs
export const programs: Program[] = [
  {
    id: 'PRG-001',
    orgId: 'org-001', // Al-Kuwari Trading
    nameAr: 'برنامج تسريع نمو المؤسسات الصغيرة والمتوسطة',
    nameEn: 'SME Growth Accelerator',
    description: 'Comprehensive 12-month program designed to accelerate business growth through financial planning, market expansion, and operational excellence.',
    status: 'in_progress',
    progress: 65,
    milestones: [
      {
        name: 'Initial Assessment',
        completed: true,
        date: '2025-09-15T00:00:00Z'
      },
      {
        name: 'Financial Health Review',
        completed: true,
        date: '2025-10-20T00:00:00Z'
      },
      {
        name: 'Market Analysis',
        completed: true,
        date: '2025-11-30T00:00:00Z'
      },
      {
        name: 'Strategic Planning Workshop',
        completed: true,
        date: '2025-12-18T00:00:00Z'
      },
      {
        name: 'Operational Optimization',
        completed: false
      },
      {
        name: 'Final Evaluation',
        completed: false
      }
    ]
  },
  {
    id: 'PRG-002',
    orgId: 'org-002', // Qatar Tech Ventures
    nameAr: 'برنامج دعم الشركات الناشئة التقنية',
    nameEn: 'Tech Startup Support Program',
    description: '18-month intensive program for technology startups focusing on product development, fundraising, and scaling strategies.',
    status: 'in_progress',
    progress: 42,
    milestones: [
      {
        name: 'Onboarding & Orientation',
        completed: true,
        date: '2024-06-01T00:00:00Z'
      },
      {
        name: 'Product-Market Fit Workshop',
        completed: true,
        date: '2024-08-15T00:00:00Z'
      },
      {
        name: 'Investor Readiness Training',
        completed: false
      },
      {
        name: 'Scaling Strategy Session',
        completed: false
      },
      {
        name: 'Demo Day Preparation',
        completed: false
      }
    ]
  }
];

// Mock Advisory Sessions
export const advisorySessions: AdvisorySession[] = [
  {
    id: 'ADV-SES-001',
    programId: 'PRG-001',
    orgId: 'org-001', // Al-Kuwari Trading
    topic: 'Financial Planning for Expansion',
    advisorName: 'Dr. Hassan Al-Mahmoud',
    date: '2026-03-01',
    time: '10:00 AM',
    status: 'scheduled',
    materials: ['expansion-checklist.pdf', 'financial-modeling-template.xlsx']
  },
  {
    id: 'ADV-SES-002',
    programId: 'PRG-001',
    orgId: 'org-001',
    topic: 'Market Entry Strategy for GCC Region',
    advisorName: 'Ms. Noora Al-Mannai',
    date: '2026-01-15',
    time: '2:00 PM',
    status: 'completed',
    notes: 'Discussed expansion opportunities in UAE and Saudi markets. Focus on establishing distribution partnerships. Next steps: conduct market research and prepare regulatory compliance checklist.',
    materials: ['gcc-market-analysis.pdf', 'export-regulations-guide.pdf']
  },
  {
    id: 'ADV-SES-003',
    programId: 'PRG-002',
    orgId: 'org-002', // Qatar Tech Ventures
    topic: 'Investor Pitch Preparation',
    advisorName: 'Mr. Khalid Al-Sulaiti',
    date: '2026-02-20',
    time: '11:00 AM',
    status: 'scheduled',
    materials: ['pitch-deck-template.pptx']
  },
  {
    id: 'ADV-SES-004',
    programId: 'PRG-002',
    orgId: 'org-002',
    topic: 'Product Development Roadmap Review',
    advisorName: 'Dr. Maryam Al-Thani',
    date: '2025-12-10',
    time: '3:00 PM',
    status: 'completed',
    notes: 'Reviewed Q1 2026 product roadmap. Recommended prioritizing mobile app development and API integrations. Team should focus on core features before expanding functionality.',
    materials: ['product-roadmap-template.pdf', 'agile-framework-guide.pdf']
  }
];

// Mock Assessments
export const assessments: Assessment[] = [
  {
    id: 'ASMT-001',
    orgId: 'org-001', // Al-Kuwari Trading
    programId: 'PRG-001',
    type: 'Business Maturity Assessment',
    date: '2025-12-18T00:00:00Z',
    overallScore: 72,
    categories: [
      { name: 'Financial Management', score: 78, maxScore: 100 },
      { name: 'Operational Efficiency', score: 68, maxScore: 100 },
      { name: 'Market Positioning', score: 75, maxScore: 100 },
      { name: 'Human Resources', score: 70, maxScore: 100 },
      { name: 'Technology Adoption', score: 65, maxScore: 100 },
      { name: 'Risk Management', score: 74, maxScore: 100 }
    ],
    recommendations: [
      'Implement automated inventory management system to improve operational efficiency',
      'Develop comprehensive HR policies and employee development programs',
      'Establish formal risk management framework with quarterly reviews',
      'Explore e-commerce channels to expand market reach',
      'Consider obtaining ISO 9001 certification for quality management'
    ]
  },
  {
    id: 'ASMT-002',
    orgId: 'org-002', // Qatar Tech Ventures
    programId: 'PRG-002',
    type: 'Startup Readiness Assessment',
    date: '2024-08-15T00:00:00Z',
    overallScore: 68,
    categories: [
      { name: 'Product Development', score: 82, maxScore: 100 },
      { name: 'Market Validation', score: 65, maxScore: 100 },
      { name: 'Team Capability', score: 70, maxScore: 100 },
      { name: 'Financial Planning', score: 58, maxScore: 100 },
      { name: 'Growth Strategy', score: 72, maxScore: 100 }
    ],
    recommendations: [
      'Strengthen financial forecasting and cash flow management',
      'Expand customer validation through pilot programs',
      'Build strategic advisory board with industry experts',
      'Develop clearer go-to-market strategy for target segments',
      'Establish key performance indicators (KPIs) for product metrics'
    ]
  }
];

// Helper functions
export function getProgramsByOrg(orgId: string): Program[] {
  return programs.filter(p => p.orgId === orgId);
}

export function getProgramById(id: string): Program | undefined {
  return programs.find(p => p.id === id);
}

export function getSessionsByProgram(programId: string): AdvisorySession[] {
  return advisorySessions.filter(s => s.programId === programId);
}

export function getSessionsByOrg(orgId: string): AdvisorySession[] {
  return advisorySessions.filter(s => s.orgId === orgId);
}

export function getUpcomingSessions(orgId: string): AdvisorySession[] {
  const now = new Date();
  return advisorySessions
    .filter(s => s.orgId === orgId && s.status === 'scheduled')
    .filter(s => new Date(s.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getAssessmentsByOrg(orgId: string): Assessment[] {
  return assessments.filter(a => a.orgId === orgId);
}

export function getAssessmentsByProgram(programId: string): Assessment[] {
  return assessments.filter(a => a.programId === programId);
}

export function getLatestAssessment(orgId: string): Assessment | undefined {
  const orgAssessments = getAssessmentsByOrg(orgId);
  if (orgAssessments.length === 0) return undefined;
  return orgAssessments.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
}

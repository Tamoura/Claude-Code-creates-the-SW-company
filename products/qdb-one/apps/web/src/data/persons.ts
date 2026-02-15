/**
 * Mock data: Persons, Organizations, and Roles
 * QDB One Unified Portal Prototype
 */

export interface Person {
  id: string;
  qid: string;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;
  linkedIdentities: {
    financing?: string;
    guarantee?: string;
    advisory?: string;
  };
}

export interface Organization {
  id: string;
  crNumber: string;
  nameAr: string;
  nameEn: string;
  status: 'active' | 'inactive';
  industry: string;
}

export interface PersonOrgRole {
  personId: string;
  orgId: string;
  portal: 'financing' | 'guarantee' | 'advisory';
  role: 'customer' | 'stakeholder' | 'authorized_signatory';
}

// Mock Persons
export const persons: Person[] = [
  {
    id: 'person-001',
    qid: '28412345678',
    fullNameAr: 'فاطمة الكواري',
    fullNameEn: 'Fatima Al-Kuwari',
    email: 'fatima@alkuwari-trading.qa',
    phone: '+974 4444 5678',
    linkedIdentities: {
      financing: 'FIN-CUST-12345',
      guarantee: 'GRN-AUTH-67890',
      advisory: 'ADV-STK-11111'
    }
  },
  {
    id: 'person-002',
    qid: '28498765432',
    fullNameAr: 'أحمد آل ثاني',
    fullNameEn: 'Ahmed Al-Thani',
    email: 'ahmed@qatartech.qa',
    phone: '+974 4444 9012',
    linkedIdentities: {
      financing: 'FIN-CUST-67891'
    }
  }
];

// Mock Organizations
export const organizations: Organization[] = [
  {
    id: 'org-001',
    crNumber: '12345',
    nameAr: 'الكواري للتجارة ذ.م.م',
    nameEn: 'Al-Kuwari Trading LLC',
    status: 'active',
    industry: 'Import/Export'
  },
  {
    id: 'org-002',
    crNumber: '67890',
    nameAr: 'قطر تك فنتشرز',
    nameEn: 'Qatar Tech Ventures',
    status: 'active',
    industry: 'Technology'
  }
];

// Mock Person-Organization Roles
export const personOrgRoles: PersonOrgRole[] = [
  // Fatima Al-Kuwari at Al-Kuwari Trading
  {
    personId: 'person-001',
    orgId: 'org-001',
    portal: 'financing',
    role: 'customer'
  },
  {
    personId: 'person-001',
    orgId: 'org-001',
    portal: 'advisory',
    role: 'stakeholder'
  },
  // Fatima Al-Kuwari at Qatar Tech Ventures
  {
    personId: 'person-001',
    orgId: 'org-002',
    portal: 'guarantee',
    role: 'authorized_signatory'
  },
  // Ahmed Al-Thani at Qatar Tech Ventures
  {
    personId: 'person-002',
    orgId: 'org-002',
    portal: 'financing',
    role: 'customer'
  }
];

// Helper functions
export function getPersonById(id: string): Person | undefined {
  return persons.find(p => p.id === id);
}

export function getPersonByQid(qid: string): Person | undefined {
  return persons.find(p => p.qid === qid);
}

export function getOrganizationById(id: string): Organization | undefined {
  return organizations.find(o => o.id === id);
}

export function getOrganizationByCr(cr: string): Organization | undefined {
  return organizations.find(o => o.crNumber === cr);
}

export function getPersonOrganizations(personId: string): Organization[] {
  const roles = personOrgRoles.filter(r => r.personId === personId);
  const orgIds = [...new Set(roles.map(r => r.orgId))];
  return orgIds
    .map(id => organizations.find(o => o.id === id))
    .filter((o): o is Organization => o !== undefined);
}

export function getPersonRoles(personId: string, orgId: string): PersonOrgRole[] {
  return personOrgRoles.filter(r => r.personId === personId && r.orgId === orgId);
}

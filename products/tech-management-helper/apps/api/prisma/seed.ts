import { PrismaClient, FrameworkType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default organization
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      settings: {},
    },
  });

  console.log('Created organization:', defaultOrg.name);

  // Seed NIST CSF 2.0 Framework
  const nistCsf = await prisma.framework.upsert({
    where: {
      type_version: {
        type: FrameworkType.NIST_CSF,
        version: '2.0',
      },
    },
    update: {},
    create: {
      name: 'NIST Cybersecurity Framework',
      version: '2.0',
      type: FrameworkType.NIST_CSF,
      description:
        'The NIST Cybersecurity Framework provides a policy framework of computer security guidance for organizations.',
      publishedDate: new Date('2024-02-26'),
      data: {
        functions: [
          {
            id: 'GV',
            name: 'Govern',
            categories: [
              { id: 'GV.OC', name: 'Organizational Context' },
              { id: 'GV.RM', name: 'Risk Management Strategy' },
              { id: 'GV.RR', name: 'Roles, Responsibilities, and Authorities' },
              { id: 'GV.PO', name: 'Policy' },
              { id: 'GV.OV', name: 'Oversight' },
              { id: 'GV.SC', name: 'Cybersecurity Supply Chain Risk Management' },
            ],
          },
          {
            id: 'ID',
            name: 'Identify',
            categories: [
              { id: 'ID.AM', name: 'Asset Management' },
              { id: 'ID.RA', name: 'Risk Assessment' },
              { id: 'ID.IM', name: 'Improvement' },
            ],
          },
          {
            id: 'PR',
            name: 'Protect',
            categories: [
              { id: 'PR.AA', name: 'Identity Management, Authentication, and Access Control' },
              { id: 'PR.AT', name: 'Awareness and Training' },
              { id: 'PR.DS', name: 'Data Security' },
              { id: 'PR.PS', name: 'Platform Security' },
              { id: 'PR.IR', name: 'Technology Infrastructure Resilience' },
            ],
          },
          {
            id: 'DE',
            name: 'Detect',
            categories: [
              { id: 'DE.CM', name: 'Continuous Monitoring' },
              { id: 'DE.AE', name: 'Adverse Event Analysis' },
            ],
          },
          {
            id: 'RS',
            name: 'Respond',
            categories: [
              { id: 'RS.MA', name: 'Incident Management' },
              { id: 'RS.AN', name: 'Incident Analysis' },
              { id: 'RS.CO', name: 'Incident Response Reporting and Communication' },
              { id: 'RS.MI', name: 'Incident Mitigation' },
            ],
          },
          {
            id: 'RC',
            name: 'Recover',
            categories: [
              { id: 'RC.RP', name: 'Incident Recovery Plan Execution' },
              { id: 'RC.CO', name: 'Incident Recovery Communication' },
            ],
          },
        ],
      },
    },
  });

  console.log('Created framework:', nistCsf.name);

  // Seed ISO 27001:2022 Framework
  const iso27001 = await prisma.framework.upsert({
    where: {
      type_version: {
        type: FrameworkType.ISO_27001,
        version: '2022',
      },
    },
    update: {},
    create: {
      name: 'ISO/IEC 27001',
      version: '2022',
      type: FrameworkType.ISO_27001,
      description:
        'ISO/IEC 27001 specifies requirements for establishing, implementing, maintaining and continually improving an information security management system.',
      publishedDate: new Date('2022-10-25'),
      data: {
        clauses: [
          {
            id: 'A.5',
            name: 'Organizational controls',
            controls: [
              { id: 'A.5.1', name: 'Policies for information security' },
              { id: 'A.5.2', name: 'Information security roles and responsibilities' },
              { id: 'A.5.3', name: 'Segregation of duties' },
            ],
          },
          {
            id: 'A.6',
            name: 'People controls',
            controls: [
              { id: 'A.6.1', name: 'Screening' },
              { id: 'A.6.2', name: 'Terms and conditions of employment' },
              { id: 'A.6.3', name: 'Information security awareness, education and training' },
            ],
          },
          {
            id: 'A.7',
            name: 'Physical controls',
            controls: [
              { id: 'A.7.1', name: 'Physical security perimeters' },
              { id: 'A.7.2', name: 'Physical entry' },
              { id: 'A.7.3', name: 'Securing offices, rooms and facilities' },
            ],
          },
          {
            id: 'A.8',
            name: 'Technological controls',
            controls: [
              { id: 'A.8.1', name: 'User endpoint devices' },
              { id: 'A.8.2', name: 'Privileged access rights' },
              { id: 'A.8.3', name: 'Information access restriction' },
            ],
          },
        ],
      },
    },
  });

  console.log('Created framework:', iso27001.name);

  // Seed COBIT 2019 Framework
  const cobit = await prisma.framework.upsert({
    where: {
      type_version: {
        type: FrameworkType.COBIT,
        version: '2019',
      },
    },
    update: {},
    create: {
      name: 'COBIT',
      version: '2019',
      type: FrameworkType.COBIT,
      description:
        'COBIT is a framework for the governance and management of enterprise information and technology.',
      publishedDate: new Date('2019-11-01'),
      data: {
        domains: [
          {
            id: 'EDM',
            name: 'Evaluate, Direct and Monitor',
            objectives: [
              { id: 'EDM01', name: 'Ensured Governance Framework Setting and Maintenance' },
              { id: 'EDM02', name: 'Ensured Benefits Delivery' },
              { id: 'EDM03', name: 'Ensured Risk Optimization' },
            ],
          },
          {
            id: 'APO',
            name: 'Align, Plan and Organize',
            objectives: [
              { id: 'APO01', name: 'Managed I&T Management Framework' },
              { id: 'APO02', name: 'Managed Strategy' },
              { id: 'APO03', name: 'Managed Enterprise Architecture' },
            ],
          },
          {
            id: 'BAI',
            name: 'Build, Acquire and Implement',
            objectives: [
              { id: 'BAI01', name: 'Managed Programs' },
              { id: 'BAI02', name: 'Managed Requirements Definition' },
              { id: 'BAI03', name: 'Managed Solutions Identification and Build' },
            ],
          },
          {
            id: 'DSS',
            name: 'Deliver, Service and Support',
            objectives: [
              { id: 'DSS01', name: 'Managed Operations' },
              { id: 'DSS02', name: 'Managed Service Requests and Incidents' },
              { id: 'DSS03', name: 'Managed Problems' },
            ],
          },
          {
            id: 'MEA',
            name: 'Monitor, Evaluate and Assess',
            objectives: [
              { id: 'MEA01', name: 'Managed Performance and Conformance Monitoring' },
              { id: 'MEA02', name: 'Managed System of Internal Control' },
              { id: 'MEA03', name: 'Managed Compliance with External Requirements' },
            ],
          },
        ],
      },
    },
  });

  console.log('Created framework:', cobit.name);

  // Seed IT4IT 2.1 Framework
  const it4it = await prisma.framework.upsert({
    where: {
      type_version: {
        type: FrameworkType.IT4IT,
        version: '2.1',
      },
    },
    update: {},
    create: {
      name: 'IT4IT Reference Architecture',
      version: '2.1',
      type: FrameworkType.IT4IT,
      description:
        'IT4IT is a reference architecture standard for managing the business of IT.',
      publishedDate: new Date('2017-04-01'),
      data: {
        valueStreams: [
          {
            id: 'S2P',
            name: 'Strategy to Portfolio',
            description: 'Receives strategy inputs and provides a conceptual service and portfolio.',
            functionalComponents: [
              { id: 'S2P.FC1', name: 'Strategy' },
              { id: 'S2P.FC2', name: 'Portfolio Demand' },
              { id: 'S2P.FC3', name: 'Portfolio Backlog' },
            ],
          },
          {
            id: 'R2D',
            name: 'Requirement to Deploy',
            description: 'Creates and delivers new or enhanced services.',
            functionalComponents: [
              { id: 'R2D.FC1', name: 'Project' },
              { id: 'R2D.FC2', name: 'Requirement' },
              { id: 'R2D.FC3', name: 'Service Design' },
              { id: 'R2D.FC4', name: 'Build' },
              { id: 'R2D.FC5', name: 'Release' },
            ],
          },
          {
            id: 'R2F',
            name: 'Request to Fulfill',
            description: 'Handles service requests from consumers.',
            functionalComponents: [
              { id: 'R2F.FC1', name: 'Offer Consumption' },
              { id: 'R2F.FC2', name: 'Offer Management' },
              { id: 'R2F.FC3', name: 'Request' },
              { id: 'R2F.FC4', name: 'Fulfill' },
            ],
          },
          {
            id: 'D2C',
            name: 'Detect to Correct',
            description: 'Monitors and maintains services.',
            functionalComponents: [
              { id: 'D2C.FC1', name: 'Event' },
              { id: 'D2C.FC2', name: 'Incident' },
              { id: 'D2C.FC3', name: 'Problem' },
              { id: 'D2C.FC4', name: 'Change Control' },
            ],
          },
        ],
      },
    },
  });

  console.log('Created framework:', it4it.name);

  console.log('Seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

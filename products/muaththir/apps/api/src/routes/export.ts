import { FastifyPluginAsync } from 'fastify';
import { BadRequestError } from '../lib/errors';

const VALID_FORMATS = ['json', 'csv'] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

function formatDate(): string {
  return new Date().toISOString().split('T')[0];
}

function escapeCsvField(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface ChildWithRelations {
  name: string;
  dateOfBirth: Date;
  gender: string | null;
  observations: Array<{
    dimension: string;
    content: string;
    sentiment: string;
    observedAt: Date;
    tags: string[];
  }>;
  milestones: Array<{
    achieved: boolean;
    milestone: {
      title: string;
      dimension: string;
    };
  }>;
  goals: Array<{
    title: string;
    dimension: string;
    status: string;
    targetDate: Date | null;
  }>;
}

function buildJsonExport(
  parent: { name: string; email: string; subscriptionTier: string },
  children: ChildWithRelations[]
) {
  return {
    exportedAt: new Date().toISOString(),
    profile: {
      name: parent.name,
      email: parent.email,
      subscriptionTier: parent.subscriptionTier,
    },
    children: children.map((child) => {
      return {
        name: child.name,
        dateOfBirth: child.dateOfBirth.toISOString().split('T')[0],
        gender: child.gender,
        observations: child.observations.map((obs) => {
          return {
            dimension: obs.dimension,
            content: obs.content,
            sentiment: obs.sentiment,
            observedAt: obs.observedAt
              ? obs.observedAt.toISOString().split('T')[0]
              : null,
            tags: obs.tags,
          };
        }),
        milestones: child.milestones.map((cm) => {
          return {
            achieved: cm.achieved,
            milestoneTitle: cm.milestone.title,
            dimension: cm.milestone.dimension,
          };
        }),
        goals: child.goals.map((goal) => {
          return {
            title: goal.title,
            dimension: goal.dimension,
            status: goal.status,
            targetDate: goal.targetDate
              ? goal.targetDate.toISOString().split('T')[0]
              : null,
          };
        }),
      };
    }),
  };
}

function buildCsvExport(children: ChildWithRelations[]): string {
  const header =
    'child_name,dimension,content,sentiment,observed_at,tags';
  const rows: string[] = [header];

  for (const child of children) {
    for (const obs of child.observations) {
      const observedAt = obs.observedAt
        ? obs.observedAt.toISOString().split('T')[0]
        : '';
      const tags = (obs.tags || []).join(';');
      const row = [
        escapeCsvField(child.name),
        escapeCsvField(obs.dimension),
        escapeCsvField(obs.content),
        escapeCsvField(obs.sentiment),
        escapeCsvField(observedAt),
        escapeCsvField(tags),
      ].join(',');
      rows.push(row);
    }
  }

  return rows.join('\n');
}

const exportRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/export - Export all parent data
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
      },
    },
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const query = request.query as { format?: string };
    const format = (query.format || 'json') as string;

    if (!VALID_FORMATS.includes(format as ExportFormat)) {
      throw new BadRequestError(
        `Invalid format "${format}". Supported: json, csv`
      );
    }

    // Fetch all children with related data
    const children = await fastify.prisma.child.findMany({
      where: { parentId: parent.id },
      include: {
        observations: {
          where: { deletedAt: null },
          orderBy: { observedAt: 'desc' },
        },
        milestones: {
          include: {
            milestone: true,
          },
        },
        goals: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const dateStr = formatDate();

    if (format === 'csv') {
      const csvContent = buildCsvExport(
        children as unknown as ChildWithRelations[]
      );

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="muaththir-export-${dateStr}.csv"`
        )
        .send(csvContent);
    }

    // JSON format
    const exportData = buildJsonExport(
      parent,
      children as unknown as ChildWithRelations[]
    );

    return reply
      .header('Content-Type', 'application/json; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="muaththir-export-${dateStr}.json"`
      )
      .send(exportData);
  });
};

export default exportRoutes;

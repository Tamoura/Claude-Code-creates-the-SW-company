import { FastifyRequest, FastifyReply } from 'fastify';
import { RepoService } from './service.js';
import {
  connectRepoSchema,
  repoIdParamSchema,
  listReposQuerySchema,
} from './schemas.js';
import { BadRequestError } from '../../lib/errors.js';

export class RepoHandlers {
  constructor(private service: RepoService) {}

  async listRepos(request: FastifyRequest, reply: FastifyReply) {
    const query = listReposQuerySchema.parse(request.query);
    const teamId = (request.query as any).teamId as string;

    if (!teamId) {
      throw new BadRequestError('teamId query parameter is required');
    }

    const result = await this.service.listRepos({
      teamId,
      page: query.page,
      limit: query.limit,
      syncStatus: query.syncStatus as any,
    });

    return reply.code(200).send(result);
  }

  async connectRepo(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as any;
    const teamId = body.teamId as string;

    if (!teamId) {
      throw new BadRequestError('teamId is required');
    }

    const parsed = connectRepoSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(422).send({
        type: 'https://pulse.dev/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Request validation failed',
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await this.service.connectRepo(teamId, parsed.data);
    return reply.code(201).send(result);
  }

  async disconnectRepo(request: FastifyRequest, reply: FastifyReply) {
    const params = repoIdParamSchema.parse(request.params);
    // Get teamId from user's team memberships
    const user = request.currentUser!;
    const teamMember = await (request.server as any).prisma.teamMember.findFirst({
      where: { userId: user.id },
    });

    if (!teamMember) {
      throw new BadRequestError('User is not a member of any team');
    }

    const result = await this.service.disconnectRepo(
      params.id,
      teamMember.teamId
    );
    return reply.code(200).send(result);
  }

  async getSyncStatus(request: FastifyRequest, reply: FastifyReply) {
    const params = repoIdParamSchema.parse(request.params);
    const user = request.currentUser!;
    const teamMember = await (request.server as any).prisma.teamMember.findFirst({
      where: { userId: user.id },
    });

    if (!teamMember) {
      throw new BadRequestError('User is not a member of any team');
    }

    const result = await this.service.getSyncStatus(
      params.id,
      teamMember.teamId
    );
    return reply.code(200).send(result);
  }
}

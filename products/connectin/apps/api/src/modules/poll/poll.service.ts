import { PrismaClient } from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../lib/errors';

export interface CreatePollInput {
  question: string;
  options: string[];
  durationDays: number;
}

export class PollService {
  constructor(private readonly prisma: PrismaClient) {}

  async createPoll(postId: string, input: CreatePollInput) {
    if (input.options.length < 2) {
      throw new ValidationError('Poll must have at least 2 options');
    }
    if (input.options.length > 4) {
      throw new ValidationError('Poll must have at most 4 options');
    }

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + input.durationDays);

    const poll = await this.prisma.poll.create({
      data: {
        postId,
        question: input.question,
        endsAt,
        options: {
          create: input.options.map((text, i) => ({
            text,
            sortOrder: i,
          })),
        },
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return {
      id: poll.id,
      question: poll.question,
      endsAt: poll.endsAt,
      totalVotes: poll.totalVotes,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: o.voteCount,
      })),
    };
  }

  async vote(pollId: string, optionId: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) {
      throw new NotFoundError('Poll not found');
    }

    if (new Date() > poll.endsAt) {
      throw new ValidationError('Poll has ended');
    }

    const validOption = poll.options.find((o) => o.id === optionId);
    if (!validOption) {
      throw new NotFoundError('Poll option not found');
    }

    // Check if already voted
    const existing = await this.prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    if (existing) {
      throw new ConflictError('Already voted on this poll');
    }

    // Create vote and increment counts in a transaction
    const [vote] = await this.prisma.$transaction([
      this.prisma.pollVote.create({
        data: { pollId, optionId, userId },
      }),
      this.prisma.pollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      }),
      this.prisma.poll.update({
        where: { id: pollId },
        data: { totalVotes: { increment: 1 } },
      }),
    ]);

    return {
      id: vote.id,
      pollId: vote.pollId,
      optionId: vote.optionId,
    };
  }

  async getPollResults(pollId: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!poll) {
      throw new NotFoundError('Poll not found');
    }

    // Check if user has voted
    const userVote = await this.prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });

    return {
      id: poll.id,
      question: poll.question,
      endsAt: poll.endsAt,
      totalVotes: poll.totalVotes,
      isEnded: new Date() > poll.endsAt,
      userVote: userVote?.optionId ?? null,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: o.voteCount,
        percentage: poll.totalVotes > 0
          ? Math.round((o.voteCount / poll.totalVotes) * 100)
          : 0,
      })),
    };
  }
}

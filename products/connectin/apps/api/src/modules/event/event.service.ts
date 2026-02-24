import {
  PrismaClient,
  EventType,
  EventStatus,
} from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

export class EventService {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Create Event ───────────────────────────────────────────

  async createEvent(
    userId: string,
    input: {
      title: string;
      description?: string;
      type: string;
      location?: string;
      startsAt: string;
      endsAt?: string;
    }
  ) {
    const event = await this.prisma.event.create({
      data: {
        creatorId: userId,
        title: input.title,
        description: input.description ?? null,
        type: input.type as EventType,
        location: input.location ?? null,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        status: EventStatus.UPCOMING,
      },
    });

    return event;
  }

  // ─── List Events ────────────────────────────────────────────

  async listEvents() {
    const events = await this.prisma.event.findMany({
      include: {
        _count: { select: { attendees: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    return events;
  }

  // ─── Get Event ──────────────────────────────────────────────

  async getEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { attendees: true } },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return {
      ...event,
      attendeeCount: event._count.attendees,
    };
  }

  // ─── Register for Event ─────────────────────────────────────

  async registerForEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const attendee = await this.prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: {},
      create: { eventId, userId },
    });

    return attendee;
  }

  // ─── Unregister from Event ──────────────────────────────────

  async unregisterFromEvent(eventId: string, userId: string) {
    await this.prisma.eventAttendee.deleteMany({
      where: { eventId, userId },
    });
  }

  // ─── List Attendees ─────────────────────────────────────────

  async listAttendees(
    eventId: string,
    limit: number,
    offset: number
  ) {
    const attendees = await this.prisma.eventAttendee.findMany({
      where: { eventId },
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { registeredAt: 'asc' },
    });

    return attendees.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      userId: a.userId,
      registeredAt: a.registeredAt,
      user: {
        id: a.user.id,
        displayName: a.user.displayName,
      },
    }));
  }

  // ─── Update Event ───────────────────────────────────────────

  async updateEvent(
    eventId: string,
    userId: string,
    input: {
      status?: string;
      title?: string;
      description?: string;
      location?: string;
    }
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.creatorId !== userId) {
      throw new ForbiddenError(
        'Only the event creator can update this event'
      );
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.location !== undefined && {
          location: input.location,
        }),
        ...(input.status !== undefined && {
          status: input.status as EventStatus,
        }),
      },
    });

    return updated;
  }
}

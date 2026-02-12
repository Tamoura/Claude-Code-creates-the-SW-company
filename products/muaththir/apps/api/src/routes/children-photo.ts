import { FastifyPluginAsync } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import { BadRequestError } from '../lib/errors';
import { verifyChildOwnership } from '../lib/ownership';
import { getAgeBand } from '../utils/age-band';
import { Child } from '@prisma/client';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function childToResponse(child: Child) {
  const ageBand = getAgeBand(child.dateOfBirth);
  return {
    id: child.id,
    name: child.name,
    dateOfBirth: child.dateOfBirth.toISOString().split('T')[0],
    gender: child.gender,
    ageBand,
    photoUrl: child.photoUrl,
    medicalNotes: child.medicalNotes,
    allergies: child.allergies,
    specialNeeds: child.specialNeeds,
    createdAt: child.createdAt.toISOString(),
    updatedAt: child.updatedAt.toISOString(),
  };
}

const childPhotoRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/children/:childId/photo — Upload child photo
  fastify.post('/:childId/photo', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (request as any).file();

    if (!data) {
      throw new BadRequestError('No file uploaded. Send a "photo" field with multipart/form-data.');
    }

    if (data.fieldname !== 'photo') {
      throw new BadRequestError('File must be uploaded under the "photo" field name');
    }

    const mimetype = data.mimetype;
    if (!ALLOWED_MIMETYPES.includes(mimetype)) {
      throw new BadRequestError(
        `Invalid file type "${mimetype}". Allowed: jpeg, png, webp`
      );
    }

    const ext = EXTENSION_MAP[mimetype];
    const timestamp = Date.now();
    const filename = `${childId}-${timestamp}.${ext}`;

    // Ensure uploads directory exists
    const photosDir = path.resolve(process.cwd(), 'uploads', 'photos');
    await fs.mkdir(photosDir, { recursive: true });

    // Read file content into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Verify file size (in case stream exceeds limit)
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestError('File size exceeds 5MB limit');
    }

    // Check if the stream was truncated by the multipart limit
    if (data.file.truncated) {
      throw new BadRequestError('File size exceeds 5MB limit');
    }

    const filePath = path.join(photosDir, filename);
    await fs.writeFile(filePath, buffer);

    const photoUrl = `/uploads/photos/${filename}`;

    const updated = await fastify.prisma.child.update({
      where: { id: childId },
      data: { photoUrl },
    });

    return reply.code(200).send(childToResponse(updated));
  });
};

export default childPhotoRoutes;

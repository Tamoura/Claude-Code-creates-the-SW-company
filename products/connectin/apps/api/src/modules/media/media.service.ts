import { PrismaClient, MediaType, MediaStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { StorageAdapter } from '../../lib/storage';
import { randomUUID } from 'crypto';
import path from 'path';

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_BANNER_SIZE = 10 * 1024 * 1024; // 10 MB
const BANNER_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export class MediaService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageAdapter
  ) {}

  async uploadMedia(
    uploaderId: string,
    file: {
      filename: string;
      mimetype: string;
      data: Buffer;
    },
    type: MediaType,
    altText?: string
  ) {
    this.validateFile(file, type);

    const ext = path.extname(file.filename) || this.getExtension(file.mimetype);
    const key = `${type.toLowerCase()}s/${randomUUID()}${ext}`;

    const url = await this.storage.upload(key, file.data, file.mimetype);

    const media = await this.prisma.media.create({
      data: {
        uploaderId,
        type,
        status: MediaStatus.READY,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: file.data.length,
        url,
        altText: altText || null,
      },
    });

    return {
      id: media.id,
      type: media.type,
      status: media.status,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      width: media.width,
      height: media.height,
      altText: media.altText,
      createdAt: media.createdAt,
    };
  }

  async getMedia(mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundError('Media not found');
    }

    return {
      id: media.id,
      uploaderId: media.uploaderId,
      type: media.type,
      status: media.status,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      width: media.width,
      height: media.height,
      altText: media.altText,
      createdAt: media.createdAt,
    };
  }

  async deleteMedia(mediaId: string, userId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.uploaderId !== userId) {
      throw new NotFoundError('Media not found');
    }

    // Extract storage key from URL
    const urlParts = media.url.split('/uploads/');
    if (urlParts.length > 1) {
      await this.storage.delete(urlParts[1]);
    }

    await this.prisma.media.delete({
      where: { id: mediaId },
    });

    return { deleted: true };
  }

  async uploadBanner(
    userId: string,
    file: {
      filename: string;
      mimetype: string;
      data: Buffer;
    }
  ) {
    if (!BANNER_MIMES.includes(file.mimetype)) {
      throw new ValidationError('Banner must be JPEG, PNG, or WebP');
    }

    if (file.data.length > MAX_BANNER_SIZE) {
      throw new ValidationError('Banner must be under 10MB');
    }

    const ext = path.extname(file.filename) || this.getExtension(file.mimetype);
    const key = `banners/${userId}${ext}`;

    const url = await this.storage.upload(key, file.data, file.mimetype);

    await this.prisma.profile.update({
      where: { userId },
      data: { bannerUrl: url },
    });

    return { bannerUrl: url };
  }

  async removeBanner(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { bannerUrl: true },
    });

    if (profile?.bannerUrl) {
      const urlParts = profile.bannerUrl.split('/uploads/');
      if (urlParts.length > 1) {
        await this.storage.delete(urlParts[1]);
      }
    }

    await this.prisma.profile.update({
      where: { userId },
      data: { bannerUrl: null },
    });

    return { bannerUrl: null };
  }

  async attachMediaToPost(
    postId: string,
    mediaIds: string[],
    userId: string
  ) {
    if (mediaIds.length > 4) {
      throw new ValidationError('Maximum 4 media attachments per post');
    }

    // Verify all media belong to the user and exist
    const mediaRecords = await this.prisma.media.findMany({
      where: {
        id: { in: mediaIds },
        uploaderId: userId,
      },
    });

    if (mediaRecords.length !== mediaIds.length) {
      throw new ValidationError(
        'One or more media items not found or not owned by you'
      );
    }

    // Create PostMedia records
    const postMediaData = mediaIds.map((mediaId, index) => ({
      postId,
      mediaId,
      sortOrder: index,
    }));

    await this.prisma.postMedia.createMany({
      data: postMediaData,
      skipDuplicates: true,
    });
  }

  async getPostMedia(postId: string) {
    const postMedia = await this.prisma.postMedia.findMany({
      where: { postId },
      orderBy: { sortOrder: 'asc' },
      include: {
        media: {
          select: {
            id: true,
            type: true,
            url: true,
            thumbnailUrl: true,
            mimeType: true,
            width: true,
            height: true,
            altText: true,
          },
        },
      },
    });

    return postMedia.map((pm) => pm.media);
  }

  private validateFile(
    file: { filename: string; mimetype: string; data: Buffer },
    type: MediaType
  ) {
    let allowedMimes: string[];
    let maxSize: number;

    switch (type) {
      case MediaType.IMAGE:
        allowedMimes = ALLOWED_IMAGE_MIMES;
        maxSize = MAX_IMAGE_SIZE;
        break;
      case MediaType.VIDEO:
        allowedMimes = ALLOWED_VIDEO_MIMES;
        maxSize = MAX_VIDEO_SIZE;
        break;
      case MediaType.DOCUMENT:
        allowedMimes = ALLOWED_DOCUMENT_MIMES;
        maxSize = MAX_DOCUMENT_SIZE;
        break;
      default:
        throw new ValidationError('Invalid media type');
    }

    if (!allowedMimes.includes(file.mimetype)) {
      throw new ValidationError(
        `Unsupported file format for ${type}. Allowed: ${allowedMimes.join(', ')}`
      );
    }

    if (file.data.length > maxSize) {
      throw new ValidationError(
        `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
      );
    }
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/webm': '.webm',
      'application/pdf': '.pdf',
    };
    return map[mimeType] || '';
  }
}

# Sprint 4: Media Uploads (Cover/Banner + Image/Video)

## Features
1. **Cover/Banner Image Upload** (S effort) — profile banner upload
2. **Image/Video Uploads** (L effort) — media attachments on posts

## Architecture Decisions
- **Storage adapter pattern**: `StorageAdapter` interface with `LocalStorageAdapter` (dev/test) and future `R2StorageAdapter` (production)
- Local adapter saves to `uploads/` directory (gitignored)
- Media model tracks all uploads with status: PROCESSING → READY / FAILED
- PostMedia junction table links media to posts (up to 4 images or 1 video per post)
- Banner uploads go directly to profile (no PostMedia needed)

## Schema Changes
- `MediaType` enum: IMAGE, VIDEO, DOCUMENT
- `MediaStatus` enum: PROCESSING, READY, FAILED
- `Media` model: id, uploaderId, type, status, originalName, mimeType, size, url, thumbnailUrl, width, height, altText, createdAt, updatedAt
- `PostMedia` model: id, postId, mediaId, sortOrder, createdAt
- `bannerUrl` already exists on Profile

## API Endpoints
- POST `/api/v1/media/upload` — upload media file (multipart/form-data)
- GET `/api/v1/media/:id` — get media metadata
- DELETE `/api/v1/media/:id` — delete own media
- PUT `/api/v1/profiles/me/banner` — upload banner image
- DELETE `/api/v1/profiles/me/banner` — remove banner image

## Size Limits (from Architecture Plan)
| Type | Max Size | Formats |
|------|----------|---------|
| Avatar | 5 MB | JPEG, PNG, WebP |
| Banner | 10 MB | JPEG, PNG, WebP |
| Post Image | 10 MB | JPEG, PNG, WebP, GIF |
| Video | 200 MB | MP4, MOV, WebM |
| Document | 25 MB | PDF, DOCX, PPTX |

## Test Plan
- media.test.ts: upload image, upload validation, get metadata, delete, 401 unauth
- banner.test.ts: upload banner, get banner in profile, delete banner
- post-media.test.ts: create post with media, multiple images, feed returns media

## Status
- [x] Feature notes created
- [ ] Schema changes
- [ ] Tests written (RED)
- [ ] Implementation (GREEN)
- [ ] Commit & PR

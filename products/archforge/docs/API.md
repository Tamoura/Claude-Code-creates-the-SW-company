# ArchForge API Reference

**Version**: 1.0
**Base URL**: `http://localhost:5012/api/v1` (development)
**Date**: February 25, 2026

---

## Overview

The ArchForge API is a RESTful JSON API built with Fastify 4 on Node.js 20.
All requests and responses use `Content-Type: application/json`.

### Authentication

The API uses two-token authentication:

- **Access token**: Short-lived JWT (15 minutes), sent in `Authorization: Bearer <token>` header
- **Refresh token**: Long-lived token (7 days), stored in an `httpOnly` Secure `SameSite=Strict` cookie

```mermaid
sequenceDiagram
    participant Client
    participant API

    Client->>API: POST /auth/login { email, password }
    API-->>Client: 200 { accessToken, expiresAt, user }<br/>Set-Cookie: refreshToken=<token>; HttpOnly; Secure

    Note over Client: Access token expires after 15 minutes

    Client->>API: POST /auth/refresh<br/>Cookie: refreshToken=<token>
    API-->>Client: 200 { accessToken, expiresAt }<br/>Set-Cookie: refreshToken=<new-token> (rotated)

    Client->>API: Any authenticated endpoint<br/>Authorization: Bearer <accessToken>
    API-->>Client: 200 { data }
```

### Error Format

All error responses use RFC 7807 Problem Details:

```json
{
  "type": "https://archforge.io/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Artifact with id 'xyz' not found",
  "request_id": "req_abc123"
}
```

**Common error codes:**

| Status | Type | Meaning |
|--------|------|---------|
| 400 | `validation-error` | Request body or query failed Zod validation |
| 401 | `unauthorized` | Missing or invalid access token |
| 403 | `forbidden` | User does not have permission for this resource |
| 404 | `not-found` | Resource not found |
| 409 | `conflict` | Resource already exists (e.g., duplicate email) |
| 429 | `too-many-requests` | Rate limit exceeded |
| 500 | `internal-error` | Unexpected server error |

### Rate Limiting

- Default: 100 requests per 60 seconds per user (authenticated) or per IP (anonymous)
- Headers returned: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`
- Health and ready endpoints are exempt

---

## Health

### GET /health

Check service and dependency health.

**Auth required**: No (full details require `x-internal-api-key` header)

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-25T12:00:00.000Z"
}
```

**Response 200 (with internal key):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-25T12:00:00.000Z",
  "checks": {
    "database": { "status": "healthy", "latency": 3 },
    "redis": { "status": "healthy", "latency": 1 }
  }
}
```

**Response 503** when database is unreachable.

---

## Auth Module

Base path: `/api/v1/auth`

### POST /auth/register

Create a new user account.

**Auth required**: No

**Request:**
```json
{
  "email": "architect@company.com",
  "password": "SecurePass123!@#",
  "fullName": "Jane Architect"
}
```

**Constraints:**
- `email`: valid email format, max 255 chars
- `password`: min 8 chars, must include uppercase, lowercase, digit, and special character
- `fullName`: min 2 chars, max 255 chars

**Response 201:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-02-25T12:15:00.000Z",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "architect@company.com",
    "fullName": "Jane Architect",
    "role": "member"
  }
}
```

**Response 409**: Email already registered.

---

### POST /auth/login

Authenticate and receive tokens.

**Auth required**: No

**Request:**
```json
{
  "email": "architect@company.com",
  "password": "SecurePass123!@#"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-02-25T12:15:00.000Z",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "architect@company.com",
    "fullName": "Jane Architect",
    "role": "member",
    "status": "active"
  }
}
```

Sets httpOnly cookie `refreshToken` with 7-day expiry.

**Response 401**: Invalid credentials.

---

### POST /auth/refresh

Exchange a refresh token for a new access token. The refresh token is
rotated (old one is revoked, new one is issued).

**Auth required**: `refreshToken` cookie

**Request body**: Empty (`{}`)

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-02-25T12:30:00.000Z"
}
```

Sets a new `refreshToken` cookie.

**Response 401**: Missing or expired refresh token.

---

### POST /auth/logout

Revoke the current session.

**Auth required**: Bearer token

**Request body**: Empty (`{}`)

**Response 200:**
```json
{ "message": "Logged out successfully" }
```

Clears the `refreshToken` cookie.

---

### GET /auth/me

Get the authenticated user's profile.

**Auth required**: Bearer token

**Response 200:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "architect@company.com",
  "fullName": "Jane Architect",
  "role": "member",
  "status": "active",
  "emailVerified": true,
  "createdAt": "2026-01-15T09:00:00.000Z"
}
```

---

### POST /auth/forgot-password

Initiate password reset flow. Sends a reset link to the email address.
Always returns 200 to prevent email enumeration.

**Auth required**: No

**Request:**
```json
{ "email": "architect@company.com" }
```

**Response 200:**
```json
{
  "message": "If an account exists with that email, a reset link has been sent."
}
```

---

### POST /auth/reset-password

Complete password reset using the token from the reset email.

**Auth required**: No

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass456!@#"
}
```

**Response 200:**
```json
{ "message": "Password reset successfully." }
```

**Response 400**: Token invalid or expired.

---

### GET /auth/verify-email/:token

Verify email address using the token from the verification email.

**Auth required**: No

**Response 200:**
```json
{ "message": "Email verified successfully." }
```

---

## Projects Module

Base path: `/api/v1/projects`
All endpoints require Bearer token authentication.

### GET /projects

List all projects the user has access to.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (max 100) |
| `search` | string | — | Search by project name |
| `status` | string | `active` | Filter: `active`, `archived` |

**Response 200:**
```json
{
  "data": [
    {
      "id": "proj-uuid",
      "name": "Digital Transformation 2026",
      "description": "Cloud migration architecture",
      "framework": "c4",
      "status": "active",
      "artifactCount": 5,
      "memberCount": 3,
      "createdAt": "2026-02-01T10:00:00.000Z",
      "updatedAt": "2026-02-20T14:30:00.000Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### POST /projects

Create a new project.

**Request:**
```json
{
  "name": "Digital Transformation 2026",
  "description": "Cloud migration architecture for EMEA region",
  "framework": "c4"
}
```

**Constraints:**
- `name`: required, min 2 chars, max 255 chars
- `description`: optional, max 2000 chars
- `framework`: optional, one of `archimate`, `c4`, `togaf`, `auto` (default: `auto`)

**Response 201:**
```json
{
  "id": "proj-uuid",
  "name": "Digital Transformation 2026",
  "description": "Cloud migration architecture for EMEA region",
  "framework": "c4",
  "status": "active",
  "createdAt": "2026-02-25T12:00:00.000Z"
}
```

---

### GET /projects/:projectId

Get project details.

**Response 200:**
```json
{
  "id": "proj-uuid",
  "name": "Digital Transformation 2026",
  "description": "Cloud migration architecture",
  "framework": "c4",
  "status": "active",
  "settings": {},
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-20T14:30:00.000Z",
  "createdBy": {
    "id": "user-uuid",
    "fullName": "Jane Architect",
    "email": "architect@company.com"
  }
}
```

---

### PUT /projects/:projectId

Update project metadata.

**Request:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "framework": "archimate"
}
```

All fields optional. Only provided fields are updated.

**Response 200**: Updated project object.

---

### DELETE /projects/:projectId

Permanently delete a project and all its artifacts.

**Request:**
```json
{ "confirmName": "Digital Transformation 2026" }
```

The `confirmName` must exactly match the project name to prevent
accidental deletion.

**Response 200:**
```json
{ "message": "Project deleted permanently." }
```

---

### GET /projects/:projectId/members

List project team members.

**Response 200:**
```json
{
  "members": [
    {
      "id": "member-uuid",
      "userId": "user-uuid",
      "email": "architect@company.com",
      "fullName": "Jane Architect",
      "role": "owner",
      "joinedAt": "2026-02-01T10:00:00.000Z"
    }
  ]
}
```

---

### POST /projects/:projectId/members

Add a team member to the project.

**Request:**
```json
{
  "email": "colleague@company.com",
  "role": "editor"
}
```

**Roles**: `owner`, `admin`, `editor`, `viewer`

**Response 201:**
```json
{
  "id": "member-uuid",
  "userId": "user-uuid",
  "email": "colleague@company.com",
  "role": "editor",
  "joinedAt": "2026-02-25T12:00:00.000Z"
}
```

---

## Artifacts Module

Base path: `/api/v1/projects/:projectId/artifacts`
All endpoints require Bearer token authentication.

### POST /projects/:projectId/artifacts/generate

Generate an architecture artifact from natural language using AI.

**Request:**
```json
{
  "name": "EMEA Payment Platform — Context View",
  "prompt": "A payment platform with API gateway, payment service, fraud detection, and integration with Stripe and PayPal. Uses microservices on Kubernetes with PostgreSQL and Redis.",
  "type": "c4_diagram",
  "framework": "c4"
}
```

**Constraints:**
- `name`: required, max 255 chars
- `prompt`: required, min 10 chars, max 4000 chars
- `type`: one of `archimate_diagram`, `c4_diagram`, `togaf_view`, `bpmn_diagram`, `custom`
- `framework`: one of `archimate`, `c4`, `togaf`, `bpmn`, `custom`

**Response 201:**
```json
{
  "id": "artifact-uuid",
  "name": "EMEA Payment Platform — Context View",
  "type": "c4_diagram",
  "framework": "c4",
  "status": "draft",
  "nlDescription": "A payment platform with API gateway...",
  "canvasData": {
    "elements": [
      {
        "id": "el-1",
        "type": "Person",
        "name": "Customer",
        "description": "Initiates payments",
        "position": { "x": 100, "y": 100, "width": 120, "height": 80 }
      },
      {
        "id": "el-2",
        "type": "System",
        "name": "Payment Platform",
        "description": "Processes payments",
        "position": { "x": 300, "y": 100, "width": 200, "height": 120 }
      }
    ],
    "relationships": [
      {
        "id": "rel-1",
        "sourceId": "el-1",
        "targetId": "el-2",
        "type": "Uses",
        "label": "makes payment via"
      }
    ],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  },
  "currentVersion": 1,
  "createdAt": "2026-02-25T12:00:00.000Z"
}
```

Note: This endpoint calls OpenRouter AI and may take 5-15 seconds.

---

### POST /projects/:projectId/artifacts

Manually create an artifact (no AI generation).

**Request:**
```json
{
  "name": "Application Layer",
  "type": "archimate_diagram",
  "framework": "archimate",
  "canvasData": {
    "elements": [],
    "relationships": [],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  }
}
```

**Response 201**: Artifact object (same shape as generate response).

---

### GET /projects/:projectId/artifacts

List artifacts in a project.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Max 100 |
| `framework` | string | — | Filter: `archimate`, `c4`, `togaf`, etc. |
| `status` | string | — | Filter: `draft`, `in_review`, `approved`, `published`, `archived` |

**Response 200:**
```json
{
  "data": [ /* artifact objects */ ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### GET /projects/:projectId/artifacts/:artifactId

Get a single artifact with full canvas data.

**Response 200**: Full artifact object including `canvasData`.

---

### PUT /projects/:projectId/artifacts/:artifactId

Update artifact metadata (name, status, description).

**Request:**
```json
{
  "name": "Updated Name",
  "status": "in_review"
}
```

**Response 200**: Updated artifact object.

---

### DELETE /projects/:projectId/artifacts/:artifactId

Delete an artifact permanently.

**Response 200:**
```json
{ "message": "Artifact deleted." }
```

---

### POST /projects/:projectId/artifacts/:artifactId/regenerate

Regenerate an artifact with a new or updated prompt. Creates a new
version (previous canvas is preserved in version history).

**Request:**
```json
{
  "prompt": "Updated prompt — add a CDN layer and a WAF"
}
```

**Response 201**: New artifact object with updated canvas data.

---

### PUT /projects/:projectId/artifacts/:artifactId/canvas

Save the full canvas state after manual editing. Creates a version
snapshot automatically.

**Request:**
```json
{
  "canvasData": {
    "elements": [ /* ... */ ],
    "relationships": [ /* ... */ ],
    "viewport": { "x": -50, "y": -100, "zoom": 0.8 }
  }
}
```

**Response 200**: Updated artifact object.

---

## Elements Sub-resource

Base path: `/api/v1/projects/:projectId/artifacts/:artifactId/elements`

### POST .../elements

Add a new element to an artifact.

**Request:**
```json
{
  "elementId": "el-new-1",
  "elementType": "ApplicationComponent",
  "name": "Order Service",
  "framework": "archimate",
  "description": "Handles order lifecycle",
  "layer": "application",
  "position": { "x": 400, "y": 200, "width": 160, "height": 80 },
  "properties": { "stereotype": "service" }
}
```

**Response 201**: Created element object.

---

### GET .../elements

List all elements in the artifact.

**Response 200:**
```json
{
  "elements": [
    {
      "id": "uuid",
      "elementId": "el-1",
      "elementType": "ApplicationComponent",
      "name": "Order Service",
      "framework": "archimate",
      "layer": "application",
      "position": { "x": 400, "y": 200, "width": 160, "height": 80 }
    }
  ]
}
```

---

### PUT .../elements/:elementId

Update an element's properties.

**Request**: Partial element object (only include fields to update).

**Response 200**: Updated element.

---

### DELETE .../elements/:elementId

Remove an element from the artifact.

**Response 200:**
```json
{ "message": "Element deleted." }
```

---

## Relationships Sub-resource

Base path: `/api/v1/projects/:projectId/artifacts/:artifactId/relationships`

### POST .../relationships

Add a relationship between two elements.

**Request:**
```json
{
  "relationshipId": "rel-new-1",
  "sourceElementId": "el-1",
  "targetElementId": "el-2",
  "relationshipType": "Serving",
  "framework": "archimate",
  "label": "provides order data to",
  "properties": {}
}
```

**Response 201**: Created relationship object.

---

### GET .../relationships

List all relationships in the artifact.

**Response 200:**
```json
{
  "relationships": [
    {
      "id": "uuid",
      "relationshipId": "rel-1",
      "sourceElementId": "el-1",
      "targetElementId": "el-2",
      "relationshipType": "Serving",
      "framework": "archimate",
      "label": "provides order data to"
    }
  ]
}
```

---

### DELETE .../relationships/:relationshipId

Remove a relationship.

**Response 200:**
```json
{ "message": "Relationship deleted." }
```

---

## Versions Module

Base path: `/api/v1/artifacts/:artifactId/versions`
All endpoints require Bearer token authentication.

### GET /artifacts/:artifactId/versions

List all versions for an artifact, newest first.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Max 100 |

**Response 200:**
```json
{
  "versions": [
    {
      "id": "version-uuid",
      "versionNumber": 3,
      "changeSummary": "Added CDN layer",
      "changeType": "manual_edit",
      "createdAt": "2026-02-25T14:00:00.000Z",
      "createdBy": {
        "id": "user-uuid",
        "fullName": "Jane Architect"
      }
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

---

### GET /artifacts/:artifactId/versions/:versionId

Get a specific version snapshot including full canvas data.

**Response 200:**
```json
{
  "id": "version-uuid",
  "versionNumber": 2,
  "canvasData": { /* canvas snapshot */ },
  "changeSummary": "AI generation",
  "changeType": "ai_generation",
  "createdAt": "2026-02-25T12:30:00.000Z"
}
```

---

### GET /artifacts/:artifactId/versions/:fromId/diff/:toId

Compute the diff between two versions.

**Response 200:**
```json
{
  "from": 1,
  "to": 3,
  "added": {
    "elements": [ /* elements added in v3 */ ],
    "relationships": [ /* relationships added in v3 */ ]
  },
  "removed": {
    "elements": [ /* elements in v1 but not v3 */ ],
    "relationships": []
  },
  "modified": {
    "elements": [ /* elements present in both but changed */ ]
  }
}
```

---

### POST /artifacts/:artifactId/versions/:versionId/restore

Restore an artifact to a previous version. Creates a new version
(current_version + 1) with the restored canvas data.

**Request:**
```json
{
  "changeSummary": "Reverting to pre-cloud migration design"
}
```

`changeSummary` is optional.

**Response 201:**
```json
{
  "id": "version-uuid",
  "versionNumber": 4,
  "changeSummary": "Reverting to pre-cloud migration design",
  "changeType": "restoration",
  "createdAt": "2026-02-25T15:00:00.000Z"
}
```

---

## Comments Module

Base path: `/api/v1/artifacts/:artifactId/comments`
All endpoints require Bearer token authentication.

### POST /artifacts/:artifactId/comments

Create a comment on an artifact. Comments can be:
- General artifact comments (`elementId` omitted)
- Anchored to a specific element (`elementId` provided)
- Threaded replies (`parentCommentId` provided)

**Request:**
```json
{
  "body": "The CDN layer should be in the technology layer, not application.",
  "elementId": "el-cdn-1",
  "parentCommentId": null
}
```

**Response 201:**
```json
{
  "id": "comment-uuid",
  "body": "The CDN layer should be in the technology layer, not application.",
  "elementId": "el-cdn-1",
  "status": "open",
  "author": {
    "id": "user-uuid",
    "fullName": "Bob Reviewer",
    "avatarUrl": null
  },
  "createdAt": "2026-02-25T15:00:00.000Z"
}
```

---

### GET /artifacts/:artifactId/comments

List comments on an artifact.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Max 200 |
| `elementId` | string | — | Filter to element-anchored comments |
| `status` | string | `open` | Filter: `open`, `resolved`, `all` |

**Response 200:**
```json
{
  "comments": [ /* comment objects */ ],
  "total": 8,
  "page": 1
}
```

---

### PUT /artifacts/:artifactId/comments/:commentId

Update a comment body. Only the comment author can edit their own comment.

**Request:**
```json
{ "body": "Updated comment text." }
```

**Response 200**: Updated comment object.

---

### DELETE /artifacts/:artifactId/comments/:commentId

Delete a comment. Only the author or project owner can delete.

**Response 200:**
```json
{ "message": "Comment deleted." }
```

---

### POST /artifacts/:artifactId/comments/:commentId/resolve

Mark a comment as resolved.

**Request body**: Empty (`{}`)

**Response 200:**
```json
{
  "id": "comment-uuid",
  "status": "resolved",
  "resolvedAt": "2026-02-25T16:00:00.000Z"
}
```

---

## Shares Module

Base path: `/api/v1/artifacts/:artifactId/shares`
All endpoints require Bearer token authentication except the public link resolver.

### POST /artifacts/:artifactId/shares/user

Share an artifact with a specific user by email.

**Request:**
```json
{
  "email": "stakeholder@company.com",
  "permission": "view",
  "expiresIn": 604800
}
```

- `permission`: `view`, `comment`, or `edit`
- `expiresIn`: seconds until expiry (optional; no expiry if omitted)

**Response 201:**
```json
{
  "id": "share-uuid",
  "artifactId": "artifact-uuid",
  "email": "stakeholder@company.com",
  "permission": "view",
  "shareType": "invite",
  "expiresAt": "2026-03-04T12:00:00.000Z",
  "createdAt": "2026-02-25T12:00:00.000Z"
}
```

---

### POST /artifacts/:artifactId/shares/link

Create a shareable public link.

**Request:**
```json
{
  "permission": "view",
  "expiresIn": 604800
}
```

**Response 201:**
```json
{
  "id": "share-uuid",
  "linkToken": "abc123xyz",
  "shareUrl": "http://localhost:3116/share/abc123xyz",
  "permission": "view",
  "shareType": "link",
  "expiresAt": "2026-03-04T12:00:00.000Z",
  "createdAt": "2026-02-25T12:00:00.000Z"
}
```

---

### GET /artifacts/:artifactId/shares

List all shares for an artifact.

**Response 200:**
```json
{
  "shares": [
    {
      "id": "share-uuid",
      "permission": "view",
      "shareType": "invite",
      "email": "stakeholder@company.com",
      "expiresAt": "2026-03-04T12:00:00.000Z"
    },
    {
      "id": "share-uuid-2",
      "permission": "view",
      "shareType": "link",
      "linkToken": "abc123xyz",
      "expiresAt": null
    }
  ]
}
```

---

### DELETE /artifacts/:artifactId/shares/:shareId

Revoke a share (user invite or link).

**Response 200:**
```json
{ "message": "Share revoked." }
```

---

### GET /artifacts/shares/link/:token

Resolve a public share link and retrieve the artifact.

**Auth required**: No (public endpoint)

**Response 200:**
```json
{
  "artifact": {
    "id": "artifact-uuid",
    "name": "Payment Platform Architecture",
    "type": "c4_diagram",
    "framework": "c4",
    "canvasData": { /* ... */ }
  },
  "permission": "view",
  "expiresAt": "2026-03-04T12:00:00.000Z"
}
```

**Response 404**: Token not found or expired.

---

## Documents Module

Base path: `/api/v1/projects/:projectId/documents`
All endpoints require Bearer token authentication.

### POST /projects/:projectId/documents

Upload an architecture document for AI extraction.

**Request:**
```json
{
  "filename": "system-architecture-v2.pdf",
  "fileType": "pdf",
  "content": "<base64-encoded file content>",
  "fileSize": 245760
}
```

- `fileType`: `pdf`, `docx`, `txt`, `md`, `html`
- `content`: base64-encoded file bytes
- `fileSize`: file size in bytes

**Response 201:**
```json
{
  "id": "doc-uuid",
  "projectId": "proj-uuid",
  "originalFilename": "system-architecture-v2.pdf",
  "fileType": "pdf",
  "fileSizeBytes": 245760,
  "status": "pending",
  "createdAt": "2026-02-25T12:00:00.000Z"
}
```

---

### GET /projects/:projectId/documents

List all documents uploaded to a project.

**Response 200:**
```json
{
  "documents": [
    {
      "id": "doc-uuid",
      "originalFilename": "system-architecture-v2.pdf",
      "fileType": "pdf",
      "fileSizeBytes": 245760,
      "status": "processed",
      "createdAt": "2026-02-25T12:00:00.000Z"
    }
  ]
}
```

**Document statuses**: `pending`, `processing`, `processed`, `failed`

---

### GET /projects/:projectId/documents/:documentId

Get document details including extracted content and components.

**Response 200:**
```json
{
  "id": "doc-uuid",
  "originalFilename": "system-architecture-v2.pdf",
  "fileType": "pdf",
  "status": "processed",
  "extractedText": "This document describes the payment platform...",
  "extractedComponents": {
    "systems": ["Payment API", "Fraud Service", "User Service"],
    "integrations": ["Stripe", "PayPal"],
    "technologies": ["Kubernetes", "PostgreSQL"]
  },
  "createdAt": "2026-02-25T12:00:00.000Z"
}
```

---

### POST /projects/:projectId/documents/:documentId/generate

Generate an architecture artifact from the extracted document content.
Calls OpenRouter AI to model the extracted components as a diagram.

**Request:**
```json
{
  "framework": "c4",
  "artifactName": "Payment Platform — Extracted Architecture"
}
```

**Response 201:**
```json
{
  "artifact": {
    "id": "artifact-uuid",
    "name": "Payment Platform — Extracted Architecture",
    "framework": "c4",
    "status": "draft",
    "canvasData": { /* generated canvas */ }
  }
}
```

---

## Exports Module

Base path: `/api/v1/projects/:projectId/artifacts/:artifactId/export`
Requires Bearer token authentication.

### POST /projects/:projectId/artifacts/:artifactId/export

Export an artifact in a specific format. Returns a binary file download.

**Request:**
```json
{ "format": "svg" }
```

**Supported formats:**

| Format | Content-Type | File Extension |
|--------|-------------|----------------|
| `svg` | `image/svg+xml` | `.svg` |
| `png` | `image/png` | `.png` |
| `pdf` | `application/pdf` | `.pdf` |
| `plantuml` | `text/plain` | `.puml` |
| `archimate_xml` | `application/xml` | `.xml` |
| `mermaid` | `text/plain` | `.mmd` |
| `drawio` | `application/xml` | `.drawio` |

**Response**: Binary file with headers:
```
Content-Type: image/svg+xml
Content-Disposition: attachment; filename="payment-platform.svg"
```

---

## Templates Module

Base path: `/api/v1/templates`
All endpoints require Bearer token authentication.

### GET /templates

Browse the template gallery.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | — | Filter: `industry`, `pattern`, `framework` |
| `framework` | string | — | Filter: `archimate`, `c4`, `togaf`, `multi` |
| `search` | string | — | Search by template name |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Max 100 |

**Response 200:**
```json
{
  "templates": [
    {
      "id": "template-uuid",
      "name": "Microservices — C4 Context",
      "description": "Standard C4 context diagram for microservices",
      "category": "pattern",
      "subcategory": "microservices",
      "framework": "c4",
      "isPublic": true,
      "usageCount": 142,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "total": 45,
  "page": 1
}
```

---

### GET /templates/:templateId

Get a template with full canvas data (ready to instantiate).

**Response 200:**
```json
{
  "id": "template-uuid",
  "name": "Microservices — C4 Context",
  "description": "Standard C4 context diagram for microservices",
  "category": "pattern",
  "framework": "c4",
  "canvasData": { /* template canvas */ },
  "svgPreview": "<svg>...</svg>",
  "isPublic": true,
  "usageCount": 142
}
```

---

### POST /templates

Create a new template (saved from an existing artifact or from scratch).

**Request:**
```json
{
  "name": "My Company Reference Architecture",
  "description": "Standard 3-tier architecture for internal projects",
  "category": "pattern",
  "subcategory": "3-tier",
  "framework": "archimate",
  "canvasData": { /* canvas data */ },
  "isPublic": false
}
```

**Response 201**: Created template object.

---

### POST /templates/:templateId/instantiate

Create a new artifact in a project from a template. The template canvas
data is copied to the new artifact.

**Request:**
```json
{
  "projectId": "proj-uuid",
  "name": "Order Management — Context Diagram",
  "description": "Based on microservices template"
}
```

**Response 201:**
```json
{
  "artifact": {
    "id": "artifact-uuid",
    "name": "Order Management — Context Diagram",
    "framework": "c4",
    "status": "draft",
    "canvasData": { /* copied from template */ }
  },
  "templateId": "template-uuid",
  "templateName": "Microservices — C4 Context"
}
```

---

## Validation Module

Base path: `/api/v1/projects/:projectId/artifacts/:artifactId/validate`
Requires Bearer token authentication.

### POST /projects/:projectId/artifacts/:artifactId/validate

Validate an artifact against the rules of its architecture framework.
Checks structural correctness, required element types, valid relationship
types, and framework-specific constraints.

**Request body**: Empty (`{}`)

**Response 200:**
```json
{
  "valid": false,
  "score": 72,
  "framework": "archimate",
  "issueCount": 3,
  "issues": [
    {
      "rule": "ARCH-001",
      "severity": "error",
      "message": "ApplicationComponent 'Order Service' has no serving relationship to any BusinessProcess",
      "elementId": "el-order-svc"
    },
    {
      "rule": "ARCH-015",
      "severity": "warning",
      "message": "ApplicationInterface 'Payment API' is not assigned to any ApplicationComponent",
      "elementId": "el-payment-api"
    },
    {
      "rule": "ARCH-030",
      "severity": "info",
      "message": "Consider adding a Technology layer component for the database",
      "elementId": null
    }
  ],
  "validatedAt": "2026-02-25T16:00:00.000Z"
}
```

**Severity levels**: `error` (fails validation), `warning` (best practice
violation), `info` (suggestion).

**Score**: 0-100 compliance score. 100 = fully compliant.

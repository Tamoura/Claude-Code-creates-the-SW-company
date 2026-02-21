# ConnectIn -- API Documentation

> **Version**: 1.0
> **Date**: February 20, 2026
> **Base URL**: `http://localhost:5007/api/v1` (development)
> **Authentication**: JWT Bearer token (unless marked Public)
> **Content-Type**: `application/json`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Profiles](#3-profiles)
4. [Connections](#4-connections)
5. [Posts & Feed](#5-posts--feed)
6. [Jobs](#6-jobs)
7. [Messaging](#7-messaging)
8. [Search](#8-search)
9. [Notifications](#9-notifications)
10. [AI Features](#10-ai-features)
11. [Admin](#11-admin)
12. [Settings](#12-settings)
13. [WebSocket Events](#13-websocket-events)
14. [Error Codes](#14-error-codes)

---

## 1. Overview

### Base URL

| Environment | URL |
|-------------|-----|
| Local Development | `http://localhost:5007/api/v1` |
| Production | `https://api.connectin.app/api/v1` |

### Response Envelope

All responses follow a consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

### Authentication

Most endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Endpoints marked **Public** do not require authentication.

### Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Authenticated user | 100 requests | 1 minute |
| Unauthenticated IP | 20 requests | 1 minute |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1740000060
```

When rate limited, the API returns `429 Too Many Requests` with a `Retry-After` header.

---

## 2. Authentication

### POST /auth/register

**Public** -- Create a new account with email and password.

**Request:**
```json
{
  "email": "ahmed@example.com",
  "password": "SecureP@ss1",
  "displayName": "Ahmed Al-Rashidi"
}
```

**Validation Rules:**
- `email`: Valid email format, max 255 characters
- `password`: Min 8 characters, 1 uppercase, 1 number, 1 special character
- `displayName`: 1-100 characters

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "userId": "01HQ7GBX...",
    "email": "ahmed@example.com",
    "message": "Verification email sent. Please check your inbox."
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 409 | `CONFLICT` | Email already registered |
| 422 | `VALIDATION_ERROR` | Invalid input |
| 429 | `RATE_LIMITED` | 3 registrations/hour per IP exceeded |

---

### POST /auth/login

**Public** -- Authenticate with email and password.

**Request:**
```json
{
  "email": "ahmed@example.com",
  "password": "SecureP@ss1"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "01HQ7GBX...",
      "email": "ahmed@example.com",
      "displayName": "Ahmed Al-Rashidi",
      "role": "user",
      "emailVerified": true,
      "languagePreference": "ar"
    }
  }
}
```

Also sets a `refreshToken` as an httpOnly, Secure, SameSite=Strict cookie.

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Invalid email or password |
| 403 | `FORBIDDEN` | Account suspended or banned |
| 429 | `RATE_LIMITED` | 5 login attempts/minute per IP exceeded |

---

### POST /auth/logout

End the current session and invalidate the refresh token.

**Request:** No body required. Refresh token is read from the cookie.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### POST /auth/refresh

**Public** -- Exchange a refresh token for a new access token. The refresh token is rotated.

**Request:** No body. Refresh token is read from the httpOnly cookie.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Also sets a new `refreshToken` cookie (rotation).

---

### GET /auth/verify/:token

**Public** -- Verify email address using the token sent in the verification email.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "redirectTo": "/profile/setup"
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Token expired (after 24 hours) |
| 404 | `NOT_FOUND` | Invalid token |

---

### POST /auth/forgot-password

**Public** -- Request a password reset email.

**Request:**
```json
{
  "email": "ahmed@example.com"
}
```

**Response (200 OK):** Always returns success (to prevent email enumeration):
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, a reset link has been sent."
  }
}
```

---

### POST /auth/reset-password

**Public** -- Reset password using the token from the email.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecureP@ss2"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully",
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### GET /auth/oauth/google

**Public** -- Initiate Google OAuth 2.0 PKCE flow. Redirects the browser to Google's consent screen.

**Response:** 302 Redirect to `https://accounts.google.com/o/oauth2/v2/auth?...`

---

### GET /auth/oauth/github

**Public** -- Initiate GitHub OAuth flow.

**Response:** 302 Redirect to `https://github.com/login/oauth/authorize?...`

---

### GET /auth/oauth/callback

**Public** -- OAuth callback handler. Processes the authorization code, creates or links the account, and redirects to the frontend.

**Query Parameters:**
- `code` -- Authorization code from the OAuth provider
- `state` -- State parameter for CSRF protection

**Response:** 302 Redirect to `{FRONTEND_URL}/?token={accessToken}` (new user redirected to `/profile/setup`)

---

## 3. Profiles

### GET /profiles/me

Get the authenticated user's own profile with all related data.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "01HQ7GBX...",
    "userId": "01HQ7GBX...",
    "headlineAr": "مهندس برمجيات أول في شركة فنتك",
    "headlineEn": "Senior Software Engineer at Fintech Startup",
    "summaryAr": "أكثر من 6 سنوات من الخبرة في تطوير البرمجيات...",
    "summaryEn": "6+ years of software engineering experience...",
    "avatarUrl": "https://r2.connectin.app/avatars/01HQ7GBX.webp",
    "location": "Riyadh, Saudi Arabia",
    "website": "https://ahmed.dev",
    "completenessScore": 85,
    "experiences": [
      {
        "id": "01HQ8ABC...",
        "company": "Fintech Startup",
        "title": "Senior Software Engineer",
        "location": "Riyadh, Saudi Arabia",
        "description": "Led a team of 5 engineers...",
        "startDate": "2023-01-01",
        "endDate": null,
        "isCurrent": true
      }
    ],
    "educations": [
      {
        "id": "01HQ8DEF...",
        "institution": "King Saud University",
        "degree": "Bachelor of Computer Science",
        "fieldOfStudy": "Computer Science",
        "startYear": 2015,
        "endYear": 2019
      }
    ],
    "skills": [
      { "id": "01HQ8GHI...", "nameEn": "TypeScript", "nameAr": "تايب سكريبت", "endorsementCount": 12 },
      { "id": "01HQ8JKL...", "nameEn": "React", "nameAr": "رياكت", "endorsementCount": 8 }
    ],
    "createdAt": "2026-02-20T10:00:00Z",
    "updatedAt": "2026-02-20T15:30:00Z"
  }
}
```

---

### GET /profiles/:id

Get another user's public profile.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "01HQ9XYZ...",
    "userId": "01HQ9XYZ...",
    "displayName": "Sophia Chen",
    "headlineAr": null,
    "headlineEn": "Product Manager at AI Startup",
    "summaryEn": "Passionate about building products...",
    "avatarUrl": "https://r2.connectin.app/avatars/01HQ9XYZ.webp",
    "location": "Berlin, Germany",
    "completenessScore": 72,
    "connectionStatus": "none",
    "mutualConnections": 3,
    "experiences": [...],
    "educations": [...],
    "skills": [...]
  }
}
```

The `connectionStatus` field indicates the relationship between the authenticated user and the profile owner: `"none"`, `"pending_sent"`, `"pending_received"`, or `"connected"`.

---

### PATCH /profiles/me

Update the authenticated user's profile. Only include fields to update.

**Request:**
```json
{
  "headlineAr": "مهندس برمجيات أول | خبير في التقنيات المالية",
  "headlineEn": "Senior Software Engineer | Fintech Specialist",
  "location": "Riyadh, Saudi Arabia",
  "website": "https://ahmed.dev"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "01HQ7GBX...",
    "headlineAr": "مهندس برمجيات أول | خبير في التقنيات المالية",
    "headlineEn": "Senior Software Engineer | Fintech Specialist",
    "completenessScore": 87,
    "updatedAt": "2026-02-20T16:00:00Z"
  }
}
```

---

### POST /profiles/me/avatar

Upload a profile avatar image. Uses `multipart/form-data`.

**Request:**
```
Content-Type: multipart/form-data
file: (binary JPEG/PNG/WebP, max 5MB)
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://r2.connectin.app/avatars/01HQ7GBX.webp"
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | File exceeds 5MB or unsupported format |

---

### POST /profiles/me/experience

Add an experience entry.

**Request:**
```json
{
  "company": "Fintech Startup",
  "title": "Senior Software Engineer",
  "location": "Riyadh, Saudi Arabia",
  "description": "Led a team of 5 engineers building payment infrastructure.",
  "startDate": "2023-01-01",
  "endDate": null,
  "isCurrent": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "01HQ8ABC...",
    "company": "Fintech Startup",
    "title": "Senior Software Engineer",
    "startDate": "2023-01-01",
    "isCurrent": true,
    "completenessScore": 90
  }
}
```

---

### PATCH /profiles/me/experience/:id

Update an experience entry. Only include fields to update.

### DELETE /profiles/me/experience/:id

Delete an experience entry. Returns updated completeness score.

### POST /profiles/me/education

Add an education entry.

**Request:**
```json
{
  "institution": "King Saud University",
  "degree": "Bachelor of Computer Science",
  "fieldOfStudy": "Computer Science",
  "startYear": 2015,
  "endYear": 2019
}
```

### PATCH /profiles/me/education/:id

Update an education entry.

### DELETE /profiles/me/education/:id

Delete an education entry.

### PUT /profiles/me/skills

Replace the user's skills list.

**Request:**
```json
{
  "skillIds": ["01HQ8GHI...", "01HQ8JKL...", "01HQ8MNO..."]
}
```

---

## 4. Connections

### POST /connections/request

Send a connection request to another user.

**Request:**
```json
{
  "receiverId": "01HQ9XYZ...",
  "message": "Hi Sophia, I noticed we both work in fintech. Would love to connect!"
}
```

**Validation:**
- `message`: Optional, max 300 characters
- Sender must not already have a pending/active connection with receiver
- Sender must not be in a 30-day cooldown period after rejection
- Sender must have fewer than 100 pending outgoing requests

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "connectionId": "01HQA123...",
    "status": "pending",
    "createdAt": "2026-02-20T16:30:00Z",
    "expiresAt": "2026-05-21T16:30:00Z"
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 409 | `CONFLICT` | Already connected or request pending |
| 403 | `FORBIDDEN` | In cooldown period (rejection < 30 days ago) |
| 400 | `BAD_REQUEST` | Max pending requests (100) reached |

---

### POST /connections/:id/accept

Accept a pending connection request.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "connectionId": "01HQA123...",
    "status": "accepted",
    "respondedAt": "2026-02-20T17:00:00Z"
  }
}
```

---

### POST /connections/:id/reject

Reject a pending connection request. Sets a 30-day cooldown. The sender is **not** notified.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "connectionId": "01HQA123...",
    "status": "rejected",
    "cooldownUntil": "2026-03-22T17:00:00Z"
  }
}
```

---

### DELETE /connections/:id/withdraw

Withdraw a pending outgoing connection request.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "connectionId": "01HQA123...",
    "status": "withdrawn"
  }
}
```

---

### DELETE /connections/:id

Remove an existing connection. Bilateral removal.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Connection removed"
  }
}
```

---

### GET /connections

List the authenticated user's connections with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` (optional: filter by name, company, or title)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "connectionId": "01HQA123...",
      "user": {
        "id": "01HQ9XYZ...",
        "displayName": "Sophia Chen",
        "avatarUrl": "https://r2.connectin.app/avatars/01HQ9XYZ.webp",
        "headlineEn": "Product Manager at AI Startup"
      },
      "connectedSince": "2026-02-20T17:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 47
  }
}
```

---

### GET /connections/pending

List pending connection requests (both incoming and outgoing).

**Query Parameters:**
- `direction`: `incoming` | `outgoing` | `all` (default: `all`)
- `page` (default: 1)
- `limit` (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "incoming": [
      {
        "connectionId": "01HQA456...",
        "user": {
          "id": "01HQB789...",
          "displayName": "Khalid Mansour",
          "avatarUrl": "...",
          "headlineEn": "Head of Talent Acquisition"
        },
        "message": "Hi Ahmed, I am recruiting for fintech positions...",
        "mutualConnections": 5,
        "createdAt": "2026-02-19T10:00:00Z"
      }
    ],
    "outgoing": [
      {
        "connectionId": "01HQA789...",
        "user": {
          "id": "01HQC012...",
          "displayName": "Layla Farouk",
          "avatarUrl": "...",
          "headlineAr": "مستشارة تقنية ومدونة"
        },
        "message": null,
        "createdAt": "2026-02-18T14:00:00Z"
      }
    ]
  },
  "meta": {
    "incomingCount": 3,
    "outgoingCount": 7
  }
}
```

---

### GET /connections/mutual/:userId

Get mutual connections between the authenticated user and another user.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "01HQD345...",
      "displayName": "Omar Khalil",
      "avatarUrl": "...",
      "headlineEn": "CTO at Gulf Ventures"
    }
  ],
  "meta": {
    "total": 3
  }
}
```

---

## 5. Posts & Feed

### POST /posts

Create a new post.

**Request (text only):**
```json
{
  "content": "مقال رائع عن مستقبل الذكاء الاصطناعي في المنطقة العربية 🚀\n\nAn excellent article about the future of AI in the Arab region\n\n#AI #MENA_tech #الذكاء_الاصطناعي",
  "textDirection": "auto"
}
```

**Request (with images):** Uses `multipart/form-data`:
```
Content-Type: multipart/form-data
content: "Check out this architecture diagram!"
textDirection: auto
images[0]: (binary file, max 10MB)
images[1]: (binary file, max 10MB)
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "01HQE678...",
    "authorId": "01HQ7GBX...",
    "content": "مقال رائع عن مستقبل الذكاء الاصطناعي...",
    "textDirection": "rtl",
    "images": [],
    "hashtags": ["AI", "MENA_tech", "الذكاء_الاصطناعي"],
    "likeCount": 0,
    "commentCount": 0,
    "shareCount": 0,
    "createdAt": "2026-02-20T18:00:00Z"
  }
}
```

---

### GET /posts/feed

Get the authenticated user's personalized news feed (cursor-based pagination).

**Query Parameters:**
- `cursor` (optional: base64-encoded cursor from previous response)
- `limit` (default: 10, max: 50)

**Feed algorithm (MVP):**
```
feed_score = recency * 0.6 + engagement * 0.3 + connection_strength * 0.1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "01HQE678...",
      "author": {
        "id": "01HQ7GBX...",
        "displayName": "Ahmed Al-Rashidi",
        "avatarUrl": "...",
        "headlineEn": "Senior Software Engineer"
      },
      "content": "مقال رائع عن مستقبل الذكاء الاصطناعي...",
      "textDirection": "rtl",
      "images": [
        {
          "url": "https://r2.connectin.app/posts/01HQE678/img1.webp",
          "alt": "Architecture diagram",
          "width": 1200,
          "height": 800
        }
      ],
      "hashtags": ["AI", "MENA_tech"],
      "likeCount": 42,
      "commentCount": 7,
      "shareCount": 3,
      "isLikedByMe": false,
      "recentComments": [
        {
          "authorName": "Sophia Chen",
          "authorAvatarUrl": "...",
          "content": "Great insights!",
          "createdAt": "2026-02-20T18:30:00Z"
        }
      ],
      "createdAt": "2026-02-20T18:00:00Z"
    }
  ],
  "meta": {
    "cursor": "eyJjcmVhdGVkQXQiOi...",
    "hasMore": true,
    "count": 10
  }
}
```

---

### GET /posts/:id

Get a single post with full details.

### DELETE /posts/:id

Delete own post (soft delete).

---

### POST /posts/:id/like

Like a post. Idempotent (calling twice does not create duplicate likes).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 43
  }
}
```

---

### DELETE /posts/:id/like

Remove a like from a post.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "liked": false,
    "likeCount": 42
  }
}
```

---

### POST /posts/:id/comments

Add a comment to a post.

**Request:**
```json
{
  "content": "Great article! I have been following this topic closely. مقال ممتاز!",
  "textDirection": "auto"
}
```

**Validation:** Max 1000 characters.

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "01HQF901...",
    "postId": "01HQE678...",
    "authorId": "01HQ9XYZ...",
    "content": "Great article! I have been following this topic closely. مقال ممتاز!",
    "textDirection": "ltr",
    "createdAt": "2026-02-20T18:45:00Z"
  }
}
```

---

### GET /posts/:id/comments

List comments on a post with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

---

### POST /posts/:id/share

Share a post to the authenticated user's feed.

**Request:**
```json
{
  "comment": "Must read for anyone in MENA tech!"
}
```

**Validation:** `comment` optional, max 1000 characters.

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "01HQG234...",
    "sharedPostId": "01HQE678...",
    "shareComment": "Must read for anyone in MENA tech!",
    "createdAt": "2026-02-20T19:00:00Z"
  }
}
```

---

### POST /posts/:id/report

Report a post for violating community guidelines.

**Request:**
```json
{
  "category": "spam",
  "details": "This appears to be a promotional spam post."
}
```

**Validation:**
- `category`: One of `spam`, `harassment`, `misinformation`, `hate_speech`, `impersonation`, `other`
- `details`: Optional, max 500 characters

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "reportId": "01HQH567...",
    "message": "Report submitted. We will review this within 24 hours."
  }
}
```

---

## 6. Jobs

### POST /jobs

**Requires role: recruiter** -- Create a new job posting.

**Request:**
```json
{
  "title": "Senior React Developer",
  "description": "We are looking for an experienced React developer to join our team in Riyadh...",
  "requirements": "- 5+ years React experience\n- TypeScript proficiency\n- RTL/i18n experience preferred",
  "location": "Riyadh, Saudi Arabia",
  "workType": "hybrid",
  "experienceLevel": "senior",
  "salaryMin": 25000,
  "salaryMax": 35000,
  "salaryCurrency": "SAR",
  "language": "bilingual",
  "status": "active"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "01HQI890...",
    "title": "Senior React Developer",
    "status": "active",
    "applicationCount": 0,
    "createdAt": "2026-02-20T20:00:00Z"
  }
}
```

---

### GET /jobs

Search and list job postings with filters.

**Query Parameters:**
- `q` (optional: keyword search)
- `location` (optional)
- `workType` (optional: `onsite`, `hybrid`, `remote`)
- `experienceLevel` (optional: `entry`, `mid`, `senior`, `lead`, `executive`)
- `language` (optional: `ar`, `en`, `bilingual`)
- `postedAfter` (optional: ISO date)
- `page` (default: 1)
- `limit` (default: 20)
- `sort` (default: `relevance`, options: `relevance`, `date`, `salary`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "01HQI890...",
      "title": "Senior React Developer",
      "company": {
        "name": "Gulf Tech Solutions",
        "logoUrl": "..."
      },
      "location": "Riyadh, Saudi Arabia",
      "workType": "hybrid",
      "experienceLevel": "senior",
      "salaryMin": 25000,
      "salaryMax": 35000,
      "salaryCurrency": "SAR",
      "language": "bilingual",
      "applicationCount": 12,
      "isApplied": false,
      "isSaved": false,
      "createdAt": "2026-02-20T20:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

---

### GET /jobs/:id

Get full job details.

### PATCH /jobs/:id

**Requires: recruiter + owner** -- Update a job posting.

### DELETE /jobs/:id

**Requires: recruiter + owner** -- Close/delete a job posting.

---

### POST /jobs/:id/apply

Apply to a job posting.

**Request:**
```json
{
  "coverNote": "I am very interested in this role. My experience in fintech aligns well with your requirements."
}
```

**Validation:** `coverNote` optional, max 500 characters.

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "applicationId": "01HQJ012...",
    "jobId": "01HQI890...",
    "status": "applied",
    "appliedAt": "2026-02-20T21:00:00Z"
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 409 | `CONFLICT` | Already applied to this job |

---

### GET /jobs/:id/applications

**Requires: recruiter + job owner** -- List applicants for a job posting.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "applicationId": "01HQJ012...",
      "applicant": {
        "id": "01HQ7GBX...",
        "displayName": "Ahmed Al-Rashidi",
        "avatarUrl": "...",
        "headlineEn": "Senior Software Engineer",
        "location": "Riyadh, Saudi Arabia",
        "skills": ["TypeScript", "React", "Node.js"]
      },
      "coverNote": "I am very interested in this role...",
      "status": "applied",
      "appliedAt": "2026-02-20T21:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12
  }
}
```

---

## 7. Messaging

### GET /conversations

List the authenticated user's conversations, sorted by most recent message.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "01HQK345...",
      "contact": {
        "id": "01HQ9XYZ...",
        "displayName": "Sophia Chen",
        "avatarUrl": "...",
        "isOnline": true
      },
      "lastMessage": {
        "content": "Thanks for the recommendation!",
        "senderId": "01HQ9XYZ...",
        "createdAt": "2026-02-20T22:00:00Z"
      },
      "unreadCount": 2,
      "lastMessageAt": "2026-02-20T22:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalUnread": 5
  }
}
```

---

### GET /conversations/:id/messages

Get messages in a conversation (cursor-based, newest first).

**Query Parameters:**
- `cursor` (optional)
- `limit` (default: 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "01HQL678...",
      "senderId": "01HQ7GBX...",
      "content": "Hi Sophia! I saw your post about AI in product management.",
      "textDirection": "ltr",
      "status": "read",
      "readAt": "2026-02-20T21:35:00Z",
      "createdAt": "2026-02-20T21:30:00Z"
    },
    {
      "id": "01HQL901...",
      "senderId": "01HQ9XYZ...",
      "content": "Thanks for the recommendation!",
      "textDirection": "ltr",
      "status": "delivered",
      "readAt": null,
      "createdAt": "2026-02-20T22:00:00Z"
    }
  ],
  "meta": {
    "cursor": "eyJjcmVhdGVkQXQiOi...",
    "hasMore": true,
    "count": 50
  }
}
```

---

### POST /messages

Send a message to a connection.

**Request:**
```json
{
  "conversationId": "01HQK345...",
  "content": "Would you be interested in collaborating on a project?"
}
```

If `conversationId` is not provided, include `recipientId` to auto-create a conversation:
```json
{
  "recipientId": "01HQ9XYZ...",
  "content": "Hi Sophia!"
}
```

**Validation:**
- Max 5000 characters
- Sender and recipient must be connected

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "01HQM234...",
    "conversationId": "01HQK345...",
    "content": "Would you be interested in collaborating on a project?",
    "status": "sent",
    "createdAt": "2026-02-20T22:30:00Z"
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 403 | `FORBIDDEN` | Users are not connected |

---

### PATCH /messages/:id/read

Mark a message as read.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messageId": "01HQL901...",
    "readAt": "2026-02-20T22:35:00Z"
  }
}
```

---

## 8. Search

### GET /search

Global search across people, posts, and jobs.

**Query Parameters:**
- `q` (required: search query, min 2 characters)
- `type` (optional: `people`, `posts`, `jobs`; default: all types)
- `page` (default: 1)
- `limit` (default: 20)
- Filters for people: `location`, `industry`
- Filters for jobs: `workType`, `experienceLevel`, `location`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "01HQ7GBX...",
        "displayName": "Ahmed Al-Rashidi",
        "avatarUrl": "...",
        "headlineEn": "Senior Software Engineer",
        "location": "Riyadh, Saudi Arabia",
        "mutualConnections": 3,
        "connectionStatus": "none"
      }
    ],
    "posts": [
      {
        "id": "01HQE678...",
        "authorName": "Ahmed Al-Rashidi",
        "contentPreview": "مقال رائع عن مستقبل الذكاء الاصطناعي...",
        "likeCount": 42,
        "createdAt": "2026-02-20T18:00:00Z"
      }
    ],
    "jobs": [
      {
        "id": "01HQI890...",
        "title": "Senior React Developer",
        "companyName": "Gulf Tech Solutions",
        "location": "Riyadh, Saudi Arabia",
        "workType": "hybrid"
      }
    ]
  },
  "meta": {
    "peopleTotalCount": 15,
    "postsTotalCount": 8,
    "jobsTotalCount": 3
  }
}
```

---

### GET /search/trending

Get trending topics/hashtags.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "hashtag": "الذكاء_الاصطناعي", "postCount": 127, "trend": "up" },
    { "hashtag": "MENA_tech", "postCount": 89, "trend": "up" },
    { "hashtag": "رؤية_2030", "postCount": 76, "trend": "stable" },
    { "hashtag": "fintech", "postCount": 54, "trend": "up" },
    { "hashtag": "hiring", "postCount": 41, "trend": "down" }
  ]
}
```

---

## 9. Notifications

### GET /notifications

List notifications for the authenticated user.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `unreadOnly` (optional: boolean)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "01HQN567...",
      "type": "connection_request",
      "title": "Khalid Mansour wants to connect",
      "message": "Hi Ahmed, I am recruiting for fintech positions...",
      "referenceId": "01HQA456...",
      "referenceType": "connection",
      "isRead": false,
      "createdAt": "2026-02-20T19:00:00Z"
    },
    {
      "id": "01HQN890...",
      "type": "like",
      "title": "Sophia Chen liked your post",
      "message": null,
      "referenceId": "01HQE678...",
      "referenceType": "post",
      "isRead": true,
      "readAt": "2026-02-20T19:30:00Z",
      "createdAt": "2026-02-20T19:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 28,
    "unreadCount": 5
  }
}
```

---

### PATCH /notifications/:id/read

Mark a single notification as read.

### PATCH /notifications/read-all

Mark all notifications as read.

### GET /notifications/unread-count

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

---

## 10. AI Features

### POST /ai/profile/optimize

Trigger AI profile optimization. Rate limited to 5 calls per user per day.

**Request:** No body required. The API reads the authenticated user's profile.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "completenessScore": 72,
    "suggestions": [
      {
        "section": "headline",
        "current": {
          "ar": "مهندس برمجيات",
          "en": "Software Engineer"
        },
        "suggested": {
          "ar": "مهندس برمجيات أول | متخصص في التقنيات المالية والذكاء الاصطناعي",
          "en": "Senior Software Engineer | Fintech & AI Specialist"
        },
        "reason": "Adding seniority level and specialization increases profile visibility in recruiter searches."
      },
      {
        "section": "summary",
        "suggested": {
          "ar": "أكثر من 6 سنوات من الخبرة في تطوير البرمجيات مع التركيز على...",
          "en": "6+ years of software engineering experience focused on..."
        },
        "reason": "A professional summary increases profile completeness by 20% and helps AI matching."
      },
      {
        "section": "skills",
        "suggestedSkills": ["Docker", "AWS", "PostgreSQL"],
        "reason": "Based on your experience, these skills are commonly listed by professionals in similar roles."
      }
    ],
    "tips": [
      "Add a professional photo to increase profile views by 14x",
      "Add your education to improve completeness score"
    ],
    "disclaimer": "Generated by AI. Review before accepting."
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 429 | `RATE_LIMITED` | 5 daily optimizations exceeded |
| 503 | `SERVICE_UNAVAILABLE` | Claude API unavailable |

---

## 11. Admin

All admin endpoints require the `admin` role.

### GET /admin/dashboard

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 2450,
    "activeUsers24h": 312,
    "newRegistrations7d": 87,
    "pendingReports": 5,
    "flaggedContent": 3,
    "totalPosts": 1240,
    "totalJobs": 45,
    "totalConnections": 8900
  }
}
```

---

### GET /admin/reports

List content reports in the moderation queue.

**Query Parameters:**
- `status`: `pending`, `reviewed`, `all` (default: `pending`)
- `page` (default: 1)
- `limit` (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "01HQH567...",
      "reporter": {
        "id": "01HQ7GBX...",
        "displayName": "Ahmed Al-Rashidi"
      },
      "reportedContent": {
        "type": "post",
        "id": "01HQP234...",
        "content": "Spam content here...",
        "authorName": "Suspicious User"
      },
      "category": "spam",
      "details": "This appears to be promotional spam.",
      "status": "pending",
      "reportCount": 3,
      "createdAt": "2026-02-20T20:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

### POST /admin/reports/:id/action

Take a moderation action on a report.

**Request:**
```json
{
  "action": "remove_content",
  "note": "Confirmed spam. Content removed and user warned."
}
```

**Valid actions:** `dismiss`, `warn_user`, `remove_content`, `suspend_user`, `ban_user`

---

### GET /admin/users

List users with filters.

**Query Parameters:**
- `search` (optional: name or email)
- `role` (optional: `user`, `recruiter`, `admin`)
- `status` (optional: `active`, `suspended`, `deleted`)
- `page`, `limit`

---

### PATCH /admin/users/:id

Update a user's role or status.

**Request:**
```json
{
  "role": "recruiter",
  "status": "suspended"
}
```

---

## 12. Settings

### GET /settings/notifications

Get notification preferences.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "connectionRequests": true,
    "messages": true,
    "postLikes": true,
    "postComments": true,
    "jobRecommendations": true,
    "emailDigest": "weekly",
    "sendReadReceipts": true
  }
}
```

---

### PATCH /settings/notifications

Update notification preferences.

**Request:**
```json
{
  "postLikes": false,
  "emailDigest": "daily"
}
```

---

### POST /settings/account/delete

Request account deletion with 30-day grace period.

**Request:**
```json
{
  "password": "CurrentP@ss1",
  "confirmation": "DELETE MY ACCOUNT"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Account scheduled for deletion. You have 30 days to cancel by logging in.",
    "deletionDate": "2026-03-22T00:00:00Z"
  }
}
```

---

### POST /settings/account/export

Request a full data export (GDPR Right to Access).

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "message": "Data export queued. You will receive an email when it is ready.",
    "estimatedTime": "15 minutes"
  }
}
```

---

## 13. WebSocket Events

Connect to `ws://localhost:5007/ws` (or `wss://api.connectin.app/ws` in production) with the JWT token.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:5007/ws', [], {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Server-to-Client Events

| Event Type | Payload | When |
|------------|---------|------|
| `new_message` | `{messageId, conversationId, senderId, content, createdAt}` | New message received |
| `message_read` | `{messageId, readAt}` | Recipient read your message |
| `typing_start` | `{conversationId, userId}` | User started typing |
| `typing_stop` | `{conversationId, userId}` | User stopped typing |
| `notification` | `{id, type, title, referenceId}` | New notification |
| `connection_accepted` | `{connectionId, userId}` | Connection request accepted |

### Client-to-Server Events

| Event Type | Payload | Purpose |
|------------|---------|---------|
| `typing` | `{conversationId}` | Indicate typing (debounced) |
| `ping` | `{}` | Keep connection alive |

### Event Format

```json
{
  "type": "new_message",
  "data": {
    "messageId": "01HQM234...",
    "conversationId": "01HQK345...",
    "senderId": "01HQ7GBX...",
    "content": "Hello!",
    "createdAt": "2026-02-20T23:00:00Z"
  },
  "timestamp": "2026-02-20T23:00:00.123Z"
}
```

---

## 14. Error Codes

### HTTP Status Codes

| Status | Meaning |
|:------:|---------|
| 200 | OK -- Request succeeded |
| 201 | Created -- Resource created |
| 202 | Accepted -- Request queued for processing |
| 400 | Bad Request -- Malformed request |
| 401 | Unauthorized -- Missing or invalid authentication |
| 403 | Forbidden -- Insufficient permissions |
| 404 | Not Found -- Resource does not exist |
| 409 | Conflict -- Resource already exists |
| 422 | Unprocessable Entity -- Validation error |
| 429 | Too Many Requests -- Rate limited |
| 500 | Internal Server Error -- Unexpected error |
| 503 | Service Unavailable -- External service down |

### Application Error Codes

| Code | HTTP Status | Description |
|------|:-----------:|-------------|
| `BAD_REQUEST` | 400 | Malformed or missing required fields |
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid JWT token |
| `FORBIDDEN` | 403 | Valid token but insufficient role or permissions |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., email exists, already connected, already applied) |
| `VALIDATION_ERROR` | 422 | Input validation failure with field-level details |
| `RATE_LIMITED` | 429 | Rate limit exceeded; check `Retry-After` header |
| `COOLDOWN_ACTIVE` | 403 | Connection request cooldown (30 days after rejection) |
| `MAX_PENDING_REQUESTS` | 400 | Maximum pending outgoing connection requests (100) reached |
| `NOT_CONNECTED` | 403 | Action requires an active connection (e.g., messaging) |
| `AI_UNAVAILABLE` | 503 | Claude API is temporarily unavailable |
| `AI_RATE_LIMITED` | 429 | Per-user daily AI feature limit exceeded |
| `FILE_TOO_LARGE` | 400 | Uploaded file exceeds size limit |
| `UNSUPPORTED_FORMAT` | 400 | Uploaded file format not accepted |
| `INTERNAL_ERROR` | 500 | Unexpected server error (details logged, not exposed) |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-20 | Architect (AI Agent) | Initial API documentation |

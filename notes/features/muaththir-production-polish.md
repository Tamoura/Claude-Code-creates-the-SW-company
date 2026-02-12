# Muaththir Production Polish

Branch: `feature/muaththir/production-polish`

## Tasks

### 1. Composite Database Indexes (P1)
- **Status**: In progress
- `Observation` model: `@@index([childId, deletedAt, dimension])` already exists. Need to add `@@index([childId, deletedAt, observedAt])`.
- `ChildMilestone` model: `@@index([childId, achieved])` exists. Need to add `@@index([childId, achieved, achievedAt])`.
- Create Prisma migration after schema changes.

### 2. Photo Upload Directory (P0)
- **Status**: In progress
- `children-photo.ts` already creates dir at request time (line 71).
- Need to ensure uploads/photos directory is created at backend startup.
- Dockerfile has `mkdir -p /app/uploads` but needs `/app/uploads/photos`.

### 3. Rate Limiting (P1)
- **Status**: Complete - all endpoints already have rate limiting.
- `/register` - 5/1min
- `/login` - 5/1min
- `/forgot-password` - 3/15min
- `/reset-password` - 5/1hour
- `/refresh` - 10/1hour
- `/demo-login` - 10/1min
- `/logout` - no rate limit but requires authentication (acceptable)

### 4. Run Tests
- After all changes, run tests to verify nothing breaks.

# Fix: Stablecoin Docker Full Stack

## Branch
`fix/stablecoin/docker-full-stack`

## Problem
The stablecoin-gateway Docker setup referenced Next.js but the
web app is actually Vite + React. Ports, env var names, and the
Dockerfile all needed updating to match the real stack.

## Changes Made
1. **Dockerfile** (apps/web/) -- rewrote from Next.js standalone
   to Vite build + nginx:alpine with SPA fallback.
2. **docker-compose.yml** -- switched web service to node:20-alpine
   dev mode (volume-mounted), fixed ports to 3104, renamed env vars
   from NEXT_PUBLIC_* to VITE_*, added prisma migrate to API start.
3. **app.ts** CORS default -- changed fallback origin from 3101 to
   3104.
4. **.env.docker** -- new file with working dev defaults.
5. **prisma/seed.ts** -- new seed script creating merchant@test.com
   with bcrypt-hashed password. Added prisma seed config to
   package.json.

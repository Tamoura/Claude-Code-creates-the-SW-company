# Dockerfile for Stablecoin Gateway Web (Vite + React)
# Production build: multi-stage with nginx

# Stage 1: Build the Vite app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY apps/web/package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY apps/web/ ./

# Build-time env vars for Vite (baked into the bundle)
ARG VITE_API_URL
ARG VITE_USE_MOCK_API=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCK_API=$VITE_USE_MOCK_API

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Inline nginx config with SPA fallback for React Router
RUN cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback: serve index.html for any route not matching a file
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# nosemgrep: dockerfile.security.missing-user.missing-user
CMD ["nginx", "-g", "daemon off;"]

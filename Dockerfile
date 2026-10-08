# syntax=docker/dockerfile:1
# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Cache dependencies layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy only frontend source files
COPY index.html tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js ./
COPY public ./public
COPY src ./src

RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["wget", "--spider", "-q", "http://localhost:80"]


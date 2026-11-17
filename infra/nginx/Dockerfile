# Reverse proxy that also serves the built frontend. Build context: repository root.
FROM node:24-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.28-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
    CMD ["sh", "-c", "wget -q -O /dev/null http://127.0.0.1/ || exit 1"]

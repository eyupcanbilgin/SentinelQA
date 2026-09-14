FROM node:24.14.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY quality-intelligence/package.json quality-intelligence/package.json
COPY quality-gate/package.json quality-gate/package.json
COPY tests/e2e/package.json tests/e2e/package.json
RUN npm ci --workspace @sentinel-qe/frontend --include-workspace-root=false
COPY frontend frontend
RUN npm run build --workspace @sentinel-qe/frontend

FROM nginx:1.29.6-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=6 CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1

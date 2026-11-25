FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 UPLOAD_DIR=/data/uploads
COPY --from=build /app ./
RUN useradd -r -u 10001 mri && mkdir -p /data/uploads && chown -R mri /data /app/.next
USER mri
EXPOSE 3000
CMD ["npm", "start"]

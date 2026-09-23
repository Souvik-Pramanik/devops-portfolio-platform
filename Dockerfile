FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ARG APP_VERSION=9.0.0
ARG GIT_SHA=local
ENV APP_VERSION=${APP_VERSION}
ENV GIT_SHA=${GIT_SHA}

COPY package*.json ./

RUN apk upgrade --no-cache \
    && npm ci --omit=dev \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY index.html ./
COPY styles.css ./
COPY script.js ./
COPY ai-config.js ./
COPY server.js ./
COPY profile-photo.png ./
COPY Souvik_Pramanik_Resume_2026.pdf ./

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
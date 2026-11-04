# Web image: export the Expo web build and serve it as static files. Login and data use the platform API.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app.config.js index.ts tsconfig.json ./
COPY plugins plugins
COPY src src
# API origin for login and data, the main site link, and the registered app ID for app-specific notices
ARG EXPO_PUBLIC_EC_API_ORIGIN=https://api.jace-s.com
ARG EXPO_PUBLIC_EC_SITE_ORIGIN=https://jace-s.com
ARG EXPO_PUBLIC_EC_NOTICE_APP_ID=
ENV EXPO_PUBLIC_EC_API_ORIGIN=${EXPO_PUBLIC_EC_API_ORIGIN} EXPO_PUBLIC_EC_SITE_ORIGIN=${EXPO_PUBLIC_EC_SITE_ORIGIN} EXPO_PUBLIC_EC_NOTICE_APP_ID=${EXPO_PUBLIC_EC_NOTICE_APP_ID}
RUN npx expo export --platform web --output-dir dist

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=80 BASE_PATH=/ STATIC_DIR=/app/dist
COPY scripts/serve-static.mjs ./serve-static.mjs
COPY --from=build /app/dist ./dist
EXPOSE 80
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "serve-static.mjs"]

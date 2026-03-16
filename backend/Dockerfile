FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json .eslintrc.cjs .prettierrc ./
COPY src ./src

# Test target — used by `docker compose run backend-test npm test`
FROM deps AS test
COPY vitest.config.ts ./
COPY tests ./tests
CMD ["npm", "test"]

# Build target — compiles TypeScript
FROM deps AS builder
RUN npm run build

# Production target — slim image with only production deps
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]

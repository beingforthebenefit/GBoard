FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Test target — used by `docker compose run frontend-test npm test`
FROM deps AS test
CMD ["npm", "test"]

# Build target — produces the Vite bundle
FROM deps AS builder
ARG VITE_SOBRIETY_DATE
ARG VITE_BACKEND_URL=http://localhost:3001
ENV VITE_SOBRIETY_DATE=$VITE_SOBRIETY_DATE
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# Production target — nginx serves the static bundle
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

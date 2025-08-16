# Frontend Dockerfile - Next.js static export
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build
RUN npm run export

FROM nginx:stable-alpine
COPY --from=build /app/out /usr/share/nginx/html
COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

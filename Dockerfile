# 1. Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .

# Accept build arguments for Supabase
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]

FROM node:22-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]

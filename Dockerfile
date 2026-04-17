FROM node:22-bookworm-slim AS build

ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    zip \
    texlive-xetex \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-lang-spanish \
    texlive-pictures \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server ./server
COPY src ./src
COPY examples ./examples
COPY .env ./.env

EXPOSE 4000

CMD ["node", "server/index.js"]

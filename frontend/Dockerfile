# Copyright © 2025 Jalapeno Labs

FROM node:23.11.1-bookworm-slim

WORKDIR /app

RUN apt update -y && apt install -y \
  build-essential

# Core
COPY frontend/package.json frontend/package.json
COPY common/package.json ./common/package.json
COPY package.json .
COPY .yarnrc.yml .
COPY yarn.config.cjs .
COPY .yarn ./.yarn
COPY yarn.lock .
COPY common/tsconfig.json ./common/tsconfig.json
COPY tsconfig.json .

# Yarn berry and install:
RUN corepack enable && corepack prepare yarn@4.9.4 --activate
RUN yarn

# Root + common
COPY common/src ./common/src
COPY global.d.ts .

# Configs
COPY frontend/index.html frontend/index.html
COPY frontend/tsconfig.json frontend/tsconfig.json
COPY frontend/vite.config.ts frontend/vite.config.ts
COPY frontend/postcss.config.cjs frontend/postcss.config.cjs
COPY frontend/tailwind.config.js frontend/tailwind.config.js

# Source
COPY frontend/public/ ./frontend/public
COPY frontend/src/ ./frontend/src/

ENV FORCE_COLOR=1

# Default command
WORKDIR /app/frontend
CMD ["yarn", "vite"]

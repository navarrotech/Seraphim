FROM node:24-bullseye

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
COPY common/package.json ./common/
COPY electron/package.json ./electron/
COPY frontend/package.json ./frontend/
COPY prisma ./prisma/

RUN corepack enable && yarn install --immutable

EXPOSE 5555

CMD [ "yarn", "prisma", "studio", "--schema", "./prisma/schema.prisma", "--port", "5555", "--hostname", "0.0.0.0" ]

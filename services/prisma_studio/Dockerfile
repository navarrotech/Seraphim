FROM node:lts-krypton

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
COPY common/package.json ./common/
COPY electron/package.json ./electron/
COPY frontend/package.json ./frontend/

RUN yarn install

COPY ./prisma.config.ts .
COPY ./prisma/ ./prisma

RUN corepack enable && yarn install --immutable

EXPOSE 5555

CMD [ "yarn", "prisma", "studio", "--config", "./prisma.config.ts", "--port", "5555" ]

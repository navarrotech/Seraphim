VERSION --try 0.8
FROM node:lts-jod
WORKDIR /app

RUN dpkg --add-architecture i386 && apt update -y && apt install -y \
  libnotify-dev libasound2-dev libcap-dev \
  libcups2-dev libxtst-dev \
  libxss1 libnss3-dev gcc-multilib g++-multilib curl \
  gperf bison python3-dbusmock dpkg fakeroot rpm \
  wine wine64 wine32:i386 mono-complete \
  xvfb xauth \
  libgtk-3-0 libnotify4 libnss3 libnspr4 \
  libasound2 libgbm1 libdrm2 libxdamage1 libxrandr2 libxfixes3 \
  libxcomposite1 libxshmfence1 libxi6 libxcursor1 libxkbcommon0 \
  libx11-6 libx11-xcb1 libxcb1 \
  libatk-bridge2.0-0 libatk1.0-0 libglib2.0-0 libpango-1.0-0 libcairo2 \
  libgdk-pixbuf2.0-0 rpm2cpio cpio
RUN ln -s /usr/bin/wine /usr/bin/wine64

COPY --dir .yarn/releases .yarn/plugins .yarn/
COPY .yarnrc.yml yarn.config.cjs .
RUN corepack enable

COPY package.json yarn.lock .
COPY electron/package.json electron/package.json
COPY frontend/package.json frontend/package.json
COPY common/package.json common/package.json
COPY scripts/postinstall.sh scripts/postinstall.sh

RUN yarn install

ARG VERSION=$(cd electron && node -p "require('./package.json').version")
ENV NODE_ENV=production
ENV DEBUG=electron-installer-*

frontend:
  COPY tsconfig.json .
  COPY --dir frontend/src frontend/public frontend/.
  COPY frontend/vite.config.ts frontend/tailwind.config.js frontend/postcss.config.cjs frontend/index.html frontend/tsconfig.json frontend/.
  COPY --dir common/src common/.
  COPY common/tsconfig.json common/.

  RUN cd frontend && yarn build
  SAVE ARTIFACT frontend/dist AS LOCAL frontend/dist

electron:
  COPY --dir electron/src electron/public electron/.
  RUN rm -rf electron/public/browser
  COPY +frontend/dist electron/public/browser

  COPY tsconfig.json .
  COPY electron/vite.config.ts electron/vite.test.config.ts electron/forge.config.ts electron/tsconfig.json electron/.

debian:
  FROM +electron

  # Compile Debian
  RUN cd electron && TARGET_MAKER=deb yarn make
  RUN cd electron/out/make/deb/x64 && mv *.deb seraphim.deb

  # Save .deb
  SAVE ARTIFACT electron/out/make/deb/x64/seraphim.deb AS LOCAL seraphim.deb

  # Save testable binary
  RUN chown root electron/out/seraphim-linux-x64/chrome-sandbox
  RUN chmod 4755 electron/out/seraphim-linux-x64/chrome-sandbox
  SAVE ARTIFACT electron/out/make/deb AS LOCAL electron/out/make/deb
  SAVE ARTIFACT electron/out/seraphim-linux-x64 AS LOCAL electron/out/seraphim-linux-x64

redhat:
  FROM +electron

  # Compile Redhat
  RUN cd electron && TARGET_MAKER=rpm yarn make
  RUN cd electron/out/make/rpm/x64 && mv *.rpm seraphim.rpm

  # Save .deb
  SAVE ARTIFACT electron/out/make/rpm/x64/seraphim.rpm AS LOCAL seraphim.rpm

  # Save testable binary
  RUN chown root electron/out/seraphim-linux-x64/chrome-sandbox
  RUN chmod 4755 electron/out/seraphim-linux-x64/chrome-sandbox
  SAVE ARTIFACT electron/out/make/rpm AS LOCAL electron/out/make/rpm
  SAVE ARTIFACT electron/out/seraphim-linux-x64 AS LOCAL electron/out/seraphim-linux-x64

windows:
  FROM +electron

  # Compile Windows
  RUN cd electron && TARGET_MAKER=windows yarn make --platform=win32 --arch=x64

  # Save Windows artifacts
  SAVE ARTIFACT electron/out/make/squirrel.windows/x64 AS LOCAL electron/out/make/squirrel.windows/x64

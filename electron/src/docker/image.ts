// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'

import {
  ACT_VERSION,
  DEFAULT_DOCKER_BASE_IMAGE,
  DOCKER_DEBIAN_PACKAGES,
  DOCKER_ALPINE_PACKAGES,
  DOCKER_WORKDIR,
  ACT_SCRIPT_NAME,
} from '@common/constants'

// const USER_GID = 1000
// const USER_UID = 1000

export function buildDockerfileContents(
  image: string = DEFAULT_DOCKER_BASE_IMAGE,
  customCommands?: string,
  setupScriptName?: string,
  validateScriptName?: string,
  workspace?: Workspace,
  gitUrl?: string,
): string {
  const normalizedImage = image.toLowerCase().trim()

  const isAlpine = isAlpineImage(normalizedImage)
  const isDebian = isDebianLikeImage(normalizedImage)
  const isNodeBased = isNodeBase(normalizedImage)

  const lines: string[] = [ `FROM ${image.trim()}` ]

  // Create user + common dirs in a way that works on the base
  if (isDebian) {
    // Debian/Ubuntu style (node:* non-alpine, python:* non-alpine, etc.)
    // lines.push(
    //   '',
    //   `# Create non-root user and set permissions`,
    //   `RUN set -eux; \\`,
    //   `    groupadd --gid "${USER_GID}" "${DOCKER_USERNAME}"; \\`,
    //   `    useradd  --uid "${USER_UID}" --gid "${USER_GID}" \\`,
    //   `            --create-home --home-dir "/home/${DOCKER_USERNAME}" \\`,
    //   `            --shell /bin/bash "${DOCKER_USERNAME}"; \\`,
    //   `    mkdir -p /app "/home/${DOCKER_USERNAME}/workspace"; \\`,
    //   `    chown -R "${USER_UID}:${USER_GID}" /app "/home/${DOCKER_USERNAME}"`,
    // )

    lines.push(
      '',
      '# Install primary build tools',
      `RUN apt-get update`,
      `RUN apt-get install -y --no-install-recommends ${DOCKER_DEBIAN_PACKAGES.join(' ')}`,
    )

    if (!isNodeBased) {
      // Note: nodejs package from nodesource includes npm in modern releases.
      lines.push(
        '',
        '# Install Node.js 24.x',
        `RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash`
          + ` && apt-get update`
          + ` && apt-get install -y --no-install-recommends nodejs`,
      )
    }
  }
  else if (isAlpine) {
    // lines.push(
    //   '',
    //   `# Create non-root user and set permissions`,
    //   `RUN set -eux; \\`,
    //   `    addgroup --gid "${USER_GID}" -S "${DOCKER_USERNAME}"; \\`,
    //   `    adduser  --uid "${USER_UID}" -S -G "${DOCKER_USERNAME}"`
    //     + ` -h "/home/${DOCKER_USERNAME}" "${DOCKER_USERNAME}"; \\`,
    //   `    mkdir -p /app "/home/${DOCKER_USERNAME}/workspace"; \\`,
    //   `    chown -R "${USER_UID}:${USER_GID}" /app "/home/${DOCKER_USERNAME}"`,
    // )

    lines.push(
      '',
      '# Install primary build tools',
      `RUN apk add --no-cache ${DOCKER_ALPINE_PACKAGES.join(' ')}`,
    )

    if (!isNodeBased) {
      lines.push(
        '',
        '# Install Node.js and npm',
        `RUN apk add --no-cache nodejs npm`,
      )
    }
  }
  else {
    console.warn('Unsupported base image for Docker build, skipping user creation')
  }

  lines.push(
    '',
    '# Setup the workspace',
    // `WORKDIR /home/${DOCKER_USERNAME}/workspace`,
    `WORKDIR ${DOCKER_WORKDIR}`,
    `RUN npm --global install @openai/codex@0.92.0 corepack`,
  )

  lines.push(
    '',
    '# Install act for GitHub Actions execution',
    `COPY ${ACT_SCRIPT_NAME} /opt/seraphim/${ACT_SCRIPT_NAME}`,
    `RUN bash /opt/seraphim/${ACT_SCRIPT_NAME} ${ACT_VERSION}`,
  )

  if (customCommands) {
    lines.push(
      '',
      '# Custom Dockerfile commands',
      customCommands?.trim(),
    )
  }

  // lines.push(
  //   '',
  //   `USER ${DOCKER_USERNAME}`,
  // )

  if (workspace?.gitUserEmail && workspace?.gitUserName) {
    lines.push(
      '',
      '# Setup git',
      `RUN git config --global user.name  "${workspace.gitUserName}" \\`,
      ` && git config --global user.email "${workspace.gitUserEmail}"`,
    )
  }

  if (gitUrl) {
    lines.push(
      '',
      '# Clone initial repository',
      `RUN git clone --recurse-submodules ${gitUrl} .`,
    )
  }

  if (setupScriptName) {
    lines.push(
      '',
      '# Run setup script',
      `COPY ${setupScriptName} /opt/seraphim/${setupScriptName}`,
      `RUN chmod +x /opt/seraphim/${setupScriptName}`,
      `ENTRYPOINT /opt/seraphim/${setupScriptName}`,
      `CMD ["bash"]`,
    )
  }
  else {
    lines.push(
      '',
      `CMD ["tail", "-f", "/dev/null"]`,
    )
  }

  if (validateScriptName) {
    lines.push(
      '',
      '# Copy the validation script',
      `COPY ${validateScriptName} /opt/seraphim/${validateScriptName}`,
      `RUN chmod +x /opt/seraphim/${validateScriptName}`,
    )
  }

  return `${lines.join('\n')}\n`
}

function isAlpineImage(image: string): boolean {
  // Most reliable: tags include "alpine" (e.g. node:20-alpine, python:3.12-alpine)
  return image.includes('alpine')
}

function isDebianLikeImage(image: string): boolean {
  // Not perfect, but good enough for the scope:
  // - official node/python images without "alpine" are Debian/Ubuntu-ish
  // - common Debian codenames
  return (
    image.includes('bookworm')
    || image.includes('bullseye')
    || image.includes('buster')
    || image.startsWith('python:')
    || isNodeBase(image)
  ) && !isAlpineImage(image)
}

function isNodeBase(image: string): boolean {
  return image.startsWith('node:')
}

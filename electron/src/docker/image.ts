// Copyright © 2026 Jalapeno Labs

import {
  ACT_VERSION,
  DEFAULT_DOCKER_BASE_IMAGE,
  DOCKER_DEBIAN_PACKAGES,
  DOCKER_WORKDIR,
  ACT_SCRIPT_NAME,
  SETUP_SCRIPT_NAME,
  VALIDATE_SCRIPT_NAME,
  BACKUP_GITHUB_CLONE_SAMPLE_URL,
} from '@common/constants'

type Options = {
  customCommands?: string,
  gitName?: string
  gitEmail?: string
}

export function buildDockerfileContents(
  gitCloneUrl: string = BACKUP_GITHUB_CLONE_SAMPLE_URL,
  options: Options = {},
): string {
  const {
    customCommands,
    gitName = 'codex',
    gitEmail = 'codex@jalapenolabs.io',
  } = options

  const lines: string[] = [
    `FROM ${DEFAULT_DOCKER_BASE_IMAGE}`,
    '',
    '# Install primary build tools',
    'RUN apt-get update',
    `RUN apt-get install -y --no-install-recommends ${DOCKER_DEBIAN_PACKAGES.join(' ')}`,
    '',
    '# Setup the workspace',
    `WORKDIR ${DOCKER_WORKDIR}`,
    'RUN npm --global install @openai/codex@0.92.0 tsx corepack',
    '',
    '# Install act for GitHub Actions execution',
    `COPY utils/${ACT_SCRIPT_NAME} /opt/seraphim/${ACT_SCRIPT_NAME}`,
    `RUN bash /opt/seraphim/${ACT_SCRIPT_NAME} ${ACT_VERSION}`,
  ]

  if (customCommands) {
    lines.push(
      '',
      '# Custom Dockerfile commands',
      customCommands.trim(),
    )
  }

  lines.push(
    '',
    '# Setup git',
    `RUN git config --global user.name  "${gitName}" \\`,
    ` && git config --global user.email "${gitEmail}"`,
    '',
    '# Clone initial repository',
    `RUN git clone --recurse-submodules ${gitCloneUrl} .`,
    '',
    '# Copy the validation script',
    `COPY ${VALIDATE_SCRIPT_NAME} /opt/seraphim/${VALIDATE_SCRIPT_NAME}`,
    `RUN chmod +x /opt/seraphim/${VALIDATE_SCRIPT_NAME}`,
    '',
    '# Run setup script',
    `COPY ${SETUP_SCRIPT_NAME} /opt/seraphim/${SETUP_SCRIPT_NAME}`,
    `RUN chmod +x /opt/seraphim/${SETUP_SCRIPT_NAME}`,
    `RUN bash /opt/seraphim/${SETUP_SCRIPT_NAME}`,
    '',
    '# Entrypoint',
    // 'CMD ["codex", "app-server"]',
    'CMD ["tail", "-f", "/dev/null"]',
  )

  return `${lines.join('\n')}\n`
}

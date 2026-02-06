// Copyright © 2026 Jalapeno Labs

import type { Workspace } from '@prisma/client'

import {
  ACT_VERSION,
  DEFAULT_DOCKER_BASE_IMAGE,
  DOCKER_DEBIAN_PACKAGES,
  DOCKER_WORKDIR,
  ACT_SCRIPT_NAME,
} from '@common/constants'

export function buildDockerfileContents(
  customCommands?: string,
  setupScriptName?: string,
  validateScriptName?: string,
  workspace?: Workspace,
  gitUrl?: string,
): string {
  const lines: string[] = [ `FROM ${DEFAULT_DOCKER_BASE_IMAGE}` ]

  lines.push(
    '',
    '# Install primary build tools',
    'RUN apt-get update',
    `RUN apt-get install -y --no-install-recommends ${DOCKER_DEBIAN_PACKAGES.join(' ')}`,
  )

  lines.push(
    '',
    '# Setup the workspace',
    `WORKDIR ${DOCKER_WORKDIR}`,
    'RUN npm --global install @openai/codex@0.92.0 corepack',
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
      customCommands.trim(),
    )
  }

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
      'CMD ["bash"]',
    )
  }
  else {
    lines.push(
      '',
      'CMD ["tail", "-f", "/dev/null"]',
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

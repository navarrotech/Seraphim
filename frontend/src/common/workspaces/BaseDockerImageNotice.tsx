// Copyright © 2026 Jalapeno Labs

// Misc
import { DEFAULT_DOCKER_BASE_IMAGE } from '@common/constants'

export function BaseDockerImageNotice() {
  return <div className='relaxed'>
    <p className='opacity-80'>
      Workspace builds always start from our default base image:
    </p>
    <p className='font-mono text-sm break-all'>
      {DEFAULT_DOCKER_BASE_IMAGE}
    </p>
    <p className='opacity-80'>
      Your custom Dockerfile commands are appended after this base image so you can layer project-specific tools on top.
    </p>
  </div>
}

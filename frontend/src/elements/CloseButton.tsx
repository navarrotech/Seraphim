// Copyright © 2026 Jalapeno Labs

// UI
import { Tooltip } from '@heroui/react'
import { CloseIcon } from './graphics/IconNexus'

type Props = {
  isDisabled?: boolean
  onClose: () => void
}

export function CloseButton(props: Props) {
  return <Tooltip content='Close'>
    <div
      className='cursor-pointer p-0.5 opacity-80 hover:opacity-100'
      onClick={() => !props.isDisabled && props.onClose()}
    >
      <CloseIcon size={28} />
    </div>
  </Tooltip>
}

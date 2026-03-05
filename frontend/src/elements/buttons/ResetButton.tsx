// Copyright © 2026 Jalapeno Labs

// UI
import { Button, Tooltip } from '@heroui/react'
import { ResetIcon } from '@frontend/elements/graphics/IconNexus'

type Props = {
  isDirty?: boolean
  isDisabled?: boolean
  onReset: () => void
}

export function ResetButton(props: Props) {
  return <Tooltip content='Undo your unsaved changes'>
    <Button
      id='reset'
      color='secondary'
      isDisabled={!props.isDirty || props.isDisabled}
      onPress={() => props.onReset()}
    >
      <span className='icon'>
        <ResetIcon />
      </span>
      <span>Reset</span>
    </Button>
  </Tooltip>
}

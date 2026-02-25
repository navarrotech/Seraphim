// Copyright © 2026 Jalapeno Labs

// UI
import { Button, Tooltip } from '@heroui/react'

type Props = {
  isDirty?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  onSave: () => void
}

export function SaveButton(props: Props) {
  let tooltip = 'Save your changes'
  if (props.isLoading) {
    tooltip = 'Saving changes...'
  }
  else if (props.isDisabled) {
    tooltip = 'Cannot save until issues are resolved'
  }
  else if (!props.isDirty) {
    tooltip = 'No unsaved changes to save'
  }

  return <Tooltip content={tooltip}>
    <div>
      <Button
        id='save'
        color='primary'
        isLoading={props.isLoading}
        isDisabled={!props.isDirty || props.isDisabled}
        onPress={() => props.onSave()}
      >
        <span>Save</span>
      </Button>
    </div>
  </Tooltip>
}

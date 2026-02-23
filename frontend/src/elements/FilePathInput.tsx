// Copyright © 2026 Jalapeno Labs

import { FileFilter } from '@common/types'
import type { InputProps } from '@heroui/react'

// UI
import { Input, Tooltip } from '@heroui/react'
import { FaRegFolderOpen } from 'react-icons/fa'

type Props = InputProps & {
  pickType?: 'file' | 'directory',
  filters?: FileFilter[],
}

export function FilePathInput(props: Props) {
  const { pickType = 'directory', ...inputProps } = props

  const isDirectory = pickType === 'directory'

  return <Input
    endContent={<Tooltip content='Open file browser'>
      <div
        className='self-center cursor-pointer p-2 rounded-md bg-gray-50/10 hover:bg-gray-50/20'
        onClick={async () => {
          if (props.isDisabled) {
            return
          }

          const properties: Array<'openFile' | 'openDirectory' | 'createDirectory' | 'showHiddenFiles'> = [
            isDirectory ? 'openDirectory' : 'openFile',
            'showHiddenFiles',
          ]

          if (isDirectory) {
            properties.push('createDirectory')
          }

          const files = await window?.config?.openDialog({
            properties,
            filters: props.filters,
          })

          if (
            !files?.length
            || !props?.onValueChange
          ) {
            return
          }

          const [ destination ] = files

          if (props.onValueChange) {
            props.onValueChange(destination)
          }
        }}
      >
        <FaRegFolderOpen />
      </div>
    </Tooltip>}
    { ...inputProps }
  />
}

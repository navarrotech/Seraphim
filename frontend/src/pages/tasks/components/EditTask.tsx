// Copyright © 2026 Jalapeno Labs

import type { TaskWithFullContext } from '@common/types'

type Props = {
  task: TaskWithFullContext
}

export function EditTask(props: Props) {
  console.log(props)
  return <article className='relaxed'>
    <header className='compact level'>
      <div className='level-left'>
        <h1 className='text-2xl font-bold'>{props.task.name || 'Untitled Task'}</h1>
      </div>
    </header>
  </article>
}

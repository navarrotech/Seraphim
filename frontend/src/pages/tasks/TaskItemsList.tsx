// Copyright © 2026 Jalapeno Labs

import type { Task } from '@common/types'

// User Interface
import { Card } from '@frontend/elements/Card'
import { TaskListItem } from './TaskListItem'

type Props = {
  tasks: Task[]
  onSelectTask: (task: Task) => void
}

export function TaskItemsList(props: Props) {
  return <Card>
    <ul className='w-full'>{
      props.tasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          onSelect={props.onSelectTask}
        />
      ))
    }</ul>
  </Card>
}

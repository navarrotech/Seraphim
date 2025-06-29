// Copyright © 2025 Jalapeno Labs

// Core
import { osToast } from '../main/notify'

// Redux
import { dispatch } from '../lib/redux-store'
import { jobActions } from '../jobReducer'

export function cancelLastCommand() {
  dispatch(
    jobActions.cancelJob()
  )
  osToast({
    title: 'Seraphim Agent',
    body: 'Your last command has been cancelled.'
  })
}

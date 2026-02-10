// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect } from 'react'
import useSWR from 'swr'

// Redux
import { dispatch } from '@frontend/framework/store'

export function useInitialData<Shape>(
  cacheKey: string,
  fetcher: () => Promise<Shape>,
  dispatchAction: (reduxDispatch: typeof dispatch, data: Shape) => void,
) {
  const query = useSWR(cacheKey, fetcher)

  useEffect(() => {
    if (!query.data) {
      return
    }

    if (query.error) {
      console.error(`Error fetching initial data for ${cacheKey}`, query.error)
      return
    }

    dispatchAction(dispatch, query.data)
  }, [ query.data ])

  return {
    isLoading: query.isLoading,
    error: query.error,
  } as const
}

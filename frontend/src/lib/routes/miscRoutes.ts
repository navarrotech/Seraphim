// Copyright Ac 2026 Jalapeno Labs

// Lib
import ky from 'ky'

// Misc
import { getApiRoot } from '../api'

export function pingApi() {
  const apiRoot = getApiRoot()

  return ky
    .get(`${apiRoot}/ping`)
    .text()
}

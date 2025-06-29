// Copyright © 2025 Jalapeno Labs

export const NODE_ENV: string = import.meta.env.NODE_ENV || 'development'
export const IS_DEV = NODE_ENV === 'development'
export const IS_PROD = NODE_ENV === 'production'

console.debug('Running in', NODE_ENV, 'mode')

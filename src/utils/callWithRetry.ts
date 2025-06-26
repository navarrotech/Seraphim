// Copyright © 2025 Jalapeno Labs

export async function callWithRetry<Type>(
  fn: () => Promise<Type>,
  retries: number = 3
): Promise<Type> {
  try {
    return await fn()
  }
  catch (error) {
    if (retries <= 0) {
      throw error
    }
    console.warn(`retrying… (${retries} left)`)
    return callWithRetry(fn, retries - 1)
  }
}

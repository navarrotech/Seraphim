// Copyright © 2026 Jalapeno Labs

/**
 * Creates an interval that ensures the callback does not overlap if it takes longer
 * than the specified interval. Subsequent ticks are dropped until the previous
 * callback completes.
 *
 * @param {function(): Promise.<void>} callback A function that returns a Promise<void> and is invoked each tick
 * @param {number} intervalMs The time in milliseconds between each tick
 * @return {NodeJS.Timeout} The timer identifier returned by setInterval
 */
export function singleThreadedInterval(
  callback: () => Promise<void>,
  intervalMs: number,
): NodeJS.Timeout {
  let loopIsBusy = false

  // Prevents overlapping calls to the callback function.
  // This is so we don't start a new interval if the previous one is still running.
  // It is dangerous in that it will drop calls to the callback if they take longer than the interval.
  return setInterval(async () => {
    if (loopIsBusy) {
      return
    }
    loopIsBusy = true

    await callback()

    loopIsBusy = false
  }, intervalMs)
}

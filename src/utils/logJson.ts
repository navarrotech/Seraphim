// Copyright © 2025 Jalapeno Labs

import chalk from 'chalk'

// It should use chalk to format the keys as green and the values as blue
// The commas, colons, quotes, and braces should not be white
export function logJson<Type extends object>(data: Type, returnOnly?: boolean): string {
  // convert the object to a pretty-printed JSON string
  const jsonString = JSON.stringify(data, null, 2)

  // colorize all JSON keys (the "foo" in "foo":) in green
  const keyColored = jsonString.replace(
    /"([^"]+)"(?=\s*:)/g,
    (match) => chalk.green(match)
  )

  // colorize string values (the "bar" in : "bar") in blue
  const stringValueColored = keyColored.replace(
    /:\s*"([^"]*)"/g,
    (_match, p1) => ': ' + chalk.blue(`"${p1}"`)
  )

  // colorize numbers, booleans, and null in blue as well
  const valueColored = stringValueColored.replace(
    /:\s*(\d+|true|false|null)/gi,
    (_match, p1) => ': ' + chalk.blue(p1)
  )

  if (!returnOnly) {
    // output the result; punctuation (braces, commas, quotes, colons) remains uncolored
    console.log(valueColored)
  }

  return valueColored
}

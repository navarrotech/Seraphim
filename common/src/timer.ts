// Copyright © 2026 Jalapeno Labs

import humanizeDuration from 'humanize-duration'

export class Timer {
  private name: string
  private startTime: number
  private endTime: number

  constructor(name: string = 'Timer') {
    this.startTime = Date.now()
    this.name = name

    this.getElapsedTime = this.getElapsedTime.bind(this)
    this.stop = this.stop.bind(this)
    this.print = this.print.bind(this)
  }

  public stop(): void {
    this.endTime = Date.now()
    this.print()
  }

  public getElapsedTime(): number {
    if (this.endTime) {
      return this.endTime - this.startTime
    }
    return Date.now() - this.startTime
  }

  public format(): string {
    const elapsed = this.getElapsedTime()
    return `${this.name} took ${humanizeDuration(elapsed)}`
  }

  public print(): string {
    const formatted = this.format()
    console.log(formatted)
    return formatted
  }
}

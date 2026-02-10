// Copyright © 2026 Jalapeno Labs

import { Cloner } from './cloner'

export class GithubCloner extends Cloner {
  public getCloneUrl(): string {
    if (this.token) {
      return `https://x-access-token:${this.token}@github.com/${this.sourceRepoUrl}.git`
    }

    return `https://github.com/${this.sourceRepoUrl}.git`
  }
}

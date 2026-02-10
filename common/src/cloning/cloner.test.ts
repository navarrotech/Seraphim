// Copyright Â© 2026 Jalapeno Labs

// Core
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Lib to test
import { Cloner } from './cloner.js'

class TestCloner extends Cloner {
  public getOrgName() {
    return this.orgName
  }

  public getRepoName() {
    return this.repoName
  }
}

describe('Cloner', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
  })

  afterEach(() => {
    debugSpy.mockRestore()
  })

  describe('constructor parsing', () => {
    it('parses scp style SSH URLs with colon separators', () => {
      const cloner = new TestCloner('git@github.com:navarrotech/Seraphim.git')

      expect(cloner.getOrgName()).toBe('navarrotech')
      expect(cloner.getRepoName()).toBe('Seraphim')
    })

    it('parses scp style SSH URLs with slash separators', () => {
      const cloner = new TestCloner('git@github.com/navarrotech/Seraphim.git')

      expect(cloner.getOrgName()).toBe('navarrotech')
      expect(cloner.getRepoName()).toBe('Seraphim')
    })

    it('parses ssh protocol URLs', () => {
      const cloner = new TestCloner('ssh://git@github.com/navarrotech/Seraphim.git')

      expect(cloner.getOrgName()).toBe('navarrotech')
      expect(cloner.getRepoName()).toBe('Seraphim')
    })

    it('parses https URLs with trimming', () => {
      const cloner = new TestCloner('  https://github.com/navarrotech/Seraphim.git  ')

      expect(cloner.getOrgName()).toBe('navarrotech')
      expect(cloner.getRepoName()).toBe('Seraphim')
    })

    it('logs and keeps names empty when owner or repo is missing', () => {
      const cloner = new TestCloner('https://github.com/navarrotech')

      expect(cloner.getOrgName()).toBeUndefined()
      expect(cloner.getRepoName()).toBeUndefined()
      expect(debugSpy).toHaveBeenCalledWith(
        'Repository URL/path missing owner or repo',
        { repository: 'https://github.com/navarrotech' },
      )
    })

    it('logs and keeps names empty when the host is unsupported', () => {
      const cloner = new TestCloner('https://gitlab.com/navarrotech/Seraphim.git')

      expect(cloner.getOrgName()).toBeUndefined()
      expect(cloner.getRepoName()).toBeUndefined()
      expect(debugSpy).toHaveBeenCalledWith(
        'Unsupported git host',
        { repository: 'https://gitlab.com/navarrotech/Seraphim.git', host: 'gitlab.com' },
      )
    })

    it('logs and keeps names empty when the URL does not match supported formats', () => {
      const cloner = new TestCloner('local-path')

      expect(cloner.getOrgName()).toBeUndefined()
      expect(cloner.getRepoName()).toBeUndefined()
      expect(debugSpy).toHaveBeenCalledWith(
        'Received unsupported repository URL (don\'t know how to format it)',
        { repository: 'local-path' },
      )
    })

    it('parses owner and repo from a generic owner/repo input', () => {
      const cloner = new TestCloner('navarrotech/Seraphim')

      expect(cloner.getOrgName()).toBe('navarrotech')
      expect(cloner.getRepoName()).toBe('Seraphim')
      expect(debugSpy).not.toHaveBeenCalledWith(
        'Received unsupported repository URL (don\'t know how to format it)',
        { repository: 'navarrotech/Seraphim' },
      )
    })
  })

  describe('getCloneUrl', () => {
    it('returns the trimmed source URL', () => {
      const cloner = new TestCloner('  git@github.com:navarrotech/Seraphim.git  ')

      expect(cloner.getCloneUrl()).toBe('git@github.com:navarrotech/Seraphim.git')
    })
  })
})

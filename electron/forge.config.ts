// Copyright © 2025 Jalapeno Labs

/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

// Core
import { VitePlugin } from '@electron-forge/plugin-vite'

// Typescript
import type { ForgeConfig, ForgeConfigMaker } from '@electron-forge/shared-types'

// Fuses
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'

// Makers
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'

const windowsMaker = new MakerSquirrel({})
const redhatMaker = new MakerRpm({})
const debMaker = new MakerDeb({})

const makers: ForgeConfigMaker[] = []
switch (process.env.TARGET_MAKER) {
  case 'windows':
    makers.push(windowsMaker)
    break
  case 'rpm':
    makers.push(redhatMaker)
    break
  case 'deb':
    makers.push(debMaker)
    break
  default:
    console.log('No TARGET_MAKER environment variable set, using all makers.')
    makers.push(
      windowsMaker,
      redhatMaker,
      debMaker
    )
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'electron',
  },
  makers,
  rebuildConfig: {},
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.config.ts',
          target: 'preload',
        }
      ],
      renderer: [],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: true,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    }),
  ],
}

export default config

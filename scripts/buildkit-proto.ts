#!/usr/bin/env node

// Copyright © 2026 Jalapeno Labs

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import https from 'node:https'
import { spawn } from 'node:child_process'
import { x as extractTar } from 'tar'

const BUILDKIT_VERSION = process.env.BUILDKIT_VERSION ?? 'v0.27.0'

// Everything lives under here
const ROOT_DIR = path.resolve('common/src/vendor/buildkit')
const PROTO_DIR = path.join(ROOT_DIR, 'proto')
const GEN_DIR = path.join(ROOT_DIR, 'gen')

// google-proto-files provides google/protobuf/*.proto (timestamp.proto etc)
const GOOGLE_PROTO_ROOT = path.resolve('node_modules/google-proto-files')

// ts-proto plugin path (windows has .cmd)
const TS_PROTO_PLUGIN = path.resolve(
  process.platform === 'win32'
    ? 'node_modules/.bin/protoc-gen-ts_proto.cmd'
    : 'node_modules/.bin/protoc-gen-ts_proto',
)
const PROTOC_BIN = path.resolve(
  process.platform === 'win32'
    ? 'node_modules/.bin/protoc.cmd'
    : 'node_modules/.bin/protoc',
)

const TS_PROTO_OPTS
  = 'esModuleInterop=true,'
  + 'outputEncodeMethods=true,'
  + 'outputJsonMethods=false,'
  + 'outputClientImpl=false,'
  + 'env=node'

// BuildKit source tarball
const TARBALL_URL = `https://github.com/moby/buildkit/archive/refs/tags/${BUILDKIT_VERSION}.tar.gz`

function exists(p: string): boolean {
  try {
    fs.accessSync(p)
    return true
  }
 catch {
    return false
  }
}

async function rmrf(p: string) {
  await fsp.rm(p, { recursive: true, force: true })
}

async function mkdirp(p: string) {
  await fsp.mkdir(p, { recursive: true })
}

function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; shell?: boolean } = {},
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: opts.shell ?? false,
      ...opts,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      }
      else {
        reject(new Error(`${cmd} exited with code ${code}`))
      }
    })
  })
}

function downloadToFile(url: string, outPath: string) {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(outPath)
    https
      .get(url, (res) => {
        // Follow redirects
        if (
          res.statusCode
          && res.statusCode >= 300
          && res.statusCode < 400
          && res.headers.location
        ) {
          file.close()
          try {
            fs.unlinkSync(outPath)
          }
          catch {}
          resolve(downloadToFile(res.headers.location, outPath))
          return
        }

        if (res.statusCode !== 200) {
          reject(
            new Error(`Download failed: ${url} (status ${res.statusCode})`),
          )
          return
        }

        res.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
      })
      .on('error', (err) => {
        try {
          file.close()
        }
        catch {}
        reject(err)
      })
  })
}

/**
 * Copy only *.proto files from srcDir into dstDir (non-recursive).
 * The specific BuildKit directories we copy are flat enough for this.
 */
async function copyProtosFlat(srcDir: string, dstDir: string) {
  await mkdirp(dstDir)
  const entries = await fsp.readdir(srcDir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.proto')) {
      await fsp.copyFile(path.join(srcDir, e.name), path.join(dstDir, e.name))
    }
  }
}

async function main() {
  console.log(`Vendoring BuildKit protos @ ${BUILDKIT_VERSION}...`)
  console.log(`  proto -> ${PROTO_DIR}`)
  console.log(`  gen   -> ${GEN_DIR}`)

  // Checks
  if (!exists(TS_PROTO_PLUGIN)) {
    throw new Error(
      `ts-proto plugin not found at:\n  ${TS_PROTO_PLUGIN}\n`
        + `Install deps:\n  yarn add -D tsx ts-proto protobufjs google-proto-files tar`,
    )
  }
  if (!exists(PROTOC_BIN)) {
    throw new Error(
      `protoc binary not found at:\n  ${PROTOC_BIN}\n`
        + 'Install deps:\n  yarn add -D protoc',
    )
  }
  if (!exists(path.join(GOOGLE_PROTO_ROOT, 'google/protobuf'))) {
    throw new Error(
      `google-proto-files not found at:\n  ${GOOGLE_PROTO_ROOT}\n`
        + `Install:\n  yarn add -D google-proto-files`,
    )
  }

  // Clean start (your requirement)
  await rmrf(PROTO_DIR)
  await rmrf(GEN_DIR)
  await mkdirp(PROTO_DIR)
  await mkdirp(GEN_DIR)

  // Temp area
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'buildkit-proto-'))
  const tarPath = path.join(tmp, `buildkit-${BUILDKIT_VERSION}.tar.gz`)
  const extractDir = path.join(tmp, 'src')

  try {
    await mkdirp(extractDir)

    console.log(`Downloading ${TARBALL_URL}`)
    await downloadToFile(TARBALL_URL, tarPath)

    console.log('Extracting tarball...')
    await extractTar({ file: tarPath, cwd: extractDir })

    // Find extracted folder "buildkit-*"
    const dirs = await fsp.readdir(extractDir, { withFileTypes: true })
    const extracted = dirs.find(
      (d) => d.isDirectory() && d.name.startsWith('buildkit-'),
    )?.name

    if (!extracted) {
      throw new Error(`Could not find extracted buildkit-* folder under ${extractDir}`)
    }

    const buildkitSrc = path.join(extractDir, extracted)

    // MUST match the import paths in control.proto:
    // import "github.com/moby/buildkit/..."
    const bkVendorBase = path.join(PROTO_DIR, 'github.com/moby/buildkit')
    await mkdirp(bkVendorBase)

    // Copy proto directories needed by control.proto (+ its referenced types)
    // If you ever see "File not found" for another import, add its directory here.
    const buildkitProtoDirs = [
      'api/services/control',
      'api/types',
      'solver/pb',
      'sourcepolicy/pb',
    ] as const

    for (const d of buildkitProtoDirs) {
      const src = path.join(buildkitSrc, d)
      const dst = path.join(bkVendorBase, d)
      if (!exists(src)) {
        throw new Error(`Expected directory not found in BuildKit source: ${src}`)
      }
      await copyProtosFlat(src, dst)
    }

    // Vendor gogo.proto: import "gogoproto/gogo.proto"
    const gogoDir = path.join(PROTO_DIR, 'gogoproto')
    await mkdirp(gogoDir)

    console.log('Downloading gogoproto/gogo.proto...')
    await downloadToFile(
      'https://raw.githubusercontent.com/gogo/protobuf/master/gogoproto/gogo.proto',
      path.join(gogoDir, 'gogo.proto'),
    )

    const controlProto = path.join(
      bkVendorBase,
      'api/services/control/control.proto',
    )

    if (!exists(controlProto)) {
      throw new Error(`control.proto not found at ${controlProto}`)
    }

    console.log('Generating TypeScript via protoc + ts-proto...')

    // protoc will find:
    // - github.com/moby/buildkit/... via -I PROTO_DIR
    // - gogoproto/gogo.proto via -I PROTO_DIR
    // - google/protobuf/*.proto via -I GOOGLE_PROTO_ROOT
    await run(PROTOC_BIN, [
      '-I',
      PROTO_DIR,
      '-I',
      GOOGLE_PROTO_ROOT,
      `--plugin=protoc-gen-ts_proto=${TS_PROTO_PLUGIN}`,
      `--ts_proto_out=${GEN_DIR}`,
      `--ts_proto_opt=${TS_PROTO_OPTS}`,
      controlProto,
    ], {
      shell: process.platform === 'win32',
    })

    console.log('Done.')
  }
 finally {
    // best-effort temp cleanup
    try {
      await rmrf(tmp)
    }
 catch {}
  }
}

main().catch((err) => {
  console.error('ERROR:', err?.message ?? err)
  process.exit(1)
})

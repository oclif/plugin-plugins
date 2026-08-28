import {expect} from 'chai'
import {chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {spawn} from '../src/spawn.js'

describe('spawn', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'spawn-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, {force: true, recursive: true})
  })

  it('should invoke .js module paths via process.execPath', async () => {
    const script = path.join(tempDir, 'test-script.js')
    writeFileSync(script, '#!/usr/bin/env nonexistent-node-binary\nconsole.log("spawned-ok")\n')
    chmodSync(script, '755')

    const result = await spawn(script, [], {cwd: tempDir, logLevel: 'silent'})

    expect(result.stdout).to.include('spawned-ok')
  })

  it('should pass args after the .js module path', async () => {
    const script = path.join(tempDir, 'echo-args.js')
    writeFileSync(script, 'console.log(JSON.stringify(process.argv.slice(2)))\n')
    chmodSync(script, '755')

    const result = await spawn(script, ['--flag', 'value'], {cwd: tempDir, logLevel: 'silent'})

    expect(result.stdout).to.include('["--flag","value"]')
  })

  it('should handle .js module paths with spaces in the path', async () => {
    const dir = path.join(tempDir, 'dir with spaces')
    mkdirSync(dir)
    const script = path.join(dir, 'my script.js')
    writeFileSync(script, 'console.log("spaces-ok")\n')
    chmodSync(script, '755')

    const result = await spawn(script, [], {cwd: tempDir, logLevel: 'silent'})

    expect(result.stdout).to.include('spaces-ok')
  })

  it('should handle process.execPath containing spaces', async function () {
    if (process.platform === 'win32') return this.skip()
    const nodeDir = path.join(tempDir, 'path with spaces', 'bin')
    mkdirSync(nodeDir, {recursive: true})
    const nodeLink = path.join(nodeDir, 'node')
    symlinkSync(process.execPath, nodeLink)

    const script = path.join(tempDir, 'exec-path-test.js')
    writeFileSync(script, 'console.log("execpath-ok")\n')
    chmodSync(script, '755')

    const originalExecPath = process.execPath
    try {
      Object.defineProperty(process, 'execPath', {configurable: true, value: nodeLink, writable: true})
      const result = await spawn(script, [], {cwd: tempDir, logLevel: 'silent'})
      expect(result.stdout).to.include('execpath-ok')
    } finally {
      Object.defineProperty(process, 'execPath', {configurable: true, value: originalExecPath, writable: true})
    }
  })

  it('must use windowsVerbatimArguments to prevent argument injection (security)', () => {
    const spawnSrc = readFileSync(
      // eslint-disable-next-line unicorn/max-nested-calls
      path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'spawn.ts'),
      'utf8',
    )
    expect(spawnSrc).to.include('windowsVerbatimArguments: true')
  })

  it('should not interpret shell metacharacters in arguments', async () => {
    const script = path.join(tempDir, 'echo-args.js')
    writeFileSync(script, 'console.log(JSON.stringify(process.argv.slice(2)))\n')
    chmodSync(script, '755')

    const result = await spawn(script, ['$(whoami)', '`whoami`', '%PATH%', '|calc.exe'], {
      cwd: tempDir,
      logLevel: 'silent',
    })
    const output = result.stdout.join(' ')

    expect(output).to.include('$(whoami)')
    expect(output).to.include('`whoami`')
    expect(output).to.include('%PATH%')
    expect(output).to.include('|calc.exe')
  })

  it('should not modify non-.js module paths', async function () {
    if (process.platform === 'win32') return this.skip()
    const script = path.join(tempDir, 'test-bin')
    writeFileSync(script, `#!/usr/bin/env bash\necho "bin-ok"\n`)
    chmodSync(script, '755')

    const result = await spawn(script, [], {cwd: tempDir, logLevel: 'silent'})

    expect(result.stdout).to.include('bin-ok')
  })
})

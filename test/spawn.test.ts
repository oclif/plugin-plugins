import {expect} from 'chai'
import {chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {spawn} from '../src/spawn.js'

describe('spawn', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'spawn-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, {force: true, recursive: true})
  })

  it('should invoke .js module paths via process.execPath', async () => {
    const script = join(tempDir, 'test-script.js')
    writeFileSync(script, '#!/usr/bin/env nonexistent-node-binary\nconsole.log("spawned-ok")\n')
    chmodSync(script, '755')

    const result = await spawn(script, [], {cwd: tempDir, logLevel: 'silent'})

    expect(result.stdout).to.include('spawned-ok')
  })

  it('should pass args after the .js module path', async () => {
    const script = join(tempDir, 'echo-args.js')
    writeFileSync(script, 'console.log(JSON.stringify(process.argv.slice(2)))\n')
    chmodSync(script, '755')

    const result = await spawn(script, ['--flag', 'value'], {cwd: tempDir, logLevel: 'silent'})

    expect(result.stdout).to.include('["--flag","value"]')
  })

  it('should handle .js module paths with spaces in the path', async () => {
    const dir = join(tempDir, 'dir with spaces')
    mkdirSync(dir)
    const script = join(dir, 'my script.js')
    writeFileSync(script, 'console.log("spaces-ok")\n')
    chmodSync(script, '755')

    const result = await spawn(script, [], {cwd: tempDir, logLevel: 'silent'})

    expect(result.stdout).to.include('spaces-ok')
  })

  it('should not modify non-.js module paths', async () => {
    const script = join(tempDir, 'test-bin')
    writeFileSync(script, `#!/usr/bin/env bash\necho "bin-ok"\n`)
    chmodSync(script, '755')

    const result = await spawn(script, [], {cwd: tempDir, logLevel: 'silent'})

    expect(result.stdout).to.include('bin-ok')
  })
})

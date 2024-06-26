import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {exec as cpExec} from 'node:child_process'
import {rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

async function exec(cmd: string, opts?: {cwd?: string}) {
  return new Promise((resolve, reject) => {
    cpExec(cmd, opts, (err, stdout, stderr) => {
      if (err) return reject(err)
      resolve({code: 0, stderr, stdout})
    })
  })
}

describe('link/unlink integration tests', () => {
  const cacheDir = join(tmpdir(), 'plugin-plugins-tests', 'cache')
  const configDir = join(tmpdir(), 'plugin-plugins-tests', 'config')
  const dataDir = join(tmpdir(), 'plugin-plugins-tests', 'data')
  const pluginDir = join(tmpdir(), 'plugin-plugins-tests', 'plugin')
  const repo = 'https://github.com/oclif/plugin-test-esm-1.git'

  before(async () => {
    try {
      // no need to clear out directories in CI since they'll always be empty
      if (!process.env.CI) {
        await Promise.all([
          rm(cacheDir, {force: true, recursive: true}),
          rm(configDir, {force: true, recursive: true}),
          rm(dataDir, {force: true, recursive: true}),
          rm(pluginDir, {force: true, recursive: true}),
        ])
      }
    } catch {}

    await exec(`git clone ${repo} ${pluginDir} --depth 1`)
    await exec('yarn', {cwd: pluginDir})
    await exec('yarn build', {cwd: pluginDir})
  })

  beforeEach(() => {
    process.env.MYCLI_CACHE_DIR = cacheDir
    process.env.MYCLI_CONFIG_DIR = configDir
    process.env.MYCLI_DATA_DIR = dataDir
  })

  afterEach(() => {
    delete process.env.MYCLI_CACHE_DIR
    delete process.env.MYCLI_CONFIG_DIR
    delete process.env.MYCLI_DATA_DIR
  })

  it('should return "No Plugins" if no plugins are linked', async () => {
    const {stdout} = await runCommand('plugins')
    expect(stdout).to.contain('No plugins installed.\n')
  })

  it('should link plugin', async () => {
    await runCommand(`plugins link ${pluginDir} --no-install`)
    const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
    expect(stdout).to.include('test-esm-1')
    expect(result?.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
  })

  it('should unlink plugin', async () => {
    await runCommand(`plugins unlink ${pluginDir}`)
    const {stdout} = await runCommand<Array<{name: string}>>('plugins')
    expect(stdout).to.contain('No plugins installed.\n')
  })
})

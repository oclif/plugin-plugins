import {expect} from 'chai'
import chalk from 'chalk'
import {exec as cpExec} from 'node:child_process'
import {mkdir, rm, writeFile} from 'node:fs/promises'
import {join, resolve} from 'node:path'

async function exec(command: string): Promise<{code: number; stderr: string; stdout: string}> {
  return new Promise((resolve, reject) => {
    cpExec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({code: 0, stderr, stdout})
      }
    })
  })
}

async function ensureSfExists(): Promise<boolean> {
  try {
    const {stdout} = await exec('sf --version')
    console.log('sf version:', chalk.dim(stdout.trim()))
    return true
  } catch {
    return false
  }
}

describe('sf Integration', () => {
  before(async () => {
    await ensureSfExists()

    const tmp = resolve('tmp', 'sf-integration')
    process.env.SF_DATA_DIR = join(tmp, 'data')
    process.env.SF_CACHE_DIR = join(tmp, 'cache')
    process.env.SF_CONFIG_DIR = join(tmp, 'config')

    console.log('process.env.SF_DATA_DIR:', chalk.dim(process.env.SF_DATA_DIR))
    console.log('process.env.SF_CACHE_DIR:', chalk.dim(process.env.SF_CACHE_DIR))
    console.log('process.env.SF_CONFIG_DIR:', chalk.dim(process.env.SF_CONFIG_DIR))

    try {
      // no need to clear out directories in CI since they'll always be empty
      if (!process.env.CI) {
        await Promise.all([
          rm(process.env.SF_DATA_DIR, {force: true, recursive: true}),
          rm(process.env.SF_CACHE_DIR, {force: true, recursive: true}),
          rm(process.env.SF_CONFIG_DIR, {force: true, recursive: true}),
        ])
      }
    } catch {}

    await exec('sf plugins link --no-install')
    const {stdout} = await exec('sf plugins --core')
    expect(stdout).to.contain('@oclif/plugin-plugins')
    expect(stdout).to.contain(`(link) ${process.cwd()}`)

    await mkdir(process.env.SF_CONFIG_DIR, {recursive: true})
    const allowList = join(process.env.SF_CONFIG_DIR, 'unsignedPluginAllowList.json')
    await writeFile(allowList, JSON.stringify(['@oclif/plugin-version', '@oclif/plugin-help']))
  })

  it('should install plugin with npm-shrinkwrap.json', async () => {
    const result = await exec('sf plugins install @oclif/plugin-version@2.0.10-dev.2')
    expect(result.code).to.equal(0)

    const inspectResult = await exec('sf plugins inspect @oclif/plugin-version --json')
    const [plugin] = JSON.parse(inspectResult.stdout)

    const expected = {
      '@oclif/core': {from: '^3.14.1', version: '3.14.1'},
    }

    expect(plugin.deps).to.deep.equal(expected)
  })

  it('should keep locked deps despite other plugin installs', async () => {
    const result = await exec('sf plugins install @oclif/plugin-help')
    expect(result.code).to.equal(0)

    const inspectResult = await exec('sf plugins inspect @oclif/plugin-version --json')
    const [plugin] = JSON.parse(inspectResult.stdout)

    const expected = {
      '@oclif/core': {from: '^3.14.1', version: '3.14.1'},
    }

    expect(plugin.deps).to.deep.equal(expected)
  })
})

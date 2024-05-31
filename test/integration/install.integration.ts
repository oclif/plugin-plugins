import {runCommand} from '@oclif/test'
import {dim} from 'ansis'
import {expect} from 'chai'
import {rm} from 'node:fs/promises'
import {join, resolve} from 'node:path'

describe('install/uninstall integration tests', () => {
  const plugin = '@oclif/plugin-version'
  const pluginShortName = 'version'
  const pluginGithubSlug = 'oclif/plugin-version'
  const pluginGithubUrl = 'https://github.com/oclif/plugin-version.git'

  const tmp = resolve('tmp', 'install-integration')
  const cacheDir = join(tmp, 'plugin-plugins-tests', 'cache')
  const configDir = join(tmp, 'plugin-plugins-tests', 'config')
  const dataDir = join(tmp, 'plugin-plugins-tests', 'data')

  console.log('process.env.MYCLI_DATA_DIR:', dim(dataDir))
  console.log('process.env.MYCLI_CACHE_DIR:', dim(cacheDir))
  console.log('process.env.MYCLI_CONFIG_DIR:', dim(configDir))
  console.log('process.env.NODE_ENV:', dim(process.env.NODE_ENV ?? 'not set'))

  before(async () => {
    try {
      // no need to clear out directories in CI since they'll always be empty
      if (!process.env.CI) {
        await Promise.all([
          rm(cacheDir, {force: true, recursive: true}),
          rm(configDir, {force: true, recursive: true}),
          rm(dataDir, {force: true, recursive: true}),
        ])
      }
    } catch {}
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

  describe('basic', () => {
    it('should return "No Plugins" if no plugins are installed', async () => {
      const {stdout} = await runCommand('plugins')
      expect(stdout).to.contain('No plugins installed.')
    })

    it('should install plugin', async () => {
      await runCommand<Array<{name: string}>>(`plugins install ${plugin}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain(pluginShortName)
      expect(result?.some((r) => r.name === plugin)).to.be.true
    })

    it('should uninstall plugin', async () => {
      await runCommand(`plugins uninstall ${plugin}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('No plugins installed.')
      expect(result?.some((r) => r.name === plugin)).to.be.false
    })
  })

  describe('tagged', () => {
    it('should install plugin from a tag', async () => {
      await runCommand(`plugins install ${plugin}@latest`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain(pluginShortName)
      expect(result?.some((r) => r.name === plugin)).to.be.true
    })

    it('should uninstall plugin', async () => {
      await runCommand(`plugins uninstall ${plugin}@latest`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('No plugins installed.')
      expect(result?.some((r) => r.name === plugin)).to.be.false
    })
  })

  describe('alias', () => {
    it('should install aliased plugin', async () => {
      await runCommand('plugins install aliasme')
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain(pluginShortName)
      expect(result?.some((r) => r.name === plugin)).to.be.true
    })

    it('should uninstall aliased plugin', async () => {
      await runCommand(`plugins uninstall ${plugin}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('No plugins installed.')
      expect(result?.some((r) => r.name === plugin)).to.be.false
    })
  })

  describe('github org/repo', () => {
    it('should install plugin from github org/repo', async () => {
      await runCommand(`plugins install ${pluginGithubSlug}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain(pluginShortName)
      expect(result?.some((r) => r.name === plugin)).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await runCommand(`plugins uninstall ${plugin}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('No plugins installed.')
      expect(result?.some((r) => r.name === plugin)).to.be.false
    })
  })

  describe('github url', () => {
    it('should install plugin from github url', async () => {
      await runCommand(`plugins install ${pluginGithubUrl}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain(pluginShortName)
      expect(result?.some((r) => r.name === plugin)).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await runCommand(`plugins uninstall ${plugin}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('No plugins installed.')
      expect(result?.some((r) => r.name === plugin)).to.be.false
    })
  })

  describe('github tagged url', () => {
    it('should install plugin from github tagged url', async () => {
      await runCommand(`plugins install ${pluginGithubUrl}#2.1.2`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain(pluginShortName)
      expect(result?.some((r) => r.name === plugin)).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await runCommand(`plugins uninstall ${plugin}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('No plugins installed.')
      expect(result?.some((r) => r.name === plugin)).to.be.false
    })
  })

  describe('non-existent plugin', () => {
    it('should not install non-existent plugin', async () => {
      await runCommand('plugins install @oclif/DOES_NOT_EXIST')
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('No plugins installed.')
      expect(result?.some((r) => r.name === '@oclif/DOES_NOT_EXIST')).to.be.false
    })

    it('should handle uninstalling a non-existent plugin', async () => {
      const {error} = await runCommand('plugins uninstall @oclif/DOES_NOT_EXIST')
      expect(error?.message).to.contain('@oclif/DOES_NOT_EXIST is not installed')
    })
  })

  describe('scoped plugin', () => {
    it('should install scoped plugin', async () => {
      await runCommand(`plugins install ${pluginShortName}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain(pluginShortName)
      expect(result?.some((r) => r.name === plugin)).to.be.true
    })

    it('should uninstall scoped plugin', async () => {
      await runCommand(`plugins uninstall ${pluginShortName}`)
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('No plugins installed.')
      expect(result?.some((r) => r.name === plugin)).to.be.false
    })
  })

  describe('legacy plugin', () => {
    it('should install legacy plugin', async () => {
      await runCommand('plugins install @oclif/plugin-legacy')
      await runCommand('plugins install @heroku-cli/plugin-ps-exec --silent')
      const {result, stdout} = await runCommand<Array<{name: string}>>('plugins')
      expect(stdout).to.contain('@heroku-cli/plugin-ps-exec')
      expect(result?.some((r) => r.name === '@heroku-cli/plugin-ps-exec')).to.be.true
    })
  })
})

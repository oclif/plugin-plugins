import {Errors} from '@oclif/core'
import {expect} from 'chai'
import chalk from 'chalk'
import {rm} from 'node:fs/promises'
import {join, resolve} from 'node:path'
import {SinonSandbox, SinonStub, createSandbox, match} from 'sinon'

import PluginsIndex from '../../src/commands/plugins/index.js'
import PluginsInstall from '../../src/commands/plugins/install.js'
import PluginsUninstall from '../../src/commands/plugins/uninstall.js'

describe('install/uninstall integration tests', () => {
  let sandbox: SinonSandbox
  let stdoutStub: SinonStub

  const tmp = resolve('tmp', 'install-integration')
  const cacheDir = join(tmp, 'plugin-plugins-tests', 'cache')
  const configDir = join(tmp, 'plugin-plugins-tests', 'config')
  const dataDir = join(tmp, 'plugin-plugins-tests', 'data')

  console.log('process.env.MYCLI_DATA_DIR:', chalk.dim(dataDir))
  console.log('process.env.MYCLI_CACHE_DIR:', chalk.dim(cacheDir))
  console.log('process.env.MYCLI_CONFIG_DIR:', chalk.dim(configDir))

  const cwd = process.cwd()

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
    sandbox = createSandbox()
    // stdoutStub = sandbox.stub(ux.write, 'stdout')
    process.env.MYCLI_CACHE_DIR = cacheDir
    process.env.MYCLI_CONFIG_DIR = configDir
    process.env.MYCLI_DATA_DIR = dataDir
  })

  afterEach(() => {
    sandbox.restore()

    delete process.env.MYCLI_CACHE_DIR
    delete process.env.MYCLI_CONFIG_DIR
    delete process.env.MYCLI_DATA_DIR
  })

  describe('basic', () => {
    it.skip('should return "No Plugins" if no plugins are installed', async () => {
      await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
    })

    it('should install plugin', async () => {
      process.env.DEBUG = '@oclif/plugin-plugins*'
      await PluginsInstall.run(['@oclif/plugin-test-esm-1', '--npm-log-level', 'verbose'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('test-esm-1'))).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall plugin', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('tagged', () => {
    it('should install plugin from a tag', async () => {
      await PluginsInstall.run(['@oclif/plugin-test-esm-1@latest'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('test-esm-1'))).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall plugin', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1@latest'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('alias', () => {
    it('should install aliased plugin', async () => {
      await PluginsInstall.run(['aliasme'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('test-esm-1'))).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall aliased plugin', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('github org/repo', () => {
    it('should install plugin from github org/repo', async () => {
      await PluginsInstall.run(['oclif/plugin-test-esm-1'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('test-esm-1'))).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('github url', () => {
    it('should install plugin from github url', async () => {
      await PluginsInstall.run(['https://github.com/oclif/plugin-test-esm-1.git'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('test-esm-1'))).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('github tagged url', () => {
    it('should install plugin from github tagged url', async () => {
      await PluginsInstall.run(['https://github.com/oclif/plugin-test-esm-1.git#0.5.4'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('test-esm-1'))).to.be.true
      expect(stdoutStub.calledWith(match('0.5.4'))).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('oclif.lock', () => {
    it('should install plugin with oclif.lock', async () => {
      await PluginsInstall.run(['@salesforce/plugin-custom-metadata'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('@salesforce/plugin-custom-metadata'))).to.be.true
      expect(result.some((r) => r.name === '@salesforce/plugin-custom-metadata')).to.be.true
    })

    it('should uninstall plugin with oclif.lock', async () => {
      await PluginsUninstall.run(['@salesforce/plugin-custom-metadata'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@salesforce/plugin-custom-metadata')).to.be.false
    })
  })

  describe('non-existent plugin', () => {
    it('should not install non-existent plugin', async () => {
      try {
        await PluginsInstall.run(['@oclif/DOES_NOT_EXIST'], cwd)
      } catch {}

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@oclif/DOES_NOT_EXIST')).to.be.false
    })

    it('should handle uninstalling a non-existent plugin', async () => {
      try {
        await PluginsUninstall.run(['@oclif/DOES_NOT_EXIST'], cwd)
      } catch (error) {
        const err = error as Errors.CLIError
        expect(err.message).to.equal('@oclif/DOES_NOT_EXIST is not installed')
      }
    })
  })

  describe('scoped plugin', () => {
    it('should install scoped plugin', async () => {
      await PluginsInstall.run(['test-esm-1'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('test-esm-1'))).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall scoped plugin', async () => {
      await PluginsUninstall.run(['test-esm-1'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith('No plugins installed.\n')).to.be.true
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('legacy plugin', () => {
    it('should install legacy plugin', async () => {
      await PluginsInstall.run(['@oclif/plugin-legacy'], cwd)
      await PluginsInstall.run(['@heroku-cli/plugin-ps-exec', '--silent'], cwd)

      const result = await PluginsIndex.run([], cwd)
      expect(stdoutStub.calledWith(match('@heroku-cli/plugin-ps-exec'))).to.be.true
      expect(result.some((r) => r.name === '@heroku-cli/plugin-ps-exec')).to.be.true
    })
  })
})

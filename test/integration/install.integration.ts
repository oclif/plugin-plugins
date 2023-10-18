import {ux} from '@oclif/core'
import {CLIError} from '@oclif/core/lib/errors/index.js'
import {expect} from 'chai'
import {existsSync} from 'node:fs'
import {rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {SinonSandbox, createSandbox} from 'sinon'

import PluginsIndex from '../../src/commands/plugins/index.js'
import PluginsInstall from '../../src/commands/plugins/install.js'
import PluginsUninstall from '../../src/commands/plugins/uninstall.js'

describe('install/uninstall integration tests', () => {
  let sandbox: SinonSandbox
  let stubs: ReturnType<typeof ux.makeStubs>

  const cacheDir = join(tmpdir(), 'plugin-plugins-tests', 'cache')
  const configDir = join(tmpdir(), 'plugin-plugins-tests', 'config')
  const dataDir = join(tmpdir(), 'plugin-plugins-tests', 'data')

  before(async () => {
    try {
      await Promise.all([
        rm(cacheDir, {force: true, recursive: true}),
        rm(configDir, {force: true, recursive: true}),
        rm(dataDir, {force: true, recursive: true}),
      ])
    } catch {}
  })

  beforeEach(() => {
    sandbox = createSandbox()
    stubs = ux.makeStubs(sandbox)
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
    it('should return "No Plugins" if no plugins are installed', async () => {
      await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
    })

    it('should install plugin', async () => {
      await PluginsInstall.run(['@oclif/plugin-test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.include('test-esm-1')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall plugin', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('tagged', () => {
    it('should install plugin from a tag', async () => {
      await PluginsInstall.run(['@oclif/plugin-test-esm-1@latest'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.include('test-esm-1')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall plugin', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1@latest'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('alias', () => {
    it('should install aliased plugin', async () => {
      await PluginsInstall.run(['aliasme'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.include('test-esm-1')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall aliased plugin', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('github org/repo', () => {
    it('should install plugin from github org/repo', async () => {
      await PluginsInstall.run(['oclif/plugin-test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.include('test-esm-1')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true

      // test that the plugin was compiled after install (only applies to github installs)
      const compiledDir = join(dataDir, 'node_modules', '@oclif', 'plugin-test-esm-1', 'dist')
      expect(existsSync(compiledDir)).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('github url', () => {
    it('should install plugin from github url', async () => {
      await PluginsInstall.run(['https://github.com/oclif/plugin-test-esm-1.git'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.include('test-esm-1')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true

      // test that the plugin was compiled after install (only applies to github installs)
      const compiledDir = join(dataDir, 'node_modules', '@oclif', 'plugin-test-esm-1', 'dist')
      expect(existsSync(compiledDir)).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('github tagged url', () => {
    it('should install plugin from github tagged url', async () => {
      await PluginsInstall.run(['https://github.com/oclif/plugin-test-esm-1.git#0.5.4'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.include('test-esm-1')
      expect(stubs.stdout.firstCall.firstArg).to.include('0.5.4')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true

      // test that the plugin was compiled after install (only applies to github installs)
      const compiledDir = join(dataDir, 'node_modules', '@oclif', 'plugin-test-esm-1', 'dist')
      expect(existsSync(compiledDir)).to.be.true
    })

    it('should uninstall plugin from github', async () => {
      await PluginsUninstall.run(['@oclif/plugin-test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })

  describe('oclif.lock', () => {
    it('should install plugin with oclif.lock', async () => {
      await PluginsInstall.run(['@salesforce/plugin-custom-metadata'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.include('@salesforce/plugin-custom-metadata')
      expect(result.some((r) => r.name === '@salesforce/plugin-custom-metadata')).to.be.true
    })

    it('should uninstall plugin with oclif.lock', async () => {
      await PluginsUninstall.run(['@salesforce/plugin-custom-metadata'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@salesforce/plugin-custom-metadata')).to.be.false
    })
  })

  describe('non-existent plugin', () => {
    it('should not install non-existent plugin', async () => {
      try {
        await PluginsInstall.run(['@oclif/DOES_NOT_EXIST'], process.cwd())
      } catch {}

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@oclif/DOES_NOT_EXIST')).to.be.false
    })

    it('should handle uninstalling a non-existent plugin', async () => {
      try {
        await PluginsUninstall.run(['@oclif/DOES_NOT_EXIST'], process.cwd())
      } catch (error) {
        const err = error as CLIError
        expect(err.message).to.equal('@oclif/DOES_NOT_EXIST is not installed')
      }
    })
  })

  describe('scoped plugin', () => {
    it('should install scoped plugin', async () => {
      await PluginsInstall.run(['test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.include('test-esm')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.true
    })

    it('should uninstall scoped plugin', async () => {
      await PluginsUninstall.run(['test-esm-1'], process.cwd())

      const result = await PluginsIndex.run([], process.cwd())
      expect(stubs.stdout.firstCall.firstArg).to.equal('No plugins installed.\n')
      expect(result.some((r) => r.name === '@oclif/plugin-test-esm-1')).to.be.false
    })
  })
})

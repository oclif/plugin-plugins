import {Config, Interfaces} from '@oclif/core'
import {expect} from 'chai'
import {join} from 'node:path'
import {SinonSandbox, SinonSpy, createSandbox} from 'sinon'

import Plugins from '../src/plugins.js'

describe('Plugins', () => {
  let sandbox: SinonSandbox
  let plugins: Plugins
  let saveStub: SinonSpy
  let config: Config

  const userPlugin: Interfaces.PJSON.PluginTypes.User = {
    name: '@oclif/plugin-user',
    tag: 'latest',
    type: 'user',
  }

  const linkedPlugin: Interfaces.PJSON.PluginTypes.Link = {
    name: '@oclif/plugin-linked',
    root: join('some', 'path', 'package.json'),
    type: 'link',
  }

  const userPJSON = {
    dependencies: {},
    oclif: {
      plugins: [],
      schema: 1,
    },
    private: true,
  }

  beforeEach(async () => {
    sandbox = createSandbox()
    config = await Config.load(process.cwd())
    config.pjson.oclif = {
      ...config.pjson.oclif,
      pluginPrefix: undefined,
    }
    plugins = new Plugins({config, silent: true, verbose: false})
    // @ts-expect-error because savePJSON is private
    saveStub = sandbox.stub(plugins, 'savePJSON').resolves()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('add', () => {
    it('should add user plugin to package.json', async () => {
      sandbox.stub(plugins, 'pjson').resolves(userPJSON)

      await plugins.add(userPlugin)

      expect(saveStub.calledWithExactly({...userPJSON, oclif: {...userPJSON.oclif, plugins: [userPlugin]}})).to.be.true
    })

    it('should add linked plugin to package.json', async () => {
      sandbox.stub(plugins, 'pjson').resolves(userPJSON)

      await plugins.add(linkedPlugin)

      expect(saveStub.calledWithExactly({...userPJSON, oclif: {...userPJSON.oclif, plugins: [linkedPlugin]}})).to.be
        .true
    })

    it('should dedupe added plugins', async () => {
      sandbox.stub(plugins, 'pjson').resolves(userPJSON)

      await plugins.add(linkedPlugin, linkedPlugin)

      expect(saveStub.calledWithExactly({...userPJSON, oclif: {...userPJSON.oclif, plugins: [linkedPlugin]}})).to.be
        .true
    })
  })

  describe('friendlyName', () => {
    it('should return friendly name for plugin', () => {
      expect(plugins.friendlyName(userPlugin.name)).to.equal('user')
    })

    it('should return provided name that does not match scope', () => {
      expect(plugins.friendlyName('@foo/plugin-bar')).to.equal('@foo/plugin-bar')
    })

    it('should return provided name when scope is not defined', () => {
      sandbox.stub(config.pjson.oclif, 'scope').value(null)
      expect(plugins.friendlyName(linkedPlugin.name)).to.equal('@oclif/plugin-linked')
    })

    it('should return friendly name for plugin when pluginPrefix is defined', () => {
      sandbox.stub(config.pjson.oclif, 'pluginPrefix').value('foo')
      expect(plugins.friendlyName('@oclif/foo-bar')).to.equal('bar')
    })
  })

  describe('unfriendlyName', () => {
    it('should return undefined when provided scoped name', () => {
      expect(plugins.unfriendlyName(userPlugin.name)).to.be.undefined
    })

    it('should return full name when provided short name', () => {
      expect(plugins.unfriendlyName('user')).to.equal(userPlugin.name)
    })

    it('should return undefined when scope is not defined', () => {
      sandbox.stub(config.pjson.oclif, 'scope').value(null)
      expect(plugins.unfriendlyName(linkedPlugin.name)).to.be.undefined
    })

    it('should return full name when pluginPrefix is defined', () => {
      sandbox.stub(config.pjson.oclif, 'pluginPrefix').value('foo')
      expect(plugins.unfriendlyName('bar')).to.equal('@oclif/foo-bar')
    })
  })

  describe('maybeUnfriendlyName', () => {
    it('should return full name when given short name and npm pkg exists', async () => {
      // @ts-expect-error because npmHasPackage is private
      sandbox.stub(plugins, 'npmHasPackage').resolves(true)
      expect(await plugins.maybeUnfriendlyName('user')).to.equal(userPlugin.name)
    })

    it('should return full name when given full name and npm pkg exists', async () => {
      // @ts-expect-error because npmHasPackage is private
      sandbox.stub(plugins, 'npmHasPackage').resolves(true)
      expect(await plugins.maybeUnfriendlyName(userPlugin.name)).to.equal(userPlugin.name)
    })

    it('should return provided name when npm pkg does not exist', async () => {
      // @ts-expect-error because npmHasPackage is private
      sandbox.stub(plugins, 'npmHasPackage').resolves(false)
      expect(await plugins.maybeUnfriendlyName(userPlugin.name)).to.equal(userPlugin.name)
    })
  })

  describe('hasPlugin', () => {
    it('should return provided plugin if it has been added', async () => {
      sandbox.stub(plugins, 'pjson').resolves({...userPJSON, oclif: {...userPJSON.oclif, plugins: [userPlugin]}})
      expect(await plugins.hasPlugin(userPlugin.name)).to.equal(userPlugin)
    })

    it('should return provided plugin for friendly name if it has been added', async () => {
      sandbox.stub(plugins, 'pjson').resolves({...userPJSON, oclif: {...userPJSON.oclif, plugins: [userPlugin]}})
      expect(await plugins.hasPlugin('user')).to.equal(userPlugin)
    })

    it('should return false if the plugin has not been added', async () => {
      sandbox.stub(plugins, 'pjson').resolves(userPJSON)
      expect(await plugins.hasPlugin(userPlugin.name)).to.be.false
    })
  })

  describe('pjson', () => {
    it('should return scaffolded package.json when it does not exist', async () => {
      // @ts-expect-error because readPJSON is private
      sandbox.stub(plugins, 'readPJSON').resolves()
      expect(await plugins.pjson()).to.deep.equal(userPJSON)
    })

    it('should convert plugin strings to objects', async () => {
      // @ts-expect-error because readPJSON is private
      sandbox.stub(plugins, 'readPJSON').resolves({
        dependencies: {},
        oclif: {
          plugins: ['@oclif/plugin-user'],
          schema: 1,
        },
        private: true,
      })
      expect(await plugins.pjson()).to.deep.equal({...userPJSON, oclif: {...userPJSON.oclif, plugins: [userPlugin]}})
    })
  })

  describe('remove', () => {
    it('should remove given plugin from dependencies', async () => {
      sandbox.stub(plugins, 'pjson').resolves({
        ...userPJSON,
        dependencies: {[userPlugin.name]: '1.0.0'},
        oclif: {
          ...userPJSON.oclif,
          plugins: [userPlugin],
        },
      })

      await plugins.remove(userPlugin.name)
      expect(saveStub.calledWithExactly(userPJSON)).to.be.true
    })
  })
})

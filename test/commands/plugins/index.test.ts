import {Config} from '@oclif/core'
import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import sinon from 'sinon'

describe('plugins', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('shows no plugins installed', async () => {
    const config = await Config.load(import.meta.url)
    sinon.stub(config, 'getPluginsList').returns([])

    const {stdout} = await runCommand('plugins', config, {print: true})
    expect(stdout).to.equal('No plugins installed.\n')
  })

  it('lists user plugins in stdout', async () => {
    const config = await Config.load(import.meta.url)
    const plugins = [
      ...config.getPluginsList(),
      {name: 'user-plugin-1', type: 'user', version: '1.0.0'},
      {name: 'user-plugin-2', type: 'user', version: '1.0.0'},
    ]
    // @ts-expect-error because we aren't stubbing the entire Plugin instance
    sinon.stub(config, 'getPluginsList').returns(plugins)

    const {stdout} = await runCommand('plugins', config)
    expect(stdout).to.equal('user-plugin-1 1.0.0\nuser-plugin-2 1.0.0\n')
  })

  it('lists nested user plugins in stdout', async () => {
    const config = await Config.load(import.meta.url)
    const plugins = [
      ...config.getPluginsList(),
      {
        children: [
          {
            name: 'user-plugin-2',
            type: 'user',
            version: '1.0.0',
          },
        ],
        name: 'user-plugin-1',
        type: 'user',
        version: '1.0.0',
      },
    ]
    // @ts-expect-error because we aren't stubbing the entire Plugin instance
    sinon.stub(config, 'getPluginsList').returns(plugins)

    const {stdout} = await runCommand('plugins', config)
    expect(stdout).to.equal(`user-plugin-1 1.0.0
└─ user-plugin-2 1.0.0
`)
  })

  it('lists dev plugins in stdout with --core', async () => {
    const config = await Config.load(import.meta.url)
    const plugins = [
      ...config.getPluginsList(),
      {name: 'dev-plugin-1', type: 'dev', version: '1.0.0'},
      {name: 'user-plugin-1', type: 'user', version: '1.0.0'},
    ]
    // @ts-expect-error because we aren't stubbing the entire Plugin instance
    sinon.stub(config, 'getPluginsList').returns(plugins)

    const {stdout} = await runCommand('plugins --core', config)
    expect(stdout).to.equal('dev-plugin-1 1.0.0 (dev)\nuser-plugin-1 1.0.0\n')
  })

  it('lists uninstalled jit plugins in stdout with --core', async () => {
    const config = await Config.load(import.meta.url)
    sinon.stub(config.pjson, 'oclif').value({
      ...config.pjson.oclif,
      jitPlugins: {
        'jit-plugin-1': '1.0.0',
        'jit-plugin-2': '1.0.0',
        'jit-plugin-3': '1.0.0',
      },
    })
    const plugins = [
      ...config.getPluginsList(),
      {name: 'user-plugin-1', type: 'user', version: '1.0.0'},
      {name: 'jit-plugin-1', type: 'user', version: '1.0.0'},
    ]
    // @ts-expect-error because we aren't stubbing the entire Plugin instance
    sinon.stub(config, 'getPluginsList').returns(plugins)

    const {stdout} = await runCommand('plugins --core', config)
    expect(stdout).to.equal(`jit-plugin-1 1.0.0
user-plugin-1 1.0.0

Uninstalled JIT Plugins:
jit-plugin-2 1.0.0
jit-plugin-3 1.0.0
`)
  })

  it('returns all plugin types and root plugin in json', async () => {
    const config = await Config.load(import.meta.url)
    const plugins = [
      ...config.getPluginsList(),
      {name: 'user-plugin-1', type: 'user', version: '1.0.0'},
      {name: 'dev-plugin-1', type: 'dev', version: '1.0.0'},
      {name: 'core-plugin-1', type: 'core', version: '1.0.0'},
    ]
    // @ts-expect-error because we aren't stubbing the entire Plugin instance
    sinon.stub(config, 'getPluginsList').returns(plugins)

    const {result} = await runCommand<Array<{name: string}>>('plugins', config)
    const pluginNames = result?.map((p) => p.name).sort()
    expect(pluginNames).to.deep.equal(['@oclif/plugin-plugins', 'core-plugin-1', 'dev-plugin-1', 'user-plugin-1'])
  })
})

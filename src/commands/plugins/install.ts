import {Command, Flags, ux, Args, Errors, Interfaces} from '@oclif/core'
import * as validate from 'validate-npm-package-name'
import * as chalk from 'chalk'

import Plugins from '../../plugins'

export default class PluginsInstall extends Command {
  static description = `Installs a plugin into the CLI.
Can be installed from npm or a git url.

Installation of a user-installed plugin will override a core plugin.

e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in the CLI without the need to patch and update the whole CLI.
`;

  static usage = 'plugins:install PLUGIN...';

  static examples = [
    '$ <%= config.bin %> plugins:install <%- config.pjson.oclif.examplePlugin || "myplugin" %> ',
    '$ <%= config.bin %> plugins:install https://github.com/someuser/someplugin',
    '$ <%= config.bin %> plugins:install someuser/someplugin',
  ];

  static strict = false;

  static args = {
    plugin: Args.string({description: 'Plugin to install.', required: true}),
  };

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
    force: Flags.boolean({
      char: 'f',
      description: 'Run yarn install with force flag.',
    }),
    jit: Flags.boolean({
      hidden: true,
      parse: async (input, ctx) => {
        if (input === false || input === undefined) return input

        const requestedPlugins = ctx.argv.filter(a => !a.startsWith('-'))
        if (requestedPlugins.length === 0) return input

        const jitPluginsConfig = ctx.config.pjson.oclif.jitPlugins ?? {}
        if (Object.keys(jitPluginsConfig).length === 0) return input

        const plugins = new Plugins(ctx.config)

        const nonJitPlugins = await Promise.all(requestedPlugins.map(async plugin => {
          const name = await plugins.maybeUnfriendlyName(plugin)
          return {name, jit: Boolean(jitPluginsConfig[name])}
        }))

        const nonJitPluginsNames = nonJitPlugins.filter(p => !p.jit).map(p => p.name)
        if (nonJitPluginsNames.length > 0) {
          throw new Errors.CLIError(`The following plugins are not JIT plugins: ${nonJitPluginsNames.join(', ')}`)
        }

        return input
      },
    }),
  };

  static aliases = ['plugins:add'];

  plugins = new Plugins(this.config);
  flags!: Interfaces.InferredFlags<typeof PluginsInstall.flags>;

  // In this case we want these operations to happen
  // sequentially so the `no-await-in-loop` rule is ignored
  /* eslint-disable no-await-in-loop */
  async run(): Promise<void> {
    const {flags, argv} = await this.parse(PluginsInstall)
    this.flags = flags
    if (flags.verbose) this.plugins.verbose = true
    const aliases = this.config.pjson.oclif.aliases || {}
    for (let name of argv as string[]) {
      if (aliases[name] === null) this.error(`${name} is blocked`)
      name = aliases[name] || name
      const p = await this.parsePlugin(name)
      let plugin
      await this.config.runHook('plugins:preinstall', {
        plugin: p,
      })
      try {
        if (p.type === 'npm') {
          ux.action.start(
            `Installing plugin ${chalk.cyan(this.plugins.friendlyName(p.name))}`,
          )
          plugin = await this.plugins.install(p.name, {
            tag: p.tag,
            force: flags.force,
          })
        } else {
          ux.action.start(`Installing plugin ${chalk.cyan(p.url)}`)
          plugin = await this.plugins.install(p.url, {force: flags.force})
        }
      } catch (error) {
        ux.action.stop(chalk.bold.red('failed'))
        throw error
      }

      ux.action.stop(`installed v${plugin.version}`)
    }
  }
  /* eslint-enable no-await-in-loop */

  async parsePlugin(input: string): Promise<{name: string; tag: string; type: 'npm'} | {url: string; type: 'repo'}> {
    if (input.startsWith('git+ssh://') || input.endsWith('.git')) {
      return {url: input, type: 'repo'}
    }

    if (input.includes('@') && input.includes('/')) {
      input = input.slice(1)
      const [name, tag = 'latest'] = input.split('@')
      validateNpmPkgName('@' + name)
      return {name: '@' + name, tag, type: 'npm'}
    }

    if (input.includes('/')) {
      if (input.includes(':')) return {url: input, type: 'repo'}
      return {url: `https://github.com/${input}`, type: 'repo'}
    }

    const [splitName, tag = 'latest'] = input.split('@')
    const name = await this.plugins.maybeUnfriendlyName(splitName)
    validateNpmPkgName(name)

    if (this.flags.jit) {
      const jitVersion = this.config.pjson.oclif?.jitPlugins?.[name]
      if (jitVersion) {
        if (input.includes('@')) this.warn(`--jit flag is present along side a tag. Ignoring tag ${tag} and using the version specified in package.json (${jitVersion}).`)
        return {name, tag: jitVersion ?? tag, type: 'npm'}
      }

      this.warn(`--jit flag is present but ${name} is not a JIT plugin. Installing ${tag} instead.`)
      return {name, tag, type: 'npm'}
    }

    return {name, tag, type: 'npm'}
  }
}

function validateNpmPkgName(name:string): void {
  if (!validate(name).validForNewPackages) {
    throw new Errors.CLIError('Invalid npm package name.')
  }
}

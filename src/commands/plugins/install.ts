import {Command, Flags} from '@oclif/core'
import * as chalk from 'chalk'
import cli from 'cli-ux'

import Plugins from '../../plugins'

export default class PluginsInstall extends Command {
  static description = `installs a plugin into the CLI
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

  static args = [
    {name: 'plugin', description: 'plugin to install', required: true},
  ];

  static flags = {
    help: Flags.help({char: 'h'}),
    verbose: Flags.boolean({char: 'v'}),
    force: Flags.boolean({
      char: 'f',
      description: 'yarn install with force flag',
    }),
  };

  static aliases = ['plugins:add'];

  plugins = new Plugins(this.config);

  // In this case we want these operations to happen
  // sequentially so the `no-await-in-loop` rule is ugnored
  /* eslint-disable no-await-in-loop */
  async run() {
    const {flags, argv} = await this.parse(PluginsInstall)
    if (flags.verbose) this.plugins.verbose = true
    const aliases = this.config.pjson.oclif.aliases || {}
    for (let name of argv) {
      if (aliases[name] === null) this.error(`${name} is blocked`)
      name = aliases[name] || name
      const p = await this.parsePlugin(name)
      let plugin
      await this.config.runHook('plugins:preinstall', {
        plugin: p,
      })
      try {
        if (p.type === 'npm') {
          cli.action.start(
            `Installing plugin ${chalk.cyan(this.plugins.friendlyName(p.name))}`,
          )
          plugin = await this.plugins.install(p.name, {
            tag: p.tag,
            force: flags.force,
          })
        } else {
          cli.action.start(`Installing plugin ${chalk.cyan(p.url)}`)
          plugin = await this.plugins.install(p.url, {force: flags.force})
        }
      } catch (error) {
        cli.action.stop(chalk.bold.red('failed'))
        throw error
      }
      cli.action.stop(`installed v${plugin.version}`)
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
      return {name: '@' + name, tag, type: 'npm'}
    }
    if (input.includes('/')) {
      if (input.includes(':')) return {url: input, type: 'repo'}
      return {url: `https://github.com/${input}`, type: 'repo'}
    }
    const [splitName, tag = 'latest'] = input.split('@')
    const name = await this.plugins.maybeUnfriendlyName(splitName)
    return {name, tag, type: 'npm'}
  }
}

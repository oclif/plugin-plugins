# @oclif/plugin-plugins

plugins plugin for oclif

[![Version](https://img.shields.io/npm/v/@oclif/plugin-plugins.svg)](https://npmjs.org/package/@oclif/plugin-plugins)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/plugin-plugins.svg)](https://npmjs.org/package/@oclif/plugin-plugins)
[![License](https://img.shields.io/npm/l/@oclif/plugin-plugins.svg)](https://github.com/oclif/plugin-plugins/blob/main/package.json)

<!-- toc -->

- [@oclif/plugin-plugins](#oclifplugin-plugins)
- [What is this?](#what-is-this)
- [Usage](#usage)
- [Friendly names](#friendly-names)
- [Aliases](#aliases)
- [Commands](#commands)
- [Contributing](#contributing)
<!-- tocstop -->

# What is this?

This plugin is used to allow users to install plugins into your oclif CLI at runtime. For example, in the Heroku CLI this is used to allow people to install plugins such as the Heroku Kafka plugin:

```sh-session
$ heroku plugins:install heroku-kafka
$ heroku kafka
```

This is useful to allow users to create their own plugins to work in your CLI or to allow you to build functionality that users can optionally install.

One particular way this is useful is for building functionality you aren't ready to include in a public repository. Build your plugin separately as a plugin, then include it as a core plugin later into your CLI.

# Usage

First add the plugin to your project with `yarn add @oclif/plugin-plugins`, then add it to the `package.json` of the oclif CLI:

```js
{
  "name": "mycli",
  "version": "0.0.0",
  // ...
  "oclif": {
    "plugins": ["@oclif/plugin-help", "@oclif/plugin-plugins"]
  }
}
```

Now the user can run any of the commands below to manage plugins at runtime.

# Friendly names

To make it simpler for users to install plugins, we have "friendly name" functionality. With this, you can run `mycli plugins:install myplugin` and it will first check if `@mynpmorg/plugin-myplugin` exists on npm before trying to install `myplugin`. This is useful if you want to use a generic name that's already taken in npm.

To set this up, simply set the `oclif.scope` to the name of your npm org. In the example above, this would be `mynpmorg`.

# Aliases

Over time in the Heroku CLI we've changed plugin names, brought plugins into the core of the CLI, or sunset old plugins that no longer function. There is support in this plugin for dealing with these situations.

For renaming plugins, add an alias section to `oclif.aliases` in `package.json`:

```json
"aliases": {
  "old-name-plugin": "new-name-plugin"
}
```

If a user had `old-name-plugin` installed, the next time the CLI is updated it will remove `old-name-plugin` and install `new-name-plugin`. If a user types `mycli plugins:install old-name-plugin` it will actually install `new-name-plugin` instead.

For removing plugins that are no longer needed (either because they're sunset or because they've been moved into core), set the alias to null:

```json
"aliases": {
  "old-name-plugin": null
}
```

`old-name-plugin` will be autoremoved on the next update and will not be able to be installed with `mycli plugins:install old-name-plugin`.

# Commands

<!-- commands -->

- [`mycli plugins`](#mycli-plugins)
- [`mycli plugins:inspect PLUGIN...`](#mycli-pluginsinspect-plugin)
- [`mycli plugins install PLUGIN`](#mycli-plugins-install-plugin)
- [`mycli plugins link PATH`](#mycli-plugins-link-path)
- [`mycli plugins reset`](#mycli-plugins-reset)
- [`mycli plugins uninstall [PLUGIN]`](#mycli-plugins-uninstall-plugin)
- [`mycli plugins update`](#mycli-plugins-update)

## `mycli plugins`

List installed plugins.

```
USAGE
  $ mycli plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ mycli plugins
```

_See code: [src/commands/plugins/index.ts](https://github.com/oclif/plugin-plugins/blob/5.4.15/src/commands/plugins/index.ts)_

## `mycli plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ mycli plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ mycli plugins inspect myplugin
```

_See code: [src/commands/plugins/inspect.ts](https://github.com/oclif/plugin-plugins/blob/5.4.15/src/commands/plugins/inspect.ts)_

## `mycli plugins install PLUGIN`

Installs a plugin into mycli.

```
USAGE
  $ mycli plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into mycli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the MYCLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MYCLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ mycli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ mycli plugins install myplugin

  Install a plugin from a github url.

    $ mycli plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ mycli plugins install someuser/someplugin
```

_See code: [src/commands/plugins/install.ts](https://github.com/oclif/plugin-plugins/blob/5.4.15/src/commands/plugins/install.ts)_

## `mycli plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ mycli plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ mycli plugins link myplugin
```

_See code: [src/commands/plugins/link.ts](https://github.com/oclif/plugin-plugins/blob/5.4.15/src/commands/plugins/link.ts)_

## `mycli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ mycli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [src/commands/plugins/reset.ts](https://github.com/oclif/plugin-plugins/blob/5.4.15/src/commands/plugins/reset.ts)_

## `mycli plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mycli plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mycli plugins unlink
  $ mycli plugins remove

EXAMPLES
  $ mycli plugins uninstall myplugin
```

_See code: [src/commands/plugins/uninstall.ts](https://github.com/oclif/plugin-plugins/blob/5.4.15/src/commands/plugins/uninstall.ts)_

## `mycli plugins update`

Update installed plugins.

```
USAGE
  $ mycli plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [src/commands/plugins/update.ts](https://github.com/oclif/plugin-plugins/blob/5.4.15/src/commands/plugins/update.ts)_

<!-- commandsstop -->

# Contributing

See [contributing guide](./CONRTIBUTING.md)

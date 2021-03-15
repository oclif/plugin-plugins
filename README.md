@oclif/plugin-plugins
=====================

plugins plugin for oclif

[![Version](https://img.shields.io/npm/v/@oclif/plugin-plugins.svg)](https://npmjs.org/package/@oclif/plugin-plugins)
[![CircleCI](https://circleci.com/gh/oclif/plugin-plugins/tree/master.svg?style=shield)](https://circleci.com/gh/oclif/plugin-plugins/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/plugin-plugins?branch=master&svg=true)](https://ci.appveyor.com/project/oclif/plugin-plugins/branch/master)
[![Codecov](https://codecov.io/gh/oclif/plugin-plugins/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/plugin-plugins)
[![Known Vulnerabilities](https://snyk.io/test/github/oclif/plugin-plugins/badge.svg)](https://snyk.io/test/github/oclif/plugin-plugins)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/plugin-plugins.svg)](https://npmjs.org/package/@oclif/plugin-plugins)
[![License](https://img.shields.io/npm/l/@oclif/plugin-plugins.svg)](https://github.com/oclif/plugin-plugins/blob/master/package.json)

<!-- toc -->
* [What is this?](#what-is-this)
* [Usage](#usage)
* [Friendly names](#friendly-names)
* [Aliases](#aliases)
* [Commands](#commands)
<!-- tocstop -->

# What is this?

This plugin is used to allow users to install plugins into your oclif CLI at runtime. For example, in the VTEX CLI this is used to allow people to install plugins such as the VTEX Autoupdate plugin:

```sh-session
$ vtex plugins install autoupdate
$ vtex autoupdate
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

Over time in the VTEX CLI we've changed plugin names, brought plugins into the core of the CLI, or sunset old plugins that no longer function. There is support in this plugin for dealing with these situations.

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
* [`vtex plugins install PLUGIN`](#vtex-plugins-install-plugin)
* [`vtex plugins link PLUGIN`](#vtex-plugins-link-plugin)
* [`vtex plugins:list`](#vtex-pluginslist)
* [`vtex plugins source PLUGIN`](#vtex-plugins-source-plugin)
* [`vtex plugins uninstall PLUGIN`](#vtex-plugins-uninstall-plugin)
* [`vtex plugins:update`](#vtex-pluginsupdate)

## `vtex plugins install PLUGIN`

Installs a plugin into the CLI.

```
USAGE
  $ vtex plugins install PLUGIN

ARGUMENTS
  PLUGIN  plugin to install

OPTIONS
  -f, --force    Refetches all packages, even the ones that were previously installed.
  -h, --help     show CLI help
  -v, --verbose

ALIASES
  $ vtex plugins:add

EXAMPLES
  vtex plugins install lighthouse
  vtex plugins install https://github.com/vtex/cli-plugin-someplugin
  vtex plugins install @vtex/cli-plugin-someplugin
```

_See code: [src/commands/plugins/install.ts](https://github.com/vtex/cli-plugin-plugins/blob/v1.11.0/src/commands/plugins/install.ts)_

## `vtex plugins link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ vtex plugins link PLUGIN

ARGUMENTS
  PATH  [default: .] Plugin path.

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

EXAMPLE
  vtex plugins link myplugin
```

_See code: [src/commands/plugins/link.ts](https://github.com/vtex/cli-plugin-plugins/blob/v1.11.0/src/commands/plugins/link.ts)_

## `vtex plugins:list`

Lists all plugins installed on your machine.

```
USAGE
  $ vtex plugins:list

OPTIONS
  --core  Shows core plugins.

EXAMPLE
  vtex plugins list
```

_See code: [src/commands/plugins/list.ts](https://github.com/vtex/cli-plugin-plugins/blob/v1.11.0/src/commands/plugins/list.ts)_

## `vtex plugins source PLUGIN`

Lists all plugins supported by [38;2;139;195;74mVTEX[39m.

```
USAGE
  $ vtex plugins source PLUGIN

ARGUMENTS
  PATH  [default: .] Plugin path.

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

EXAMPLE
  vtex plugins source myplugin
```

_See code: [src/commands/plugins/source.ts](https://github.com/vtex/cli-plugin-plugins/blob/v1.11.0/src/commands/plugins/source.ts)_

## `vtex plugins uninstall PLUGIN`

Removes a plugin from the CLI

```
USAGE
  $ vtex plugins uninstall PLUGIN

ARGUMENTS
  PLUGIN  Plugin to uninstall.

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

ALIASES
  $ vtex plugins:unlink
  $ vtex plugins:remove
```

_See code: [src/commands/plugins/uninstall.ts](https://github.com/vtex/cli-plugin-plugins/blob/v1.11.0/src/commands/plugins/uninstall.ts)_

## `vtex plugins:update`

Updates all plugins installed on your machine.

```
USAGE
  $ vtex plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [src/commands/plugins/update.ts](https://github.com/vtex/cli-plugin-plugins/blob/v1.11.0/src/commands/plugins/update.ts)_
<!-- commandsstop -->

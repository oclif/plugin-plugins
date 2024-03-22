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
- [Environment Variables](#environment-variables)
- [Commands](#commands)
- [Command Topics](#command-topics)
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

# Environment Variables

`<CLI>_USE_NETWORK_MUTEX` if true, use the `--mutex=network` option on yarn operations
`<CLI>_NETWORK_MUTEX_PORT` specify the port for the `mutex=network` option, depends on `<CLI>_USE_NETWORK_MUTEX`
`<CLI>_NETWORK_TIMEOUT` specify the `--network-timeout` option on yarn operation (set in milliseconds)

# Commands

<!-- commands -->

# Command Topics

- [`mycli plugins`](docs/plugins.md) - List installed plugins.

<!-- commandsstop -->

# Contributing

See [contributing guide](./CONRTIBUTING.md)

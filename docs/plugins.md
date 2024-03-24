# `mycli plugins`

List installed plugins.

- [`mycli plugins`](#mycli-plugins)
- [`mycli plugins:inspect PLUGIN...`](#mycli-pluginsinspect-plugin)
- [`mycli plugins:install PLUGIN...`](#mycli-pluginsinstall-plugin)
- [`mycli plugins:link PLUGIN`](#mycli-pluginslink-plugin)
- [`mycli plugins reset`](#mycli-plugins-reset)
- [`mycli plugins:uninstall PLUGIN...`](#mycli-pluginsuninstall-plugin)
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

_See code: [src/commands/plugins/index.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9/src/commands/plugins/index.ts)_

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

_See code: [src/commands/plugins/inspect.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9/src/commands/plugins/inspect.ts)_

## `mycli plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ mycli plugins install PLUGIN...

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ mycli plugins add

EXAMPLES
  $ mycli plugins install myplugin

  $ mycli plugins install https://github.com/someuser/someplugin

  $ mycli plugins install someuser/someplugin
```

_See code: [src/commands/plugins/install.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9/src/commands/plugins/install.ts)_

## `mycli plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ mycli plugins link PLUGIN

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

_See code: [src/commands/plugins/link.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9/src/commands/plugins/link.ts)_

## `mycli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ mycli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [src/commands/plugins/reset.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9/src/commands/plugins/reset.ts)_

## `mycli plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ mycli plugins uninstall PLUGIN...

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

_See code: [src/commands/plugins/uninstall.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9/src/commands/plugins/uninstall.ts)_

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

_See code: [src/commands/plugins/update.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9/src/commands/plugins/update.ts)_

# `mycli plugins`

List installed plugins.

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

_See code: [src/commands/plugins/index.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9-beta.0/src/commands/plugins/index.ts)_

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

_See code: [src/commands/plugins/inspect.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9-beta.0/src/commands/plugins/inspect.ts)_

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

  Uses bundled npm executable to install plugins into /home/runner/.local/share/@oclif/plugin-plugins

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

_See code: [src/commands/plugins/install.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9-beta.0/src/commands/plugins/install.ts)_

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

_See code: [src/commands/plugins/link.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9-beta.0/src/commands/plugins/link.ts)_

## `mycli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ mycli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [src/commands/plugins/reset.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9-beta.0/src/commands/plugins/reset.ts)_

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

_See code: [src/commands/plugins/uninstall.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9-beta.0/src/commands/plugins/uninstall.ts)_

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

_See code: [src/commands/plugins/update.ts](https://github.com/oclif/plugin-plugins/blob/4.3.9-beta.0/src/commands/plugins/update.ts)_

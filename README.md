@oclif/plugin-plugins
=====================

plugins plugin for oclif

[![Version](https://img.shields.io/npm/v/@oclif/plugin-plugins.svg)](https://npmjs.org/package/@oclif/plugin-plugins)
[![CircleCI](https://circleci.com/gh/oclif/plugin-plugins/tree/master.svg?style=shield)](https://circleci.com/gh/oclif/plugin-plugins/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/plugin-plugins?branch=master&svg=true)](https://ci.appveyor.com/project/oclif/plugin-plugins/branch/master)
[![Codecov](https://codecov.io/gh/oclif/plugin-plugins/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/plugin-plugins)
[![Greenkeeper](https://badges.greenkeeper.io/oclif/plugin-plugins.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/oclif/plugin-plugins/badge.svg)](https://snyk.io/test/github/oclif/plugin-plugins)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/plugin-plugins.svg)](https://npmjs.org/package/@oclif/plugin-plugins)
[![License](https://img.shields.io/npm/l/@oclif/plugin-plugins.svg)](https://github.com/oclif/plugin-plugins/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
<!-- usage -->
# Usage

```sh-session
$ npm install -g @oclif/plugin-plugins
$ oclif-example COMMAND
running command...
$ oclif-example (-v|--version|version)
@oclif/plugin-plugins/1.0.4 darwin-x64 node-v9.9.0
$ oclif-example --help [COMMAND]
USAGE
  $ oclif-example COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
# Commands

* [oclif-example plugins](#plugins)
* [oclif-example plugins:install PLUGIN...](#pluginsinstall-plugin)
* [oclif-example plugins:uninstall PLUGIN...](#pluginsuninstall-plugin)
* [oclif-example plugins:update](#pluginsupdate)
## plugins

list installed plugins

```
USAGE
  $ oclif-example plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ oclif-example plugins
```

_See code: [src/commands/plugins.ts](https://github.com/oclif/plugin-plugins/blob/v1.0.4/src/commands/plugins.ts)_

### plugins:install PLUGIN...

installs a plugin into the CLI

```
USAGE
  $ oclif-example plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  plugin to install

EXAMPLE
  $ oclif-example plugins:install heroku-production-status
```

_See code: [src/commands/plugins/install.ts](https://github.com/oclif/plugin-plugins/blob/v1.0.4/src/commands/plugins/install.ts)_

### plugins:uninstall PLUGIN...

removes a plugin from the CLI

```
USAGE
  $ oclif-example plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall
```

_See code: [src/commands/plugins/uninstall.ts](https://github.com/oclif/plugin-plugins/blob/v1.0.4/src/commands/plugins/uninstall.ts)_

### plugins:update

update installed plugins

```
USAGE
  $ oclif-example plugins:update
```

_See code: [src/commands/plugins/update.ts](https://github.com/oclif/plugin-plugins/blob/v1.0.4/src/commands/plugins/update.ts)_

## plugins:install PLUGIN...

installs a plugin into the CLI

```
USAGE
  $ oclif-example plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  plugin to install

EXAMPLE
  $ oclif-example plugins:install heroku-production-status
```

_See code: [src/commands/plugins/install.ts](https://github.com/oclif/plugin-plugins/blob/v1.0.4/src/commands/plugins/install.ts)_

## plugins:uninstall PLUGIN...

removes a plugin from the CLI

```
USAGE
  $ oclif-example plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall
```

_See code: [src/commands/plugins/uninstall.ts](https://github.com/oclif/plugin-plugins/blob/v1.0.4/src/commands/plugins/uninstall.ts)_

## plugins:update

update installed plugins

```
USAGE
  $ oclif-example plugins:update
```

_See code: [src/commands/plugins/update.ts](https://github.com/oclif/plugin-plugins/blob/v1.0.4/src/commands/plugins/update.ts)_
<!-- commandsstop -->

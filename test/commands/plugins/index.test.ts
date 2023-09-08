import {expect, test} from '../../test'
import {platform} from 'node:os'

describe('command', () => {
  test
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
  .command(['plugins:install', '@oclif/example-plugin-ts'], {reset: true})
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.contain('@oclif/example-plugin-ts '))
  .stdout()
  .command(['hello'], {reset: true})
  .do(output => expect(output.stdout).to.contain('hello world'))
  .command(['plugins:uninstall', '@heroku-cli/plugin-@oclif/example-plugin-ts'])
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
  .it('installs and uninstalls @oclif/example-plugin-ts')

  test
  .command(['plugins', '--json'], {reset: true})
  .do(output => expect((output.returned)).to.deep.equal([]))
  .command(['plugins:install', '@oclif/example-plugin-ts'], {reset: true})
  .command(['plugins', '--json'], {reset: true})
  .do(output => expect((output.returned as [{name: string}]).find(o => o.name === '@oclif/example-plugin-ts')).to.have.property('type', 'user'))
  .stdout()
  .command(['hello'], {reset: true})
  .do(output => expect(output.stdout).to.contain('hello world'))
  .command(['plugins:uninstall', '@heroku-cli/plugin-@oclif/example-plugin-ts'])
  .command(['plugins', '--json'], {reset: true})
  .do(output => expect((output.returned)).to.deep.equal([]))
  .it('installs and uninstalls @oclif/example-plugin-ts (--json)')

  test
  .command(['plugins:install', '@oclif/example-plugin-ts@latest'], {reset: true})
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.contain('@oclif/example-plugin-ts'))
  .command(['plugins:uninstall', '@oclif/example-plugin-ts@latest'], {reset: true})
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
  .it('installs and uninstalls @oclif/example-plugin-ts with tags')

  if (platform() !== 'win32') {
    test
    .command(['plugins:install', 'aliasme'], {reset: true})
    .stdout()
    .command(['plugins'], {reset: true})
    .do(output => expect(output.stdout).to.contain('oclif-debug'))
    .stdout()
    .command(['debug'], {reset: true})
    .do(output => expect(output.stdout).to.contain('debug'))
    .command(['plugins:uninstall', 'oclif-debug'])
    .stdout()
    .command(['plugins'], {reset: true})
    .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
    .it('installs via an alias')
  }

  test
  .command(['plugins:install', 'jdxcode/oclif-debug'], {reset: true})
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.contain('oclif-debug'))
  .stdout()
  .command(['debug'], {reset: true})
  .do(output => expect(output.stdout).to.contain('debug'))
  .command(['plugins:uninstall', 'oclif-debug'])
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
  .it('installs and uninstalls jdxcode/oclif-debug')

  if (platform() !== 'win32') {
    test
    .command(['plugins:install', 'stubbed'], {reset: true})
    .catch(/1/)
    .stdout()
    .command(['plugins'], {reset: true})
    .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
    .it('does not install if unsure if scoped package does not exist')
  }

  test
  .command(['plugins:install', '@salesforce/plugin-custom-metadata'], {reset: true})
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.contain('custom-metadata'))
  .command(['plugins:uninstall', '@salesforce/plugin-custom-metadata'])
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
  .it('installs and uninstalls plugin with oclif.lock')

  test
  .command(['plugins:install', '@salesforce/plugin-custom-metadata@2.2.0'], {reset: true})
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.contain('custom-metadata'))
  .command(['plugins:uninstall', '@salesforce/plugin-custom-metadata'])
  .stdout()
  .command(['plugins'], {reset: true})
  .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
  .it('installs and uninstalls specific plugin version with oclif.lock')

  // test
  // .command(['plugins:install', 'heroku-debug@beta'], {reset: true})
  // .stdout()
  // .command(['plugins'], {reset: true})
  // .do(output => expect(output.stdout).to.match(/heroku-debug \d+\.\d+\.\d+-beta \(beta\)/))
  // .it('installs @heroku-cli/plugin-status@beta')

  // test
  // .skip()
  // .command(['plugins:install', 'heroku-debug'])
  // .stdout()
  // .command(['plugins'])
  // .do(output => expect(output.stdout).to.contain('heroku-debug'))
  // .stdout()
  // .command(['debug'])
  // .do(output => expect(output.stdout).to.contain('foo'))
  // .command(['plugins:uninstall', 'heroku-debug'])
  // .stdout()
  // .command(['plugins'])
  // .do(output => expect(output.stdout).to.equal('No plugins installed.\n'))
  // .it('installs and uninstalls heroku-debug')
})

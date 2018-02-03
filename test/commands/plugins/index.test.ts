import {expect, test} from '../../test'

describe('command', () => {
  test
  .command(['plugins:install', 'status'], {resetConfig: true})
  .stdout()
  .command(['plugins'], {resetConfig: true})
  .do(output => expect(output.stdout).to.contain('status '))
  .stdout()
  .command(['status'], {resetConfig: true})
  .do(output => expect(output.stdout).to.contain('No known issues at this time'))
  .command(['plugins:uninstall', '@heroku-cli/plugin-status'])
  .stdout()
  .command(['plugins'], {resetConfig: true})
  .do(output => expect(output.stdout).to.equal('no plugins installed\n'))
  .it('installs and uninstalls status')

  test
  .command(['plugins:install', '@heroku-cli/plugin-status'], {resetConfig: true})
  .stdout()
  .command(['plugins'], {resetConfig: true})
  .do(output => expect(output.stdout).to.contain('status '))
  .stdout()
  .command(['status'], {resetConfig: true})
  .do(output => expect(output.stdout).to.contain('No known issues at this time'))
  .it('installs @heroku-cli/plugin-status')

  test
  .command(['plugins:install', 'heroku-debug@beta'], {resetConfig: true})
  .stdout()
  .command(['plugins'], {resetConfig: true})
  .do(output => expect(output.stdout).to.match(/heroku-debug \d+\.\d+\.\d+-beta \(beta\)/))
  .it('installs @heroku-cli/plugin-status@beta')

  test
  .skip()
  .command(['plugins:install', 'heroku-debug'])
  .stdout()
  .command(['plugins'])
  .do(output => expect(output.stdout).to.contain('heroku-debug'))
  .stdout()
  .command(['debug'])
  .do(output => expect(output.stdout).to.contain('foo'))
  .command(['plugins:uninstall', 'heroku-debug'])
  .stdout()
  .command(['plugins'])
  .do(output => expect(output.stdout).to.equal('no plugins installed\n'))
  .it('installs and uninstalls heroku-debug')
})

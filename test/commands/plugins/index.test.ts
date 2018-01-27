import {expect, test} from '../../test'

describe('command', () => {
  test
  .command(['plugins:install', '@heroku-cli/status'])
  .stdout()
  .command(['plugins'])
  .do(output => expect(output.stdout).to.contain('@heroku-cli/status'))
  .command(['plugins:uninstall', '@heroku-cli/status'])
  .command(['plugins:uninstall', '@heroku-cli/status'])
  .stderr()
  .stdout()
  .command(['plugins'])
  .do(output => expect(output.stdout).to.equal('no plugins installed\n'))
  .it('installs and uninstalls @heroku-cli/status')
})

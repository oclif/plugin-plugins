import {test} from '../../test'

describe('command', () => {
  test
  .command(['plugins:uninstall', 'foobar'], {reset: true})
  .catch(/foobar is not installed/)
  .it('uninstall non-existent plugin')
})

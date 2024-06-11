import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import sinon from 'sinon'

describe('plugins:install', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('fails if you install root plugin', async () => {
    const {error} = await runCommand('plugins install @oclif/plugin-plugins')
    expect(error?.message).to.equal('Ignoring root plugin @oclif/plugin-plugins.')
  })
})

import {expect} from 'chai'

import {extractIssuesLocation} from '../src/util.js'

describe('extractIssuesLocation', () => {
  it('should return url if pjson.bugs is a string', () => {
    const pjson = {
      bugs: 'https://github.com/oclif/plugin-plugins/issues',
      name: '@oclif/plugin-plugins',
      repository: {
        type: 'git',
        url: 'git+https://github.com/oclif/plugin-plugins.git',
      },
      version: '1.0.0',
    }

    expect(extractIssuesLocation(pjson.bugs, pjson.repository)).to.equal(pjson.bugs)
  })

  it('should return url is pjson.bugs is an object', () => {
    const pjson = {
      bugs: {url: 'https://github.com/oclif/plugin-plugins/issues'},
      name: '@oclif/plugin-plugins',
      repository: {
        type: 'git',
        url: 'git+https://github.com/oclif/plugin-plugins.git',
      },
      version: '1.0.0',
    }

    expect(extractIssuesLocation(pjson.bugs, pjson.repository)).to.equal(pjson.bugs.url)
  })

  it('should return url if pjson.bugs is undefined and pjson.repository is a string', () => {
    const pjson = {
      name: '@oclif/plugin-plugins',
      repository: 'https://github.com/oclif/plugin-plugins.git',
      version: '1.0.0',
    }

    expect(extractIssuesLocation(undefined, pjson.repository)).to.equal(pjson.repository)
  })

  it('should return url if pjson.bugs is undefined and pjson.repository is an object', () => {
    const pjson = {
      name: '@oclif/plugin-plugins',
      repository: {
        type: 'git',
        url: 'git+https://github.com/oclif/plugin-plugins.git',
      },
      version: '1.0.0',
    }

    expect(extractIssuesLocation(undefined, pjson.repository)).to.equal('https://github.com/oclif/plugin-plugins')
  })
})

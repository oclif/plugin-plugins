import ManifestFile from '@anycli/manifest-file'

export interface File {
  manifest: {
    plugins: {
      [name: string]: {
        tag: string
      }
    }
  }
}

export default class Manifest extends ManifestFile {
  constructor(file: string) {
    super(['@anycli/plugins', file].join(':'), file)
  }

  async list(): Promise<File['manifest']['plugins']> {
    return (await this.get('plugins')) || {} as any
  }

  async add(name: string, tag: string) {
    this.debug(`adding ${name}@${tag}`)
    const plugins = await this.list()
    plugins[name] = {tag}
    await this.set(['plugins', plugins])
  }

  async remove(name: string) {
    this.debug(`removing ${name}`)
    const plugins = await this.list()
    if (!plugins[name]) return this.debug('not found in manifest')
    delete plugins[name]
    await this.set(['plugins', plugins])
  }
}

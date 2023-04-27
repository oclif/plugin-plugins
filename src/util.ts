import * as shelljs from 'shelljs'
import {type} from 'os'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import * as path from 'node:path'

export function sortBy<T>(arr: T[], fn: (i: T) => sortBy.Types | sortBy.Types[]): T[] {
  function compare(a: sortBy.Types | sortBy.Types[], b: sortBy.Types | sortBy.Types[]): number {
    a = a === undefined ? 0 : a
    b = b === undefined ? 0 : b

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length === 0 && b.length === 0) return 0
      const diff = compare(a[0], b[0])
      if (diff !== 0) return diff
      return compare(a.slice(1), b.slice(1))
    }

    if (a < b) return -1
    if (a > b) return 1
    return 0
  }

  return arr.sort((a, b) => compare(fn(a), fn(b)))
}

export namespace sortBy {
  export type Types = string | number | undefined | boolean
}

export function uniq<T>(arr: T[]): T[] {
  return arr.filter((a, i) => arr.indexOf(a) === i)
}

export function uniqWith<T>(arr: T[], fn: (a: T, b: T) => boolean): T[] {
  return arr.filter((a, i) => {
    return !arr.find((b, j) => j > i && fn(a, b))
  })
}

/**
 * Get the path to the node executable
 * If using a macos/windows/tarball installer it will use the node version included in it.
 * If that fails (or CLI was installed via npm), this will resolve to the global node installed in the system.
 * @param root - The root path of the CLI (this.config.root).
 * @returns The path to the node executable.
 */
export function findNode(root: string): string {
  const isExecutable = (filepath: string): boolean => {
    if (type() === 'Windows_NT') return filepath.endsWith('node.exe')

    try {
      if (filepath.endsWith('node')) {
        // This checks if the filepath is executable on Mac or Linux, if it is not it errors.
        fs.accessSync(filepath, fs.constants.X_OK)
        return true
      }
    } catch {
      return false
    }

    return false
  }

  const cliBinDirs = [path.join(root, 'bin'), path.join(root, 'client', 'bin')].filter(p => fs.existsSync(p))

  if (cliBinDirs.length > 0) {
    // Find the node executable
    // eslint-disable-next-line unicorn/no-array-callback-reference
    const node = shelljs.find(cliBinDirs).find((file: string) => isExecutable(file))
    if (node) {
      return fs.realpathSync(node)
    }
  }

  // Check to see if node is installed
  const nodeShellString = shelljs.which('node')
  if (nodeShellString?.code === 0 && nodeShellString?.stdout) return nodeShellString.stdout

  const err = new Error('Cannot locate node executable.')
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore override readonly .name field
  err.name = 'CannotFindNodeExecutable'
  throw err
}

/**
 * Get the path to the npm CLI file.
 * This will always resolve npm to the pinned version in `@oclif/plugin-plugins/package.json`.
 *
 * @returns The path to the `npm/bin/npm-cli.js` file.
 */
export async function findNpm(): Promise<string> {
  const npmPjsonPath = require.resolve('npm/package.json')
  const npmPjson = JSON.parse(await fsPromises.readFile(npmPjsonPath, {encoding: 'utf8'}))
  const npmPath = npmPjsonPath.slice(0, Math.max(0, npmPjsonPath.lastIndexOf(path.sep)))
  return path.join(npmPath, npmPjson.bin.npm)
}

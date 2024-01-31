import {rm} from 'node:fs/promises'

const [pathToDelete] = process.argv.slice(2)

await rm(pathToDelete, {force: true, recursive: true})

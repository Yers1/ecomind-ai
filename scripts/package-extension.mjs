import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import archiver from 'archiver'

const outputDirectory = resolve('release')
const zipPath = resolve(outputDirectory, 'ecomind-ai-chrome-extension.zip')
await mkdir(outputDirectory, { recursive: true })

await new Promise((resolvePromise, reject) => {
  const output = createWriteStream(zipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  output.on('close', resolvePromise)
  output.on('error', reject)
  archive.on('error', reject)
  archive.pipe(output)
  archive.directory(resolve('dist-extension'), false)
  void archive.finalize()
})

console.log(`Packaged installable extension at ${zipPath}`)

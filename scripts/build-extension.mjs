import { build } from 'esbuild'
import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'extension')
const output = resolve(root, 'dist-extension')

await rm(output, { recursive: true, force: true })
await mkdir(resolve(output, 'icons'), { recursive: true })

await Promise.all([
  cp(resolve(source, 'manifest.json'), resolve(output, 'manifest.json')),
  cp(resolve(source, 'popup.html'), resolve(output, 'popup.html')),
  cp(resolve(source, 'popup.css'), resolve(output, 'popup.css')),
  cp(resolve(source, 'icons'), resolve(output, 'icons'), { recursive: true }),
])

await build({
  entryPoints: {
    background: resolve(source, 'src/background.ts'),
    popup: resolve(source, 'src/popup.ts'),
    content: resolve(source, 'src/content.ts'),
  },
  outdir: output,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  minify: false,
  sourcemap: false,
  legalComments: 'none',
})

const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(resolve(output, 'manifest.json'), 'utf8'))
if (manifest.manifest_version !== 3) throw new Error('Extension build must use Manifest V3.')
for (const required of ['manifest.json', 'background.js', 'popup.html', 'popup.css', 'popup.js', 'content.js', 'icons/icon-128.png']) {
  await stat(resolve(output, required))
}

console.log(`EcoMind Chrome extension built at ${output}`)

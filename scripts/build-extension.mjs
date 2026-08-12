import { build } from 'esbuild'
import { cp, mkdir, rm, stat, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'extension')
const output = resolve(root, 'dist-extension')
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const liveVerified = process.env.VITE_SUPABASE_LIVE_VERIFIED === 'true'

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
  define: {
    __ECOMIND_SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __ECOMIND_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    __ECOMIND_SUPABASE_LIVE_VERIFIED__: JSON.stringify(liveVerified),
  },
})

const manifestPath = resolve(output, 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.manifest_version !== 3) throw new Error('Extension build must use Manifest V3.')
if (/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  manifest.host_permissions = [`${supabaseUrl}/*`]
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}
for (const required of ['manifest.json', 'background.js', 'popup.html', 'popup.css', 'popup.js', 'content.js', 'icons/icon-128.png']) {
  await stat(resolve(output, required))
}

console.log(`EcoMind Chrome extension built at ${output}`)

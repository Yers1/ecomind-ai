import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../shared/ecomind.ts', import.meta.url))],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  write: false,
})
const source = bundle.outputFiles[0].text
const core = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

const performance = core.getProductRecord('polyester-everyday-tee')
const cotton = core.getProductRecord('cotton-classic-tee')
const renew = core.getProductRecord('renew-loop-tee')
const performanceScore = core.calculateGreenScore(performance)
const cottonScore = core.calculateGreenScore(cotton)
const renewScore = core.calculateGreenScore(renew)

assert.equal(performanceScore.score, 27)
assert.equal(performanceScore.provisional, false)
assert.equal(performanceScore.breakdown.find((item) => item.key === 'recycled').score, 0, 'Confirmed 0% recycled content remains a real zero.')

assert.equal(cottonScore.score, 51)
assert.equal(cottonScore.provisional, true)
assert.deepEqual(cottonScore.range, { min: 35, max: 66 })
assert.equal(cottonScore.breakdown.find((item) => item.key === 'recycled').score, null, 'Missing recycled content must stay unknown.')
assert.equal(cottonScore.breakdown.find((item) => item.key === 'packaging').score, null, 'Missing packaging must stay unknown.')
assert.equal(core.calculateConfidence(cotton), 'Low')

assert.equal(renewScore.score, 78)
assert.equal(renewScore.provisional, false)
assert.equal(core.calculateConfidence(renew), 'High')
assert.ok(renew.factorSources.carbon[0].type === 'ecomind-estimate')

console.log('Shared core checks passed: deterministic scores, confidence, source metadata and missing-data ranges.')

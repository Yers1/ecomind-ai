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
assert.equal(performanceScore.provisional, true)
assert.equal(performanceScore.breakdown.find((item) => item.key === 'fulfilmentPackaging').score, null)
assert.equal(performanceScore.breakdown.find((item) => item.key === 'manufacturerPackaging').weight, 0.05)
assert.equal(performanceScore.breakdown.find((item) => item.key === 'recycled').score, 0, 'Confirmed 0% recycled content remains a real zero.')

assert.equal(cottonScore.score, 51)
assert.equal(cottonScore.provisional, true)
assert.deepEqual(cottonScore.range, { min: 35, max: 66 })
assert.equal(cottonScore.breakdown.find((item) => item.key === 'recycled').score, null, 'Missing recycled content must stay unknown.')
assert.equal(cottonScore.breakdown.find((item) => item.key === 'fulfilmentPackaging').score, null, 'Missing fulfilment packaging must stay unknown.')
assert.equal(cottonScore.breakdown.find((item) => item.key === 'manufacturerPackaging').score, null, 'Missing manufacturer packaging must stay unknown.')
assert.equal(core.calculateConfidence(cotton), 'Low')

assert.equal(renewScore.score, 78)
assert.equal(renewScore.provisional, false)
assert.equal(core.calculateConfidence(renew), 'High')
assert.ok(renew.factorSources.carbon[0].type === 'ecomind-estimate')

assert.deepEqual(core.migrateLegacyPackaging('Individual plastic polybag').fulfilment, null)
assert.match(core.migrateLegacyPackaging('Individual plastic polybag').manufacturer.description, /polybag/i)
assert.match(core.migrateLegacyPackaging('Recycled delivery mailer').fulfilment.description, /mailer/i)
assert.ok(core.migrateLegacyPackaging('Packaging included').legacy, 'Ambiguous legacy evidence must require review.')
assert.equal(Object.values(core.SCORE_WEIGHTS).reduce((sum, weight) => sum + weight, 0), 1)

const verifiedEnvironmental = { certificationId: 'test-environmental', displayedName: 'Test Environmental Standard', rawClaim: 'Product certified', status: 'verified', evidenceSource: 'badge', sourceLabel: 'Test badge', confidence: 'high', affectsEnvironmentalScore: true, affectsPeopleInformation: false }
const similarWithoutCertification = { ...renew, id: 'similar-without-certification', certifications: [], missingFields: ['One gap'] }
const similarWithCertification = { ...renew, id: 'similar-with-certification', certifications: [verifiedEnvironmental], missingFields: ['One gap'] }
assert.equal(core.calculateGreenScore(similarWithCertification).certificationAdjustment, 2)
assert.equal(core.rankRecommendationCandidates(performance, [similarWithoutCertification, similarWithCertification])[0].id, 'similar-with-certification')

console.log('Shared core checks passed: deterministic scores, confidence, source metadata and missing-data ranges.')

import type { ParsedMaterial } from './parserTypes'

const MATERIAL_ALIASES: Array<{ pattern: string; normalised: string }> = [
  { pattern: 'regenerative\\s+organic\\s+cotton', normalised: 'Regenerative Organic Cotton' },
  { pattern: 'repreve(?:®)?(?:\\s+recycled)?\\s+polyester', normalised: 'Recycled polyester' },
  { pattern: 'recycled\\s+polyester|rpet', normalised: 'Recycled polyester' },
  { pattern: 'recycled\\s+cotton', normalised: 'Recycled cotton' },
  { pattern: 'organic\\s+cotton', normalised: 'Organic cotton' },
  { pattern: 'recycled\\s+nylon', normalised: 'Recycled nylon' },
  { pattern: 'recycled\\s+wool', normalised: 'Recycled wool' },
  { pattern: 'recycled\\s+fib(?:re|er)s?', normalised: 'Recycled fibres' },
  { pattern: 'polyester', normalised: 'Polyester' },
  { pattern: 'cotton', normalised: 'Cotton' },
  { pattern: 'nylon|polyamide', normalised: 'Nylon' },
  { pattern: 'elastane|spandex', normalised: 'Elastane' },
  { pattern: 'linen|flax', normalised: 'Linen' },
  { pattern: 'hemp', normalised: 'Hemp' },
  { pattern: 'wool', normalised: 'Wool' },
  { pattern: 'rayon|viscose', normalised: 'Viscose family' },
  { pattern: 'modal|micromodal', normalised: 'Modal' },
  { pattern: 'lyocell|tencel(?:™)?', normalised: 'Lyocell' },
  { pattern: 'acrylic', normalised: 'Acrylic' },
  { pattern: 'silk', normalised: 'Silk' },
  { pattern: 'leather', normalised: 'Leather' },
]

const MATERIAL_PATTERN = MATERIAL_ALIASES.map((item) => item.pattern).join('|')

function normaliseMaterial(raw: string) {
  const lower = raw.toLowerCase()
  return MATERIAL_ALIASES.find((item) => new RegExp(`^(?:${item.pattern})$`, 'i').test(lower))?.normalised ?? raw.trim()
}

function pushUnique(materials: ParsedMaterial[], material: ParsedMaterial) {
  const existing = materials.find((item) => item.name === material.name && item.percentage === material.percentage)
  if (!existing) materials.push(material)
}

export function extractMaterials(text: string): { materials: ParsedMaterial[]; uncertain: boolean; rejected: string[] } {
  const source = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  if (!source || /(?:composition|material)(?:\s+is)?\s+not\s+disclosed/i.test(source)) return { materials: [], uncertain: false, rejected: [] }
  const materials: ParsedMaterial[] = []
  const rejected: string[] = []
  const percentFirst = new RegExp(`(\\d{1,3}(?:\\.\\d+)?)\\s*%\\s*(${MATERIAL_PATTERN})`, 'gi')
  const materialFirst = new RegExp(`(${MATERIAL_PATTERN})\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*%`, 'gi')
  const ranged = new RegExp(`(\\d{1,3})\\s*[-–]\\s*(\\d{1,3})\\s*%\\s*(${MATERIAL_PATTERN})`, 'gi')

  for (const match of source.matchAll(ranged)) {
    pushUnique(materials, { name: normaliseMaterial(match[3]), percentage: null, evidence: match[0], originalName: match[3] })
    rejected.push(`Percentage range kept uncertain: ${match[0]}`)
  }
  const withoutRanges = source.replace(ranged, ' ')
  for (const match of withoutRanges.matchAll(percentFirst)) {
    const percentage = Number(match[1])
    if (percentage > 100) { rejected.push(`Percentage above 100 rejected: ${match[0]}`); continue }
    pushUnique(materials, { name: normaliseMaterial(match[2]), percentage, evidence: match[0], originalName: match[2] })
  }
  for (const match of withoutRanges.matchAll(materialFirst)) {
    const percentage = Number(match[2])
    if (percentage > 100) { rejected.push(`Percentage above 100 rejected: ${match[0]}`); continue }
    pushUnique(materials, { name: normaliseMaterial(match[1]), percentage, evidence: match[0], originalName: match[1] })
  }
  if (!materials.length) {
    const noPercent = new RegExp(`\\b(${MATERIAL_PATTERN})\\b`, 'gi')
    for (const match of source.matchAll(noPercent)) pushUnique(materials, { name: normaliseMaterial(match[1]), percentage: null, evidence: match[0], originalName: match[1] })
  }
  const percentages = materials.map((item) => item.percentage).filter((value): value is number => value !== null)
  const total = percentages.reduce((sum, value) => sum + value, 0)
  const layered = /\b(shell|outer|lining|body|trim)\b/i.test(source)
  const uncertain = rejected.length > 0 || (percentages.length > 0 && !layered && (total < 95 || total > 105))
  if (percentages.length > 0 && !layered && (total < 95 || total > 105)) rejected.push(`Composition totals ${total}%, outside the accepted 95–105% range.`)
  return { materials, uncertain, rejected }
}

export function extractRecycledPercentage(text: string, materials: ParsedMaterial[]) {
  const explicit = text.match(/(?:at\s+least\s+)?(\d{1,3}(?:\.\d+)?)\s*%\s+(?:post-consumer\s+)?recycled(?:\s+content|\s+(?:cotton|polyester|nylon|wool|fib(?:re|er)s?))?/i)
  if (explicit) return Math.min(100, Number(explicit[1]))
  const recycled = materials.filter((item) => /^Recycled /i.test(item.name) && item.percentage !== null)
  if (!recycled.length) return null
  return Math.min(100, recycled.reduce((sum, item) => sum + (item.percentage ?? 0), 0))
}

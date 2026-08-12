import { amazonParser } from './amazonParser'
import { genericJsonLdParser } from './genericJsonLdParser'
import { genericMetaParser } from './genericMetaParser'
import { genericVisibleParser } from './genericVisibleParser'
import { hmParser } from './hmParser'
import { manualParser } from './manualParser'
import { nikeParser } from './nikeParser'
import { shopifyParser } from './shopifyParser'
import { threadlyParser } from './threadlyParser'
import type { ParserResult, ProductPageParser } from './parserTypes'

export const parserRegistry: ProductPageParser[] = [
  amazonParser,
  hmParser,
  nikeParser,
  shopifyParser,
  threadlyParser,
  genericJsonLdParser,
  genericMetaParser,
  genericVisibleParser,
  manualParser,
]

export function parseProductPage(document: Document, url: string): ParserResult {
  const parser = parserRegistry.find((candidate) => candidate.canParse(document, url)) ?? manualParser
  return parser.parse(document, url)
}

export { applyManualCorrections } from './manualParser'
export type { EvidenceSource, EvidenceSourceType, ManualCorrections, ParsedMaterial, ParsedProduct, ParserDiagnostics, ParserId, ParserResult, ProductPageParser } from './parserTypes'

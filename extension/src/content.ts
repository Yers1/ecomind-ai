import {
  PRODUCT_RECORDS,
  SCORE_WEIGHTS,
  calculateGreenScore,
  packagingEvidenceLabel,
  type ProductPackaging,
  type ScoreFactorKey,
} from "../../shared/ecomind";
import {
  applyManualCorrections,
  parseProductPage,
  type ManualCorrections,
  type ParsedProduct,
  type ParserDiagnostics,
} from "../../shared/parsers/parserRegistry";
import {
  scoreRealProduct,
  type FactorResult,
  type RealProductScore,
} from "../../shared/realProductScoring";
import {
  ECO_POINT_RULES,
  addPointEvent,
  createPointEvent,
} from "../../shared/ecoPoints";
import {
  formatTrafficLightScore,
  getTrafficLightStatus,
  trafficLightAccessibleText,
} from "../../shared/trafficLight";
import {
  queueExtensionEvent,
  readExtensionState,
  STORAGE_KEY,
  writeExtensionState,
  type ExtensionState,
  type ExtensionWishlistItem,
} from "./shared";

type AnalysisState =
  | "ready"
  | "analysing"
  | "success"
  | "missing-data"
  | "low-confidence"
  | "product-changed"
  | "unsupported-category"
  | "unsupported"
  | "error";
type DisplayAnalysis = {
  score: number | null;
  range: [number, number] | null;
  grade: string | null;
  confidence: "High" | "Medium" | "Low";
  factors: Array<{
    key: ScoreFactorKey;
    label: string;
    result: FactorResult;
    weight: number;
  }>;
  explanation: string;
  canScore: boolean;
  provisional: boolean;
  hasSufficientEvidence: boolean;
  baseScore: number | null;
  certificationAdjustment: number;
};
interface StatusMessage {
  type: "ECOMIND_STATUS_UPDATE" | "ECOMIND_GET_STATUS";
  state?: AnalysisState;
  detail?: string;
  score?: number | null;
  range?: [number, number] | null;
  grade?: string | null;
  confidence?: "High" | "Medium" | "Low";
  provisional?: boolean;
  hasSufficientEvidence?: boolean;
  baseScore?: number | null;
  certificationAdjustment?: number;
}

const ROOT_ID = "ecomind-extension-root";
const factorLabels: Record<ScoreFactorKey, string> = {
  materials: "Material impact",
  carbon: "Estimated carbon",
  recycled: "Recycled content",
  durability: "Durability and circularity",
  fulfilmentPackaging: "Fulfilment packaging",
  manufacturerPackaging: "Manufacturer packaging",
};
const knownMaterialOptions = [
  "Cotton",
  "Organic cotton",
  "Recycled cotton",
  "Polyester",
  "Recycled polyester",
  "Nylon",
  "Recycled nylon",
  "Elastane",
  "Linen",
  "Hemp",
  "Wool",
  "Recycled wool",
  "Viscose",
  "Modal",
  "Lyocell",
  "Acrylic",
  "Silk",
  "Leather",
];

let analysisState: AnalysisState = "ready";
let analysisDetail = "Ready to analyse";
let currentProduct: ParsedProduct | null = null;
let currentAnalysis: DisplayAnalysis | null = null;
let currentDiagnostics: ParserDiagnostics | null = null;
let shadow: ShadowRoot | null = null;
let initialSignature = "";
let variationObserver: MutationObserver | null = null;

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ]!,
  );
const formatMoney = (product: ParsedProduct) =>
  product.price === null
    ? "Price not detected"
    : `${product.currency ?? ""} ${product.price.toFixed(2)}`.trim();
const productKey = (product: ParsedProduct) =>
  product.productId
    ? `${product.retailer}:${product.productId}`
    : `${product.retailer}:${product.url.split("#")[0]}`;
const currentPageSignature = () =>
  `${location.pathname}${location.search}|${document.querySelector("#productTitle,main h1,h1")?.textContent?.trim() ?? ""}|${document.querySelector<HTMLInputElement>("input#ASIN")?.value ?? ""}`;

function notifyPopup(
  state: AnalysisState,
  detail: string,
  analysis?: DisplayAnalysis,
) {
  analysisState = state;
  analysisDetail = detail;
  chrome.runtime.sendMessage(
    {
      type: "ECOMIND_STATUS_UPDATE",
      state,
      detail,
      ...(analysis
        ? {
            score: analysis.score,
            range: analysis.range,
            grade: analysis.grade,
            confidence: analysis.confidence,
            provisional: analysis.provisional,
            hasSufficientEvidence: analysis.hasSufficientEvidence,
            baseScore: analysis.baseScore,
            certificationAdjustment: analysis.certificationAdjustment,
          }
        : {}),
    } satisfies StatusMessage,
    () => void chrome.runtime.lastError,
  );
}

function koalaMarkup() {
  return '<span class="koala" role="img" aria-label="EcoMind koala"><i class="ear left"></i><i class="ear right"></i><i class="face"><b class="eye left"></b><b class="eye right"></b><b class="nose"></b></i><i class="leaf"></i></span>';
}

function displayAnalysisForRecord(
  record: (typeof PRODUCT_RECORDS)[number],
): DisplayAnalysis {
  const result = calculateGreenScore(record);
  const factors = result.breakdown.map((item) => ({
    key: item.key,
    label: item.label,
    weight: item.weight,
    result:
      item.score === null
        ? { status: "unknown" as const, score: null, evidence: [] }
        : {
            status: "known" as const,
            score: Math.round(item.score),
            evidence: [],
          },
  }));
  return {
    score: result.score,
    range: result.range ? [result.range.min, result.range.max] : null,
    grade: result.grade,
    confidence: record.confidenceLevel,
    factors,
    explanation: `${result.explanation} Base environmental score: ${result.baseScore}. Verified environmental certification adjustment: +${result.certificationAdjustment}. Final Green Score: ${result.score}.`,
    canScore: true,
    provisional: result.provisional,
    hasSufficientEvidence: result.knownWeight >= 0.35,
    baseScore: result.baseScore,
    certificationAdjustment: result.certificationAdjustment,
  };
}

function displayAnalysis(product: ParsedProduct): DisplayAnalysis {
  if (product.parserUsed === "threadly" && product.productId) {
    const record = PRODUCT_RECORDS.find(
      (item) => item.id === product.productId,
    );
    if (record) return displayAnalysisForRecord(record);
  }
  const result: RealProductScore = scoreRealProduct(product);
  return {
    score: result.score,
    range: result.range,
    grade: result.grade,
    confidence: result.confidence,
    factors: (Object.keys(result.factors) as ScoreFactorKey[]).map((key) => ({
      key,
      label: factorLabels[key],
      result: result.factors[key],
      weight: SCORE_WEIGHTS[key],
    })),
    explanation: `${result.explanation} ${result.baseScore === null ? "Base environmental score unavailable." : `Base environmental score: ${result.baseScore}.`} ${result.certificationAdjustment ? `Verified environmental certification adjustment: +${result.certificationAdjustment}.` : "No verified environmental certification found; no points added or removed."}`,
    canScore: result.canScore,
    provisional: true,
    hasSufficientEvidence: result.canScore,
    baseScore: result.baseScore,
    certificationAdjustment: result.certificationAdjustment,
  };
}

function trafficIcon(colour: string) {
  return colour === "green"
    ? "✓"
    : colour === "amber"
      ? "−"
      : colour === "red"
        ? "!"
        : "?";
}
function trafficMarkup(analysis: DisplayAnalysis, compact = false) {
  const status = getTrafficLightStatus(
    analysis.score,
    analysis.hasSufficientEvidence,
  );
  const accessible = trafficLightAccessibleText(
    status,
    analysis.score,
    analysis.provisional,
    analysis.confidence,
    analysis.range,
  );
  return `<div class="traffic traffic--${status.colour}${compact ? " traffic--compact" : ""}" role="img" aria-label="${escapeHtml(accessible)}" title="${escapeHtml(status.shortExplanation)}"><span class="traffic-mark">${trafficIcon(status.colour)}</span><span><strong>${escapeHtml(formatTrafficLightScore(analysis.score, analysis.provisional, compact ? null : analysis.range))}${analysis.grade ? ` · ${escapeHtml(analysis.grade)}` : ""}</strong><b>${escapeHtml(status.label)}${analysis.provisional && analysis.score !== null ? " · Provisional" : ""}</b><small>${escapeHtml(analysis.confidence)} confidence</small></span></div>`;
}

function reliabilityLabel(sourceType: string) {
  if (sourceType === "json-ld" || sourceType === "amazon-selector")
    return "Verified page evidence";
  if (sourceType === "manual-user-input") return "User-provided";
  if (sourceType === "ecomind-estimate") return "EcoMind estimate";
  return "Page-text extraction";
}

function factorMarkup(item: DisplayAnalysis["factors"][number]) {
  const factor = item.result;
  const value =
    factor.status === "unknown"
      ? "Not disclosed"
      : factor.status === "estimated"
        ? `~${factor.score}/100 · ${factor.range[0]}–${factor.range[1]}`
        : `${factor.score}/100`;
  const evidence = factor.evidence
    .map((source) => `${source.sourceLabel}: ${source.value}`)
    .join(" · ");
  return `<article class="factor"><strong>${escapeHtml(item.label)}</strong><b>${escapeHtml(value)}</b><p>${escapeHtml(evidence || (factor.status === "unknown" ? "No supporting evidence found on this page." : "Directly disclosed product evidence."))}</p><small>${Math.round(item.weight * 100)}% weight · ${factor.status}</small></article>`;
}

function extractedMarkup(product: ParsedProduct) {
  const evidenceRows = product.evidence.length
    ? product.evidence
        .map(
          (item) =>
            `<li><div><strong>${escapeHtml(item.field)}</strong><span>${escapeHtml(item.value ?? "Not disclosed")}</span></div><em>${escapeHtml(reliabilityLabel(item.sourceType))} · ${escapeHtml(item.sourceLabel)} · ${escapeHtml(item.confidence)}${item.selector ? ` · ${escapeHtml(item.selector)}` : ""}</em></li>`,
        )
        .join("")
    : "<li><div><strong>No automatic evidence</strong><span>Use the correction panel below.</span></div><em>Not disclosed</em></li>";
  const packageValue = (stage: "fulfilment" | "manufacturer") => {
    const value = product.packaging[stage];
    return value
      ? `${value.description ?? value.material ?? "Packaging disclosed"} · ${value.sourceType === "retailer-policy" ? "Estimated from retailer policy" : value.sourceLabel} · ${value.confidence} confidence`
      : "Not disclosed";
  };
  const certifications = product.certifications.length
    ? product.certifications.map((item) => `<li><div><strong>${escapeHtml(item.affectsPeopleInformation ? "People certification" : item.affectsEnvironmentalScore ? "Environmental certification" : "Certification candidate")}</strong><span>${escapeHtml(item.displayedName)} · ${escapeHtml(item.status)}</span></div><em>${escapeHtml(item.rawClaim)} · ${escapeHtml(item.sourceLabel)} · ${escapeHtml(item.confidence)} confidence${item.affectsEnvironmentalScore ? " · eligible when verified" : " · not included in environmental score"}</em></li>`).join("")
    : '<li><div><strong>Certification</strong><span>Not found</span></div><em>No points added or removed.</em></li>';
  const claims = product.sustainabilityClaims.map((claim) => `<li><div><strong>Unverified sustainability claim</strong><span>${escapeHtml(claim)}</span></div><em>0 certification points</em></li>`).join("");
  return `<details class="extraction"><summary>See what EcoMind extracted</summary><p class="extract-intro">Original page evidence stays beside every normalised value. Retailer policy and product-page evidence remain separate.</p><h4 class="extract-subhead">Materials and certifications</h4><ul class="evidence-list">${certifications}${claims}</ul><ul class="evidence-list">${evidenceRows}</ul><div class="normalised"><div><span>Materials</span><b>${escapeHtml(product.materials.map((item) => `${item.percentage ?? "?"}% ${item.name}`).join(", ") || "Not disclosed")}</b></div><div><span>Recycled content</span><b>${product.recycledContentPercentage === null ? "Not disclosed" : `${product.recycledContentPercentage}%`}</b></div><div><span>Fulfilment packaging · 5%</span><b>${escapeHtml(packageValue("fulfilment"))}</b></div><div><span>Manufacturer packaging · 5%</span><b>${escapeHtml(packageValue("manufacturer"))}</b></div><div><span>Weight</span><b>${product.weightGrams === null ? "Not disclosed" : `${Math.round(product.weightGrams)} g`}</b></div><div><span>Country of origin</span><b>${escapeHtml(product.countryOfOrigin ?? "Not disclosed")}</b></div><div><span>Care</span><b>${escapeHtml(product.careInstructions ?? "Not disclosed")}</b></div></div></details>`;
}

function manualMarkup(product: ParsedProduct) {
  const certificationFields = `<fieldset><legend>Certification evidence</legend><label>Exact wording<textarea name="certificationClaim" rows="2" placeholder="Paste the exact certification wording"></textarea></label><label>Certification URL or ID<input name="certificationSourceUrl" placeholder="URL or certification ID"></label><label><input type="checkbox" name="certificationAsSellerClaim"> Treat as seller claim only</label><label><input type="checkbox" name="certificationNotDisclosed"> Certification not disclosed</label><p>User-provided evidence is never automatically verified.</p></fieldset>`;
  return `<details class="manual"><summary>Help EcoMind complete this analysis</summary><form id="manualForm"><label>Product title<input name="title" value="${escapeHtml(product.title)}" autocomplete="off"></label><label>Material-composition text<textarea name="materialText" rows="3" placeholder="Example: 60% organic cotton, 40% recycled polyester"></textarea></label><div class="manual-grid"><label>Material<select name="material"><option value="">Select if useful</option>${knownMaterialOptions.map((item) => `<option>${item}</option>`).join("")}</select></label><label>Percentage<input name="materialPercentage" type="number" min="0" max="100" inputmode="decimal"></label><label>Recycled content %<input name="recycled" type="number" min="0" max="100" inputmode="decimal"></label></div>${certificationFields}<fieldset><legend>Packaging — provide each stage separately</legend><label>Fulfilment packaging<textarea name="fulfilmentPackaging" rows="2" placeholder="Delivery box, mailer, bag or reduced-packaging option"></textarea></label><label>Source or observation<input name="fulfilmentPackagingSource" placeholder="Shown beside delivery options"></label><label><input type="checkbox" name="fulfilmentPackagingUncertain"> This fulfilment information is uncertain</label><label>Manufacturer packaging<textarea name="manufacturerPackaging" rows="2" placeholder="Individual polybag, branded box or wrapping"></textarea></label><label>Source or observation<input name="manufacturerPackagingSource" placeholder="Shown in product details"></label><label><input type="checkbox" name="manufacturerPackagingUncertain"> This manufacturer information is uncertain</label></fieldset><fieldset><legend>Explicitly mark as not disclosed</legend><label><input type="checkbox" name="missingMaterials"> Materials</label><label><input type="checkbox" name="missingRecycled"> Recycled content</label><label><input type="checkbox" name="missingFulfilmentPackaging"> Fulfilment packaging</label><label><input type="checkbox" name="missingManufacturerPackaging"> Manufacturer packaging</label></fieldset><label class="save-correction"><input type="checkbox" name="remember"> Save these corrections for this product only</label><button type="submit">Re-run provisional score</button><p>Manual values are labelled “User-provided” and never represented as retailer evidence. EcoMind does not open checkout automatically.</p></form></details>`;
}

function comparisonMarkup(state: ExtensionState, product: ParsedProduct) {
  const packagingRows = (packaging?: ProductPackaging) =>
    `<small><b>Fulfilment · 5%:</b> ${escapeHtml(packagingEvidenceLabel(packaging?.fulfilment ?? null))}</small><small><b>Manufacturer · 5%:</b> ${escapeHtml(packagingEvidenceLabel(packaging?.manufacturer ?? null))}</small>`;
  if (product.parserUsed === "threadly") {
    const record = PRODUCT_RECORDS.find(
      (item) => item.id === product.productId,
    );
    const alternative = PRODUCT_RECORDS.find(
      (item) => item.id === record?.alternativeProductId,
    );
    if (!alternative)
      return '<section class="guidance"><h3>General improvement guidance</h3><p>Repair, reuse, buy second-hand or look for stronger disclosed evidence before purchasing.</p></section>';
    const alternativeAnalysis = displayAnalysisForRecord(alternative);
    return `<section class="guidance"><span>THREADLY DEMO ALTERNATIVE</span><h3>${escapeHtml(alternative.productName)}</h3><p>This fictional option remains available only in the controlled Threadly demo. It is never presented as a real retailer listing.</p><div class="demo-alternative">${trafficMarkup(alternativeAnalysis, true)}<small>£${alternative.price.toFixed(2)} · ${alternative.recycledContentPercentage ?? 0}% recycled content</small><small>${escapeHtml(alternative.tradeOff)}</small></div><div class="guidance-actions"><button class="compare-threadly" type="button">Record demo comparison</button><button class="save-threadly" type="button">Save demo alternative</button></div></section>`;
  }
  const previous = [...state.wishlist]
    .reverse()
    .find(
      (item) =>
        item.url && item.id !== productKey(product) && item.materials?.length,
    );
  if (!previous)
    return '<section class="guidance"><h3>Compare real evidence, not fictional products</h3><p>Save this product for comparison, open another clothing product on any supported store, then analyse it. EcoMind stores only the extracted comparison fields—not the webpage.</p></section>';
  const previousStatus = getTrafficLightStatus(
    previous.score,
    previous.score !== null,
  );
  const previousAccessible = trafficLightAccessibleText(
    previousStatus,
    previous.score,
    true,
    previous.confidenceLevel,
  );
  return `<section class="real-compare"><span>PREVIOUSLY ANALYSED PRODUCT</span><h3>Compare across retailers</h3><div class="compare-grid"><div><b>${escapeHtml(product.title)}</b><small>${escapeHtml(product.retailer)}</small>${currentAnalysis ? trafficMarkup(currentAnalysis, true) : ""}<div class="compare-packaging">${packagingRows(product.packaging)}</div></div><div><b>${escapeHtml(previous.productName)}</b><small>${escapeHtml(previous.retailer ?? "Previous retailer")}</small><div class="traffic traffic--${previousStatus.colour} traffic--compact" role="img" aria-label="${escapeHtml(previousAccessible)}" title="${escapeHtml(previousStatus.shortExplanation)}"><span class="traffic-mark">${trafficIcon(previousStatus.colour)}</span><span><strong>${escapeHtml(formatTrafficLightScore(previous.score, true, null))}${previous.grade ? ` · ${escapeHtml(previous.grade)}` : ""}</strong><b>${escapeHtml(previousStatus.label)} · Provisional</b><small>${escapeHtml(previous.confidenceLevel)} confidence</small></span></div><div class="compare-packaging">${packagingRows(previous.packaging)}</div></div></div><button class="compare-previous" type="button" data-previous="${escapeHtml(previous.id)}">Record real-product comparison</button></section>`;
}

const styles = `:host{all:initial;font-family:"Segoe UI",system-ui,sans-serif;color:#102a2c}*{box-sizing:border-box}button,input,textarea,select{font:inherit}button:focus-visible,summary:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid rgba(22,115,77,.34);outline-offset:2px}.widget{position:fixed;z-index:2147483600;right:22px;bottom:22px;min-width:300px;min-height:76px;padding:9px 13px 9px 9px;display:flex;align-items:center;gap:11px;border:0;border-radius:16px;background:#102f30;color:#f5fff9;box-shadow:0 8px 24px rgba(8,35,31,.3);cursor:pointer;text-align:left}.widget .copy{display:flex;flex:1;flex-direction:column}.widget .copy strong{font-size:13px}.widget .copy small{font-size:10px;color:#abc8bb}.widget .score{min-width:58px;padding-right:10px;border-right:1px solid rgba(255,255,255,.2)}.widget .score strong{font-size:20px}.widget .score small{font-size:9px;color:#aac5ba}.widget .score b{display:block;margin-top:2px;color:#8edcaf;font-size:9px}.koala{position:relative;width:54px;height:54px;display:inline-block;flex:none}.koala .face{position:absolute;z-index:2;inset:9px 6px 2px;border-radius:48%;background:#a9b6b1;border:1px solid #657773}.koala .ear{position:absolute;z-index:1;top:6px;width:20px;height:23px;border-radius:50%;background:#879995;border:1px solid #657773;box-shadow:inset 0 0 0 5px #c8d0cd}.koala .ear.left{left:0}.koala .ear.right{right:0}.koala .eye{position:absolute;top:18px;width:5px;height:6px;border-radius:50%;background:#172d2d}.koala .eye.left{left:11px}.koala .eye.right{right:11px}.koala .nose{position:absolute;top:24px;left:50%;width:12px;height:14px;transform:translateX(-50%);border-radius:45%;background:#243a39}.koala .leaf{position:absolute;z-index:4;right:0;top:0;width:15px;height:10px;border-radius:80% 10%;transform:rotate(-24deg);background:#16734d}.layer{position:fixed;z-index:2147483601;inset:0;background:rgba(9,30,29,.5);opacity:0;pointer-events:none}.layer.open{opacity:1;pointer-events:auto}.drawer{position:absolute;right:0;top:0;width:min(100%,620px);height:100%;display:flex;flex-direction:column;background:#f5f8f6;box-shadow:-8px 0 24px rgba(8,35,31,.22);transform:translateX(100%);transition:transform .22s cubic-bezier(.16,1,.3,1)}.layer.open .drawer{transform:none}.drawer-header{height:68px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d9e3dd;background:#fff}.drawer-header div{display:flex;flex-direction:column}.drawer-header span{font-size:9px;color:#60736e}.close{width:40px;height:40px;border:1px solid #d4dfd8;border-radius:11px;background:#fff;font-size:22px}.drawer-body{flex:1;overflow:auto;padding:20px 20px 94px}.product{display:flex;gap:13px;align-items:center}.product img{width:72px;height:72px;border-radius:11px;object-fit:cover}.product span,.meta-row{font-size:9px;color:#647873}.product h2{margin:3px 0;font-size:18px;line-height:1.2}.product b{font-size:12px}.meta-row{margin-top:10px;display:flex;flex-wrap:wrap;gap:5px}.meta-row span{padding:5px 7px;border-radius:7px;background:#e8efeb}.score-hero{margin-top:16px;padding:17px;display:grid;grid-template-columns:auto 1fr;gap:16px;border-radius:14px;background:#fff3dc}.big-score strong{font-size:43px}.big-score small{font-size:10px}.big-score b{display:block;width:28px;padding:4px;border-radius:6px;background:#9a5437;color:#fff;text-align:center}.score-copy h3{margin:2px 0 5px;font-size:14px}.score-copy p{margin:0;font-size:10px;line-height:1.45;color:#60716e}.local-note{margin-top:9px;padding:10px 11px;border-radius:10px;background:#f0edf7;color:#63567b;font-size:10px;line-height:1.45}.section{margin-top:22px}.section h3{margin:0 0 9px;font-size:14px}.breakdown{display:grid;gap:6px}.factor{padding:11px 12px;display:grid;grid-template-columns:1fr auto;gap:4px;border:1px solid #d9e3dd;border-radius:11px;background:#fff}.factor strong,.factor b{font-size:11px}.factor p{grid-column:1/span 2;margin:0;color:#687976;font-size:9px;line-height:1.4}.factor small{grid-column:1/span 2;color:#81908b;font-size:8px}details{margin-top:15px;border:1px solid #d9e3dd;border-radius:11px;background:#fff}summary{padding:12px;font-size:11px;font-weight:750;cursor:pointer}.extract-intro,details>p{margin:0;padding:0 12px 12px;color:#60716e;font-size:9px;line-height:1.5}.evidence-list{margin:0;padding:0 12px 10px;list-style:none}.evidence-list li{padding:8px 0;border-top:1px solid #e4eae6}.evidence-list div{display:flex;justify-content:space-between;gap:10px;font-size:9px}.evidence-list em{display:block;margin-top:3px;color:#72827e;font-size:8px;font-style:normal}.normalised{padding:0 12px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px}.normalised div{padding:8px;border-radius:8px;background:#edf4f0}.normalised span{display:block;color:#71817e;font-size:8px}.normalised b{font-size:9px}.missing{margin-top:16px;padding:12px;border-radius:11px;background:#fff3df}.missing h3{margin:0;font-size:12px}.missing ul{margin:7px 0 0;padding-left:17px;font-size:9px}.missing p{margin:7px 0 0;font-size:9px;color:#76532e}.manual form{padding:0 12px 12px}.manual label{display:grid;gap:4px;margin-top:8px;color:#536a64;font-size:9px}.manual input,.manual textarea,.manual select{width:100%;padding:8px;border:1px solid #bdcbc4;border-radius:8px;background:#fff;color:#17322e;font-size:10px}.manual-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.manual fieldset{margin-top:9px;padding:8px;border:1px solid #d9e3dd;border-radius:8px}.manual fieldset label,.save-correction{display:flex!important;align-items:center;gap:6px}.manual input[type="checkbox"]{width:auto}.manual button,.compare-previous,.guidance-actions button{width:100%;min-height:40px;margin-top:10px;border:0;border-radius:9px;background:#16734d;color:#fff;font-size:10px;font-weight:750}.manual form p{margin:7px 0 0;color:#71817e;font-size:8px}.guidance,.real-compare{margin-top:19px;padding:14px;border-radius:13px;background:#102f30;color:#fff}.guidance span,.real-compare>span{color:#8edcaf;font-size:8px}.guidance h3,.real-compare h3{margin:4px 0 6px;font-size:13px}.guidance p{margin:0;color:#b7cdc3;font-size:9px;line-height:1.45}.demo-alternative{margin-top:10px;padding:10px;border-radius:8px;background:rgba(255,255,255,.08)}.demo-alternative b,.demo-alternative small{display:block}.demo-alternative b{color:#8edcaf;font-size:12px}.demo-alternative small{margin-top:3px;color:#b7cdc3;font-size:9px}.guidance-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.guidance-actions .save-threadly{background:#edf7f1;color:#124b38}.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.compare-grid div{padding:9px;border-radius:8px;background:rgba(255,255,255,.08)}.compare-grid b,.compare-grid small,.compare-grid strong{display:block;font-size:9px}.compare-grid small{color:#b7cdc3}.compare-grid strong{margin-top:5px;color:#8edcaf}.diagnostics{font-family:ui-monospace,monospace}.diagnostics pre{margin:0;padding:0 12px 12px;white-space:pre-wrap;word-break:break-word;font-size:8px}.disclaimer{margin:16px 0 0;color:#72827e;font-size:9px;line-height:1.5;text-align:center}.drawer-footer{position:absolute;left:0;right:0;bottom:0;padding:12px 20px;border-top:1px solid #d9e3dd;background:#fff}.drawer-footer button{width:100%;min-height:44px;border:0;border-radius:10px;background:#16734d;color:#fff;font-weight:750}.toast{position:fixed;z-index:2147483602;right:22px;bottom:110px;max-width:330px;padding:12px;border-radius:10px;background:#173b32;color:#fff;font-size:10px}@media(max-width:620px){.widget{right:10px;left:10px;bottom:10px}.drawer{width:100%}.drawer-body{padding-inline:13px}.score-hero{grid-template-columns:1fr}.normalised,.manual-grid,.guidance-actions{grid-template-columns:1fr}.drawer-footer{padding-inline:13px}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;

const trafficStyles = `.traffic{display:flex;align-items:center;gap:9px;min-width:180px}.traffic>span:last-child{display:flex;flex-direction:column}.traffic strong{font-size:14px;line-height:1.15}.traffic b{margin-top:2px;font-size:10px}.traffic small{margin-top:2px;font-size:9px;color:#60736e}.traffic-mark{width:30px;height:30px;display:grid;place-items:center;flex:none;border-radius:50%;font-size:17px;font-weight:900}.traffic--green .traffic-mark{background:#176b45;color:#fff}.traffic--amber .traffic-mark{border-radius:7px;background:#a66a00;color:#fff}.traffic--red .traffic-mark{background:#a33c32;color:#fff}.traffic--grey .traffic-mark{border:2px solid #65736f;background:#fff;color:#394b47}.traffic--green b{color:#176b45}.traffic--amber b{color:#805500}.traffic--red b{color:#96352d}.traffic--grey b{color:#53635f}.traffic--compact{min-width:150px;gap:7px}.traffic--compact .traffic-mark{width:24px;height:24px;font-size:13px}.traffic--compact strong{font-size:11px}.traffic--compact b,.traffic--compact small{font-size:8px}.widget>.traffic{color:#fff}.widget>.traffic small{color:#abc8bb}.widget>.traffic b{color:#fff}.score-hero>.traffic{align-self:start}.score-hero>.traffic strong{font-size:22px}.traffic-legend ul{margin:0;padding:0 12px 10px;display:grid;gap:6px;list-style:none}.traffic-legend li{display:flex;align-items:center;gap:7px;font-size:9px}.traffic-legend i{width:20px;height:20px;display:grid;place-items:center;border-radius:50%;color:#fff;font-style:normal;font-weight:900}.traffic-legend i.green{background:#176b45}.traffic-legend i.amber{border-radius:6px;background:#a66a00}.traffic-legend i.red{background:#a33c32}.traffic-legend i.grey{border:2px solid #65736f;background:#fff;color:#394b47}.traffic-legend p{padding:0 12px 12px}.compare-grid .traffic{margin-top:7px}`;

const brightTrafficStyles = `.traffic--green .traffic-mark,.traffic-legend i.green{background:#22c55e;color:#123d24}.traffic--amber .traffic-mark,.traffic-legend i.amber{background:#f59e0b;color:#3d2600}.traffic--amber b{color:#854d0e}.traffic--red .traffic-mark,.traffic-legend i.red{background:#ef4444}.extract-subhead{margin:0;padding:0 12px 8px;font-size:10px}.compare-packaging{margin-top:7px}.compare-packaging small{margin-top:4px}`;

function renderExtension(
  product: ParsedProduct,
  analysis: DisplayAnalysis,
  state: ExtensionState,
  diagnostics: ParserDiagnostics,
) {
  document.getElementById(ROOT_ID)?.remove();
  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.setAttribute("aria-label", "EcoMind AI extension analysis");
  document.documentElement.appendChild(host);
  shadow = host.attachShadow({ mode: "open" });
  const status = getTrafficLightStatus(
    analysis.score,
    analysis.hasSufficientEvidence,
  );
  const rangeLabel = analysis.range
    ? `${analysis.range[0]}–${analysis.range[1]}/100 possible range`
    : "Not enough evidence for a range";
  const missing = product.missingFields.length
    ? product.missingFields
        .map((field) => `<li>${escapeHtml(field)}: Not disclosed</li>`)
        .join("")
    : "<li>No major fields missing.</li>";
  const debugEnabled =
    new URLSearchParams(location.search).get("ecomind-debug") === "true" ||
    state.preferences.diagnosticsEnabled;
  const diagnosticsMarkup = debugEnabled
    ? `<details class="diagnostics"><summary>Developer diagnostics</summary><pre>${escapeHtml(JSON.stringify({ ...diagnostics, finalConfidence: analysis.confidence, scoringInputs: analysis.factors }, null, 2))}</pre></details>`
    : "";
  shadow.innerHTML = `<style>${styles}</style><button class="widget" type="button" aria-label="${escapeHtml(trafficLightAccessibleText(status, analysis.score, analysis.provisional, analysis.confidence, analysis.range))} Open EcoMind analysis.">${koalaMarkup()}${trafficMarkup(analysis, true)}<span class="copy"><strong>${escapeHtml(status.label)}</strong><small>${escapeHtml(analysis.confidence)} confidence · Open analysis</small></span></button><div class="layer" role="presentation"><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="ecomind-title"><header class="drawer-header"><div><strong>EcoMind analysis</strong><span>Local · ${escapeHtml(product.retailer)} · ${escapeHtml(product.parserUsed)}</span></div><button class="close" type="button" aria-label="Close EcoMind analysis">×</button></header><div class="drawer-body"><section class="product">${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.title ?? "Product image")}">` : ""}<div><span>${escapeHtml(product.retailer)}</span><h2 id="ecomind-title">${escapeHtml(product.title ?? "Product information needed")}</h2><b>${escapeHtml(formatMoney(product))}</b></div></section><div class="meta-row"><span>Parser: ${escapeHtml(product.parserUsed)}</span><span>${escapeHtml(product.url)}</span><span>${analysis.factors.filter((item) => item.result.status !== "unknown").length}/5 factors supported</span></div><section class="score-hero">${trafficMarkup(analysis)}<div class="score-copy"><h3>${escapeHtml(analysis.explanation)}</h3><p>${escapeHtml(rangeLabel)}. Missing evidence is unknown, never confirmed zero.</p></div></section><details class="traffic-legend"><summary>How to read the traffic light</summary><ul><li><i class="green">✓</i> Green: Lower impact based on available evidence</li><li><i class="amber">−</i> Amber: Mixed environmental impact</li><li><i class="red">!</i> Red: Higher environmental impact</li><li><i class="grey">?</i> Grey: Not enough information</li></ul><p>Product status only. A green result is not a certification and leaderboard positions never use these colours.</p></details><div class="local-note"><strong>Local evidence analysis.</strong> EcoMind structures product information from this active page. The deterministic prototype formula—not AI—calculates the provisional midpoint and range.</div>${extractedMarkup(product)}<section class="section"><h3>Score breakdown</h3><div class="breakdown">${analysis.factors.map(factorMarkup).join("")}</div></section><section class="missing"><h3>Missing information</h3><ul>${missing}</ul><p>Absence of disclosure does not prove poor environmental performance. It lowers confidence and widens the range.</p></section>${manualMarkup(product)}${comparisonMarkup(state, product)}${diagnosticsMarkup}<p class="disclaimer">Provisional scores are estimates, not certifications. Retail pages can be incomplete or change without notice. EcoMind sends no product information to a server.</p></div><footer class="drawer-footer"><button class="save" type="button">Save for comparison</button></footer></aside></div>`;

  const factorCount = shadow.querySelector<HTMLElement>(".meta-row span:last-child");
  if (factorCount) factorCount.textContent = `${analysis.factors.filter((item) => item.result.status !== "unknown").length}/6 factors supported`;
  const widgetSummary = shadow.querySelector<HTMLElement>(".widget .copy small");
  if (widgetSummary) widgetSummary.textContent = `${analysis.confidence} confidence · Packaging 5% + 5% · Open analysis`;
  const trafficStyle = document.createElement("style");
  trafficStyle.textContent = trafficStyles + brightTrafficStyles;
  shadow.prepend(trafficStyle);
  const layer = shadow.querySelector<HTMLElement>(".layer")!;
  const widget = shadow.querySelector<HTMLButtonElement>(".widget")!;
  const close = shadow.querySelector<HTMLButtonElement>(".close")!;
  const openDrawer = () => {
    layer.classList.add("open");
    document.body.inert = true;
    close.focus();
  };
  const closeDrawer = () => {
    layer.classList.remove("open");
    document.body.inert = false;
    widget.focus();
  };
  widget.addEventListener("click", openDrawer);
  close.addEventListener("click", closeDrawer);
  layer.addEventListener("click", (event) => {
    if (event.target === layer) closeDrawer();
  });
  shadow.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent) || !layer.classList.contains("open"))
      return;
    if (event.key === "Escape") {
      closeDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...shadow!.querySelectorAll<HTMLElement>(
        "button:not([disabled]),summary,input:not([disabled]),textarea:not([disabled]),select:not([disabled])",
      ),
    ];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && shadow!.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && shadow!.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  shadow
    .querySelector<HTMLButtonElement>(".save")!
    .addEventListener("click", () => void saveForComparison(product, analysis));
  shadow
    .querySelector<HTMLButtonElement>(".compare-previous")
    ?.addEventListener("click", () => void recordRealComparison(product));
  shadow
    .querySelector<HTMLButtonElement>(".compare-threadly")
    ?.addEventListener("click", () => void recordThreadlyComparison(product));
  shadow
    .querySelector<HTMLButtonElement>(".save-threadly")
    ?.addEventListener("click", () => void saveThreadlyAlternative(product));
  shadow
    .querySelector<HTMLFormElement>("#manualForm")!
    .addEventListener(
      "submit",
      (event) => void submitManualCorrection(event, product),
    );
  openDrawer();
}

function showToast(message: string) {
  shadow?.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  shadow?.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function wishlistItem(
  product: ParsedProduct,
  analysis: DisplayAnalysis,
): ExtensionWishlistItem {
  return {
    id: productKey(product),
    productName: product.title ?? "Untitled product",
    price: product.price,
    currency: product.currency,
    score: analysis.score,
    scoreRange: analysis.range,
    grade: analysis.grade,
    confidenceLevel: analysis.confidence,
    alternativeAvailable: false,
    retailer: product.retailer,
    url: product.url,
    parserUsed: product.parserUsed,
    materials: product.materials,
    recycledContentPercentage: product.recycledContentPercentage,
    packaging: product.packaging,
    certifications: product.certifications,
    sustainabilityClaims: product.sustainabilityClaims,
  };
}

async function saveForComparison(
  product: ParsedProduct,
  analysis: DisplayAnalysis,
) {
  const state = await readExtensionState();
  const item = wishlistItem(product, analysis);
  const index = state.wishlist.findIndex((saved) => saved.id === item.id);
  if (index >= 0) state.wishlist[index] = item;
  else state.wishlist.push(item);
  await writeExtensionState(state);
  showToast(
    index >= 0
      ? "Saved comparison record updated."
      : "Extracted fields saved for real-product comparison.",
  );
}

async function recordRealComparison(product: ParsedProduct) {
  const state = await readExtensionState();
  const key = `real-compare-${productKey(product)}`;
  if (!state.completedActions.includes(key)) {
    const event = createPointEvent({
      actionType: "compareGreenerAlternative",
      points: ECO_POINT_RULES.compareGreenerAlternative,
      source: "extension",
      deduplicationKey: key,
      title: "Real products compared",
      detail: product.title ?? product.retailer,
      selfReported: false,
    });
    state.pointEvents = addPointEvent(state.pointEvents, event);
    queueExtensionEvent(state, event);
    state.completedActions.push(key);
    state.points += event.points;
    state.activities.unshift({
      id: event.id,
      title: event.title,
      detail: event.detail,
      points: event.points,
      date: "Today",
      timestamp: event.timestamp,
    });
    await writeExtensionState(state);
    showToast(
      state.backendAccountId
        ? "Comparison recorded. Waiting for backend confirmation."
        : "Comparison recorded locally. +5 EcoPoints.",
    );
  } else showToast("This comparison is already recorded.");
}

async function recordThreadlyComparison(product: ParsedProduct) {
  const record = PRODUCT_RECORDS.find((item) => item.id === product.productId);
  const alternative = PRODUCT_RECORDS.find(
    (item) => item.id === record?.alternativeProductId,
  );
  if (!record || !alternative) return;
  const state = await readExtensionState();
  const key = `compare-${record.id}`;
  if (!state.completedActions.includes(key)) {
    const event = createPointEvent({
      actionType: "compareGreenerAlternative",
      points: ECO_POINT_RULES.compareGreenerAlternative,
      source: "extension",
      deduplicationKey: key,
      title: "Greener demo alternative compared",
      detail: alternative.productName,
      selfReported: false,
    });
    state.pointEvents = addPointEvent(state.pointEvents, event);
    queueExtensionEvent(state, event);
    state.completedActions.push(key);
    state.points += event.points;
    state.activities.unshift({
      id: event.id,
      title: event.title,
      detail: event.detail,
      points: event.points,
      date: "Today",
      timestamp: event.timestamp,
    });
    await writeExtensionState(state);
    showToast(
      state.backendAccountId
        ? "Comparison waiting for backend confirmation."
        : "Demo comparison recorded locally. +5 EcoPoints.",
    );
  } else showToast("This demo comparison is already recorded.");
}

async function saveThreadlyAlternative(product: ParsedProduct) {
  const record = PRODUCT_RECORDS.find((item) => item.id === product.productId);
  const alternative = PRODUCT_RECORDS.find(
    (item) => item.id === record?.alternativeProductId,
  );
  if (!alternative) return;
  const result = calculateGreenScore(alternative);
  const state = await readExtensionState();
  const id = `Threadly demo:${alternative.id}`;
  const key = `save-${alternative.id}`;
  const item: ExtensionWishlistItem = {
    id,
    productName: alternative.productName,
    price: alternative.price,
    currency: alternative.currency,
    score: result.score,
    scoreRange: result.range ? [result.range.min, result.range.max] : null,
    grade: result.grade,
    confidenceLevel: alternative.confidenceLevel,
    alternativeAvailable: false,
    retailer: "Threadly demo",
    url: `${location.origin}${location.pathname}#/demo`,
    parserUsed: "threadly",
    materials: alternative.materials.map((material) => ({
      name: material.material,
      percentage: material.percentage,
      evidence: alternative.listingText,
    })),
    recycledContentPercentage: alternative.recycledContentPercentage,
    packaging: alternative.packaging,
    certifications: alternative.certifications,
    sustainabilityClaims: alternative.sustainabilityClaims,
  };
  const index = state.wishlist.findIndex((saved) => saved.id === id);
  if (index >= 0) state.wishlist[index] = item;
  else state.wishlist.push(item);
  if (!state.completedActions.includes(key)) {
    const event = createPointEvent({
      actionType: "saveLowerImpactOption",
      points: ECO_POINT_RULES.saveLowerImpactOption,
      source: "extension",
      deduplicationKey: key,
      title: "Demo alternative saved",
      detail: alternative.productName,
      selfReported: false,
    });
    state.pointEvents = addPointEvent(state.pointEvents, event);
    queueExtensionEvent(state, event);
    state.completedActions.push(key);
    state.points += event.points;
    state.activities.unshift({
      id: event.id,
      title: event.title,
      detail: event.detail,
      points: event.points,
      date: "Today",
      timestamp: event.timestamp,
    });
  }
  await writeExtensionState(state);
  showToast(
    index >= 0
      ? "Saved demo alternative updated."
      : "Demo alternative saved. +5 demo EcoPoints.",
  );
}

async function submitManualCorrection(
  event: SubmitEvent,
  product: ParsedProduct,
) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const materialText = [
    String(data.get("materialText") ?? "").trim(),
    data.get("material") && data.get("materialPercentage")
      ? `${data.get("materialPercentage")}% ${data.get("material")}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  const missing = [
    data.get("missingMaterials") ? "materials" : null,
    data.get("missingRecycled") ? "recycledContent" : null,
    data.get("missingFulfilmentPackaging") ? "fulfilmentPackaging" : null,
    data.get("missingManufacturerPackaging") ? "manufacturerPackaging" : null,
  ].filter(
    (
      item,
    ): item is NonNullable<ManualCorrections["markNotDisclosed"]>[number] =>
      item !== null,
  );
  const corrections: ManualCorrections = {
    title: String(data.get("title") ?? "").trim() || null,
    materialText: materialText || null,
    recycledContentPercentage: data.get("recycled")
      ? Number(data.get("recycled"))
      : null,
    fulfilmentPackaging:
      String(data.get("fulfilmentPackaging") ?? "").trim() || null,
    manufacturerPackaging:
      String(data.get("manufacturerPackaging") ?? "").trim() || null,
    fulfilmentPackagingSource:
      String(data.get("fulfilmentPackagingSource") ?? "").trim() || null,
    manufacturerPackagingSource:
      String(data.get("manufacturerPackagingSource") ?? "").trim() || null,
    fulfilmentPackagingUncertain: Boolean(
      data.get("fulfilmentPackagingUncertain"),
    ),
    manufacturerPackagingUncertain: Boolean(
      data.get("manufacturerPackagingUncertain"),
    ),
    certificationClaim: String(data.get("certificationClaim") ?? "").trim() || null,
    certificationSourceUrl: String(data.get("certificationSourceUrl") ?? "").trim() || null,
    certificationAsSellerClaim: Boolean(data.get("certificationAsSellerClaim")),
    certificationNotDisclosed: Boolean(data.get("certificationNotDisclosed")),
    markNotDisclosed: missing,
  };
  currentProduct = applyManualCorrections(product, corrections);
  currentAnalysis = displayAnalysis(currentProduct);
  const state = await readExtensionState();
  if (data.get("remember")) {
    state.manualCorrections[productKey(product)] = corrections;
    await writeExtensionState(state);
  }
  renderExtension(
    currentProduct,
    currentAnalysis,
    state,
    currentDiagnostics ?? parseProductPage(document, location.href).diagnostics,
  );
  showToast("Manual evidence applied and labelled “Provided by user”.");
  notifyPopup(
    currentAnalysis.canScore
      ? currentAnalysis.confidence === "Low"
        ? "low-confidence"
        : "missing-data"
      : currentProduct.isClothing
        ? "missing-data"
        : "unsupported-category",
    "Manual evidence applied locally. Open EcoMind to review the revised result.",
    currentAnalysis,
  );
}

function recordAnalysis(state: ExtensionState, product: ParsedProduct) {
  const key = `analysis-${productKey(product)}`;
  if (state.completedActions.includes(key)) return;
  const event = createPointEvent({
    actionType: "analysis",
    points: 0,
    source: "extension",
    deduplicationKey: key,
    title: "Product analysis completed",
    detail: `${product.retailer}: ${product.title ?? "manual entry"}`,
    selfReported: false,
  });
  state.pointEvents = addPointEvent(state.pointEvents, event);
  state.completedActions.push(key);
  state.activities.unshift({
    id: event.id,
    title: event.title,
    detail: event.detail,
    points: 0,
    date: "Today",
    timestamp: event.timestamp,
  });
}

function installVariationWatch(product: ParsedProduct) {
  variationObserver?.disconnect();
  initialSignature = currentPageSignature();
  const targets = [
    document.querySelector("#productTitle"),
    document.querySelector("input#ASIN"),
    document.querySelector("#variation_color_name"),
    document.querySelector("#variation_size_name"),
    document.querySelector("main h1"),
  ].filter((item): item is Element => Boolean(item));
  if (!targets.length || product.parserUsed === "threadly") return;
  const check = () => {
    if (
      currentPageSignature() !== initialSignature &&
      analysisState !== "product-changed"
    ) {
      notifyPopup(
        "product-changed",
        "The product title, identifier or selected variation changed. Re-analyse this product.",
      );
      shadow
        ?.querySelector(".widget .copy strong")
        ?.replaceChildren("Product changed · re-analyse");
    }
  };
  variationObserver = new MutationObserver(check);
  targets.forEach((target) =>
    variationObserver!.observe(target, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    }),
  );
  window.addEventListener("popstate", check, { once: true });
}

async function runAnalysis() {
  try {
    const host = location.hostname
    const amazonSupported = /(^|\.)(amazon\.com|amazon\.co\.uk)$/i.test(host)
    const demoMode = Boolean(document.querySelector('[data-ecomind-demo-product="true"]'))
    if (!amazonSupported && !demoMode) {
      notifyPopup("unsupported", "This marketplace is not supported in the current real-page pilot. Use Amazon US/UK clothing pages or the clearly labelled Threadly Demo Mode.")
      return
    }
    notifyPopup(
      "analysing",
      "Reading product evidence from this active page locally.",
    );
    const parsed = parseProductPage(document, location.href);
    currentProduct = parsed.product;
    currentDiagnostics = parsed.diagnostics;
    const state = await readExtensionState();
    const savedCorrections =
      state.manualCorrections[productKey(currentProduct)];
    if (savedCorrections)
      currentProduct = applyManualCorrections(currentProduct, savedCorrections);
    currentAnalysis = displayAnalysis(currentProduct);
    recordAnalysis(state, currentProduct);
    await writeExtensionState(state);
    renderExtension(currentProduct, currentAnalysis, state, currentDiagnostics);
    installVariationWatch(currentProduct);
    if (!currentProduct.isProduct)
      notifyPopup(
        "unsupported",
        "EcoMind could not confirm a product page. Open the koala to enter product information manually.",
        currentAnalysis,
      );
    else if (!currentProduct.isClothing)
      notifyPopup(
        "unsupported-category",
        "Product detected, but EcoMind currently scores clothing and textile products. Manual evidence is available.",
        currentAnalysis,
      );
    else if (!currentAnalysis.canScore)
      notifyPopup(
        "missing-data",
        "Product detected, but material composition is not disclosed. Manual confirmation is available.",
        currentAnalysis,
      );
    else if (currentAnalysis.confidence === "Low")
      notifyPopup(
        "low-confidence",
        `${currentProduct.retailer} product analysed with low confidence. Review missing evidence or add a correction.`,
        currentAnalysis,
      );
    else if (
      currentAnalysis.factors.some((item) => item.result.status === "unknown")
    )
      notifyPopup(
        "missing-data",
        `${currentProduct.retailer} product analysed provisionally. Missing factors remain unknown.`,
        currentAnalysis,
      );
    else
      notifyPopup(
        "success",
        `${currentProduct.retailer} clothing product analysed locally. Open the koala for evidence.`,
        currentAnalysis,
      );
  } catch (error) {
    notifyPopup(
      "error",
      `${error instanceof Error ? error.message : "Local parser failed."} Try again or use manual entry.`,
    );
  }
}

chrome.runtime.onMessage.addListener(
  (message: StatusMessage, _sender, sendResponse) => {
    if (message.type === "ECOMIND_GET_STATUS")
      sendResponse({
        type: "ECOMIND_STATUS_UPDATE",
        state: analysisState,
        detail: analysisDetail,
        ...(currentAnalysis
          ? {
              score: currentAnalysis.score,
              range: currentAnalysis.range,
              grade: currentAnalysis.grade,
              confidence: currentAnalysis.confidence,
              provisional: currentAnalysis.provisional,
              hasSufficientEvidence: currentAnalysis.hasSufficientEvidence,
            }
          : {}),
      } satisfies StatusMessage);
    if (
      message.type === "ECOMIND_STATUS_UPDATE" &&
      message.detail === "open-widget"
    ) {
      shadow?.querySelector<HTMLElement>(".layer")?.classList.add("open");
      document.body.inert = true;
      shadow?.querySelector<HTMLButtonElement>(".close")?.focus();
    }
    if (
      message.type === "ECOMIND_STATUS_UPDATE" &&
      message.detail === "rerun-analysis"
    ) {
      variationObserver?.disconnect();
      void runAnalysis();
      sendResponse({
        type: "ECOMIND_STATUS_UPDATE",
        state: "analysing",
        detail: "Analysis restarted from the current DOM.",
      } satisfies StatusMessage);
    }
  },
);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]?.newValue)
    shadow
      ?.querySelector(".widget .copy small")
      ?.setAttribute("data-storage-updated", "true");
});
const extensionWindow = window as Window & {
  __ECOMIND_CONTENT_LOADED__?: boolean;
};
if (!extensionWindow.__ECOMIND_CONTENT_LOADED__) {
  extensionWindow.__ECOMIND_CONTENT_LOADED__ = true;
  void runAnalysis();
}

import { ArrowRight, Check, ClipboardText, Eye, FileImage, LinkSimple, LockKey, WarningCircle } from '@phosphor-icons/react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { productFromCapturedText, isSupportedMobileUrl, type CaptureSource } from '../../shared/capturedProduct'
import { applyManualCorrections } from '../../shared/parsers/parserRegistry'
import type { ParsedProduct } from '../../shared/parsers/parserTypes'
import { SCORE_WEIGHTS } from '../../shared/ecomind'
import { scoreRealProduct } from '../../shared/realProductScoring'
import type { Page } from '../components/AppShell'
import { TrafficLightLegend, TrafficLightResult } from '../components/TrafficLight'

const taskLabels = ['Analyse a clothing product', 'Understand the score and traffic light', 'Open the score breakdown', 'Identify missing data and evidence sources', 'View a higher-scoring alternative', 'Review the privacy explanation']
const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_SURVEY_URL || '#/feedback'

export function AnalyseProductPage({ navigate }: { navigate: (page: Page) => void }) {
  const [url, setUrl] = useState('')
  const [visibleText, setVisibleText] = useState('')
  const [source, setSource] = useState<CaptureSource>('pasted-visible-text')
  const [product, setProduct] = useState<ParsedProduct | null>(null)
  const [status, setStatus] = useState<'idle' | 'reading' | 'review' | 'result' | 'unsupported' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [tasks, setTasks] = useState<boolean[]>([false, false, false, false, false, false])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const score = useMemo(() => product ? scoreRealProduct(product) : null, [product])
  const markTask = (index: number) => setTasks((current) => current.map((done, item) => item === index ? true : done))

  const prepareText = (text: string, captureSource: CaptureSource) => {
    try {
      const parsed = productFromCapturedText(text, url, captureSource)
      setVisibleText(text); setSource(captureSource); setProduct(parsed); setStatus('review'); markTask(0)
    } catch { setStatus('error') }
  }

  const inspectUrl = () => {
    if (!isSupportedMobileUrl(url)) { setStatus('unsupported'); return }
    setStatus('idle')
    document.getElementById('capture-evidence')?.scrollIntoView({ behavior: 'smooth' })
  }

  const readScreenshot = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    setStatus('reading'); setProgress(0); setImageUrl(URL.createObjectURL(file))
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', undefined, { logger: (message) => message.status === 'recognizing text' && setProgress(Math.round((message.progress ?? 0) * 100)) })
      const result = await worker.recognize(file)
      await worker.terminate()
      prepareText(result.data.text, 'screenshot-ocr')
    } catch { setStatus('error') }
  }

  const confirmReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!product) return
    const data = new FormData(event.currentTarget)
    const corrected = applyManualCorrections(product, {
      title: String(data.get('title') ?? ''),
      materialText: String(data.get('materials') ?? ''),
      recycledContentPercentage: data.get('recycled') === '' ? null : Number(data.get('recycled')),
      fulfilmentPackaging: String(data.get('fulfilment') ?? '') || null,
      manufacturerPackaging: String(data.get('manufacturer') ?? '') || null,
      fulfilmentPackagingUncertain: true,
      manufacturerPackagingUncertain: true,
      certificationClaim: String(data.get('certification') ?? '') || null,
      certificationAsSellerClaim: true,
    })
    setProduct(corrected); setStatus('result'); markTask(1)
  }

  return <div className="analyse-page page-surface">
    <header className="analyse-hero container"><div><span className="mode-label">Real product test · Amazon clothing pilot</span><h1>Analyse what you can actually see.</h1><p>Paste an Amazon clothing URL, then add visible text or a screenshot. EcoMind processes the evidence locally and asks you to confirm every extracted field.</p></div><div className="privacy-chip"><LockKey size={20} /><span><strong>Local by default</strong>No browsing history or silent page access</span></div></header>
    <div className="container testing-layout">
      <aside className="testing-tasks" aria-label="Prototype testing tasks"><div><strong>Guided test</strong><span>{tasks.filter(Boolean).length} of 6 complete</span></div><ol>{taskLabels.map((label, index) => <li className={tasks[index] ? 'is-done' : ''} key={label}><i>{tasks[index] ? <Check size={13} /> : index + 1}</i><span>{label}</span></li>)}</ol>{tasks.every(Boolean) && <a className="button button--primary button--full" href={FEEDBACK_URL}>Open feedback survey <ArrowRight size={17} /></a>}</aside>
      <main className="analysis-workspace">
        <section className="analysis-step"><div className="step-heading"><span>1</span><div><h2>Start with the product URL</h2><p>Mobile web support is intentionally limited to Amazon US and UK clothing product URLs. The web app cannot silently read another website.</p></div></div><label className="url-field"><span>Product URL</span><div><LinkSimple size={20} /><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.amazon.co.uk/dp/…" inputMode="url" /><button type="button" onClick={inspectUrl}>Check URL</button></div></label>{status === 'unsupported' && <div className="analysis-alert" role="alert"><WarningCircle size={20} /><div><strong>Unsupported page</strong><p>Use an Amazon US/UK clothing product URL, or continue with a screenshot and leave the URL blank. EcoMind does not claim support for this marketplace.</p></div></div>}</section>
        <section className="analysis-step" id="capture-evidence"><div className="step-heading"><span>2</span><div><h2>Add visible product evidence</h2><p>A full-page fetch is not performed. Upload a screenshot or paste only the information visible to you.</p></div></div><div className="capture-options"><button type="button" className={source === 'screenshot-ocr' ? 'is-selected' : ''} onClick={() => fileRef.current?.click()}><FileImage size={25} /><strong>Upload screenshot</strong><span>Local OCR fallback; review required</span></button><button type="button" className={source === 'pasted-visible-text' ? 'is-selected' : ''} onClick={() => document.getElementById('visible-product-text')?.focus()}><ClipboardText size={25} /><strong>Paste visible text</strong><span>Best when product details can be copied</span></button></div><input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void readScreenshot(event.target.files?.[0])} />{imageUrl && <img className="capture-preview" src={imageUrl} alt="Uploaded product screenshot preview" />}<label className="visible-text-field" htmlFor="visible-product-text"><span>Visible product text</span><textarea id="visible-product-text" value={visibleText} onChange={(event) => setVisibleText(event.target.value)} rows={9} placeholder={'Product name\nPrice\nFabric type or material composition\nCertification wording\nManufacturer packaging\nFulfilment packaging'} /></label><button className="button button--primary" type="button" disabled={!visibleText.trim() || status === 'reading'} onClick={() => prepareText(visibleText, 'pasted-visible-text')}>{status === 'reading' ? `Reading screenshot locally… ${progress}%` : 'Extract evidence for review'} <ArrowRight size={18} /></button>{status === 'error' && <div className="analysis-alert" role="alert"><WarningCircle size={20} /><div><strong>Analysis error</strong><p>OCR could not read this image. Paste the visible product text instead.</p></div></div>}</section>
        {product && status === 'review' && <section className="analysis-step review-step"><div className="step-heading"><span>3</span><div><h2>Review extracted evidence</h2><p>OCR and pasted text are user-provided evidence—not independent verification. Correct anything that is wrong before scoring.</p></div></div><form onSubmit={confirmReview}><label>Product name<input name="title" defaultValue={product.title ?? ''} required /></label><label>Material composition<textarea name="materials" defaultValue={product.materials.map((item) => `${item.percentage ?? ''}% ${item.name}`).join(', ')} rows={2} required /></label><div className="review-grid"><label>Recycled content %<input name="recycled" type="number" min="0" max="100" defaultValue={product.recycledContentPercentage ?? ''} /></label><label>Certification wording<input name="certification" defaultValue={product.certifications[0]?.rawClaim ?? ''} /></label><label>Fulfilment packaging<input name="fulfilment" defaultValue={product.packaging.fulfilment?.description ?? ''} /></label><label>Manufacturer packaging<input name="manufacturer" defaultValue={product.packaging.manufacturer?.description ?? ''} /></label></div><div className="review-source"><Eye size={18} /><span><strong>{source === 'screenshot-ocr' ? 'Local screenshot OCR' : 'Visible text pasted by user'}</strong>Low or medium confidence until independently checked.</span></div><button className="button button--primary" type="submit">Confirm evidence and calculate <ArrowRight size={18} /></button></form></section>}
        {product && score && status === 'result' && <section className="analysis-result"><div className="result-heading"><div><span>Shared Green Score engine</span><h2>{product.title}</h2></div><TrafficLightResult score={score.score} hasSufficientEvidence={score.canScore} provisional confidence={score.confidence} grade={score.grade ?? undefined} /></div><p>{score.explanation}</p><details onToggle={(event) => (event.currentTarget.open && markTask(2))}><summary>Open score breakdown</summary><div className="mobile-breakdown">{Object.entries(score.factors).map(([key, factor]) => <div key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><strong>{factor.score === null ? 'Not disclosed' : `${factor.status === 'estimated' ? '~' : ''}${factor.score}/100`}</strong><small>{Math.round(SCORE_WEIGHTS[key as keyof typeof SCORE_WEIGHTS] * 100)}% weight · {factor.status}</small></div>)}</div></details><details onToggle={(event) => (event.currentTarget.open && markTask(3))}><summary>Missing data and evidence sources</summary><div className="mobile-evidence"><h3>Missing</h3><ul>{product.missingFields.map((field) => <li key={field}>{field}: Not disclosed</li>)}</ul><h3>Sources</h3><ul>{product.evidence.map((item, index) => <li key={`${item.field}-${index}`}><strong>{item.field}</strong> — {item.sourceLabel} · {item.confidence}</li>)}</ul></div></details><details onToggle={(event) => (event.currentTarget.open && markTask(4))}><summary>Higher-scoring alternative</summary><p>No real marketplace alternative is invented in this flow. Open the clearly labelled Demo Mode to compare the fictional Threadly products, or analyse and save a second real product.</p><button className="button button--secondary" onClick={() => navigate('demo')} type="button">Open Demo Mode comparison</button></details><details onToggle={(event) => (event.currentTarget.open && markTask(5))}><summary>Privacy explanation</summary><p>The URL, screenshot and extracted product evidence stay in this browser session. EcoMind does not collect browsing history or transmit this analysis. OCR runs locally after your upload.</p><TrafficLightLegend /></details><a className="button button--primary result-feedback" href={FEEDBACK_URL}>Finish: EcoMind Prototype Feedback <ArrowRight size={18} /></a></section>}
      </main>
    </div>
  </div>
}

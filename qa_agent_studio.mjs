/**
 * Agent Studio UI verification.
 * Logs in as Manager and Creator, drives the prompt generator and workflow
 * builder, and captures screenshots + console errors.
 *
 *   node qa_agent_studio.mjs
 */
import { chromium } from 'playwright-core'
import fs from 'fs'

const candidateExes = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Users/darak/AppData/Local/ms-playwright/chromium-1134/chrome-win/chrome.exe',
]
const EXE = candidateExes.find((p) => fs.existsSync(p)) || candidateExes[0]
const BASE = 'http://127.0.0.1:8000'
const OUT = '.shots/agent-studio'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EXE, headless: true })
const results = []

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#email', email)
  await page.fill('#password', 'precedent')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(manager|creator)\/(overview|dashboard)/, { timeout: 30000 })
}

async function step(name, fn) {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail })
    console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`)
  } catch (error) {
    results.push({ name, ok: false, detail: error.message })
    console.log(`FAIL  ${name} — ${error.message}`)
  }
}

/* ------------------------------ Manager ------------------------------ */
const managerCtx = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const manager = await managerCtx.newPage()
const consoleErrors = []
manager.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
manager.on('pageerror', (error) => consoleErrors.push(String(error)))

await login(manager, 'david.kim@pureglow.co')

await step('Agent Studio dashboard renders', async () => {
  await manager.goto(`${BASE}/manager/agent-studio`, { waitUntil: 'domcontentloaded' })
  await manager.getByRole('heading', { name: 'Agent Studio' }).waitFor({ timeout: 20000 })
  await manager.waitForTimeout(900)
  const cards = await manager.locator('article').count()
  await manager.screenshot({ path: `${OUT}/01-dashboard.png`, fullPage: true })
  return `${cards} agent card(s)`
})

await step('Prompt generator opens and generates', async () => {
  await manager.getByRole('button', { name: /Create agent/i }).first().click()
  await manager.locator('#agent-prompt').waitFor({ timeout: 10000 })
  await manager.locator('#agent-prompt').fill(
    'Create an agent that reviews marketing submissions against our brand guidelines and identifies unsupported claims with exact evidence.',
  )
  await manager.screenshot({ path: `${OUT}/02-prompt.png`, fullPage: true })
  await manager.getByRole('button', { name: /Generate agent/i }).click()
  await manager.getByText('Review generated agent').waitFor({ timeout: 45000 })
  await manager.waitForTimeout(500)
  await manager.screenshot({ path: `${OUT}/03-generated.png`, fullPage: true })
  const tools = await manager.locator('text=Selected tools').count()
  return tools ? 'preview shown with tools' : 'preview shown'
})

await step('Workflow builder opens with canvas nodes', async () => {
  await manager.getByRole('button', { name: /Edit workflow/i }).click()
  await manager.waitForURL(/\/manager\/agents\/.+\/builder/, { timeout: 20000 })
  await manager.getByText('Node library').waitFor({ timeout: 20000 })
  await manager.locator('.react-flow__node').first().waitFor({ timeout: 20000 })
  await manager.waitForTimeout(1200)
  const nodes = await manager.locator('.react-flow__node').count()
  const edges = await manager.locator('.react-flow__edge').count()
  await manager.screenshot({ path: `${OUT}/04-builder.png`, fullPage: false })
  return `${nodes} nodes, ${edges} edges`
})

await step('Node inspector responds to selection', async () => {
  await manager.locator('.react-flow__node').nth(1).click()
  await manager.waitForTimeout(500)
  await manager.getByText('Config (JSON)').waitFor({ timeout: 10000 })
  await manager.screenshot({ path: `${OUT}/05-inspector.png`, fullPage: false })
  return 'inspector visible'
})

await step('Agent detail page renders', async () => {
  const url = manager.url().replace('/builder', '')
  await manager.goto(url, { waitUntil: 'domcontentloaded' })
  await manager.getByText('System instructions').waitFor({ timeout: 20000 })
  await manager.waitForTimeout(600)
  await manager.screenshot({ path: `${OUT}/06-detail.png`, fullPage: true })
  return 'detail loaded'
})

await step('Executions page renders', async () => {
  await manager.goto(`${BASE}/manager/agent-executions`, { waitUntil: 'domcontentloaded' })
  await manager.getByRole('heading', { name: 'Agent Executions' }).waitFor({ timeout: 20000 })
  await manager.waitForTimeout(800)
  const rows = await manager.locator('tbody tr').count()
  await manager.screenshot({ path: `${OUT}/07-executions.png`, fullPage: true })
  return `${rows} run row(s)`
})

/* ------------------------------ Creator ------------------------------ */
const creatorCtx = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const creator = await creatorCtx.newPage()
creator.on('pageerror', (error) => consoleErrors.push('creator: ' + String(error)))

await login(creator, 'emily.carter@pureglow.co')

await step('Creator sees My AI Assistants', async () => {
  await creator.goto(`${BASE}/creator/ai-assistants`, { waitUntil: 'domcontentloaded' })
  await creator.getByRole('heading', { name: 'My AI Assistants' }).waitFor({ timeout: 20000 })
  await creator.waitForTimeout(800)
  const text = await creator.locator('body').innerText()
  await creator.screenshot({ path: `${OUT}/08-creator-assistants.png`, fullPage: true })
  if (text.includes('No assistants published yet')) throw new Error('creator sees no published assistants')
  return 'published assistant visible'
})

await step('No console errors during manager flow', async () => {
  if (consoleErrors.length) throw new Error(consoleErrors.slice(0, 3).join(' | '))
  return 'clean console'
})

await managerCtx.close()
await creatorCtx.close()
await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  process.exitCode = 1
}

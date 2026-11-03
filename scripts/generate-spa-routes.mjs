import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

const routes = [
  'login',
  'creator',
  'creator/dashboard',
  'creator/new-content',
  'creator/submissions',
  'creator/guidelines',
  'creator/ai-review',
  'creator/exception-requests',
  'creator/sentinel-tasks',
  'creator/notifications',
  'creator/approved-content',
  'creator/profile',
  'creator/ai-assistants',
  'app',
  'app/overview',
  'app/new',
  'app/submissions',
  'app/guidelines',
  'app/feedback',
  'app/exceptions',
  'app/sentinel',
  'app/notifications',
  'app/approved',
  'app/profile',
  'app/ai-assistants',
  'manager',
  'manager/overview',
  'manager/queue',
  'manager/review-queue',
  'manager/submissions',
  'manager/guidelines',
  'manager/rules',
  'manager/exceptions',
  'manager/sandbox',
  'manager/sentinel',
  'manager/assets',
  'manager/analytics',
  'manager/audit',
  'manager/agent-studio',
  'manager/agents',
  'manager/agent-runs',
]

function generate() {
  const indexHtmlPath = path.join(distDir, 'index.html')
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`Error: ${indexHtmlPath} does not exist. Run vite build first.`)
    process.exit(1)
  }

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8')

  // 1. Generate 404.html fallback
  fs.writeFileSync(path.join(distDir, '404.html'), indexHtml, 'utf-8')
  console.log('✓ Created dist/404.html fallback')

  // 2. Generate physical index.html files for all SPA routes
  for (const route of routes) {
    const routeDir = path.join(distDir, route)
    fs.mkdirSync(routeDir, { recursive: true })
    fs.writeFileSync(path.join(routeDir, 'index.html'), indexHtml, 'utf-8')
  }

  console.log(`✓ Generated physical fallback index.html for ${routes.length} SPA routes in dist/`)
}

generate()


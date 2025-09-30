import process from 'node:process'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import cron from 'node-cron'
import { fetchAlerts } from './services/alerts.js'
import { loginToBsky } from './services/bsky.js'
import { deleteOldAlerts } from './services/database.js'

const app = new Hono()
const PORT = Number(process.env.PORT) || 3000

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`Server running on port ${info.port}`)
  console.log(`Health check available at http://localhost:${info.port}/health`)
})

async function runAlertCheck(): Promise<void> {
  try {
    await loginToBsky()
    await fetchAlerts()
    await deleteOldAlerts()
  }
  catch (error) {
    console.error('Error in scheduled alert check:', error)
  }
}

console.log('Setting up cron job to run every minute...')
cron.schedule('* * * * *', async () => {
  console.log(`Running scheduled alert check at ${new Date().toISOString()}`)
  await runAlertCheck()
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  process.exit(0)
})

console.log('MTA Alerts Bot started successfully')

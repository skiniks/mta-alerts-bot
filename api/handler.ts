import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchAlerts } from '../services/alerts.js'
import { loginToBsky } from '../services/bsky.js'
import { deleteOldAlerts } from '../services/database.js'

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    await loginToBsky()
    await fetchAlerts()
    await deleteOldAlerts()
    res.status(200).send('OK')
  }
  catch (error) {
    console.error('Error in handler:', error)
    res.status(500).send('An error occurred while processing your request.')
  }
}

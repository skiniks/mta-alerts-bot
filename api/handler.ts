import type { ApiRequest, ApiResponse } from '../src/types/index.js'
import { fetchAlerts } from '../src/services/alerts.js'
import { loginToBsky } from '../src/services/bsky.js'
import { deleteOldAlerts } from '../src/services/database.js'

export default async function handler(_req: ApiRequest, res: ApiResponse): Promise<void> {
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

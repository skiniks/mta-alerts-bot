import type { } from '@atcute/atproto'
import type { } from '@atcute/bluesky'
import type { FormattedAlert } from '../types/index.js'

import { Client, CredentialManager } from '@atcute/client'
import { BSKY_PASSWORD, BSKY_USERNAME, SERVICE } from '../config/index.js'

const manager = new CredentialManager({
  service: SERVICE!,
})
const rpc = new Client({ handler: manager })

let isLoggedIn = false

export async function postAlertToBsky(formattedAlert: FormattedAlert): Promise<void> {
  if (!manager.session?.did)
    throw new Error('Not logged in - no session DID available')

  const truncatedText = formattedAlert.text.slice(0, 300)
  const record = {
    text: truncatedText,
    createdAt: new Date().toISOString(),
  }

  await rpc.post('com.atproto.repo.createRecord', {
    input: {
      repo: manager.session.did,
      collection: 'app.bsky.feed.post',
      record,
    },
  })

  console.info('New alert posted:', truncatedText)
}

export async function loginToBsky(): Promise<void> {
  if (isLoggedIn) {
    return
  }

  await manager.login({
    identifier: BSKY_USERNAME!,
    password: BSKY_PASSWORD!,
  })

  isLoggedIn = true
  console.log('Successfully logged in to Bluesky')
}

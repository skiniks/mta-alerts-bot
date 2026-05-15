import type { } from '@atcute/atproto'
import type { } from '@atcute/bluesky'
import type { FormattedAlert } from '../types/index.js'

import { Client, ok } from '@atcute/client'
import { PasswordSession } from '@atcute/password-session'
import { BSKY_PASSWORD, BSKY_USERNAME, SERVICE } from '../config/index.js'

let session: PasswordSession | null = null
let rpc: Client | null = null

export async function postAlertToBsky(formattedAlert: FormattedAlert): Promise<void> {
  if (!session || !rpc)
    throw new Error('Not logged in - no session available')

  const did = session.session?.did
  if (!did)
    throw new Error('Not logged in - no session DID available')

  const truncatedText = formattedAlert.text.slice(0, 300)
  const record = {
    text: truncatedText,
    createdAt: new Date().toISOString(),
  }

  await ok(rpc.post('com.atproto.repo.createRecord', {
    input: {
      repo: did,
      collection: 'app.bsky.feed.post',
      record,
    },
  }))

  console.info('New alert posted:', truncatedText)
}

export async function loginToBsky(): Promise<void> {
  if (session) {
    return
  }

  session = await PasswordSession.login({
    service: SERVICE!,
    identifier: BSKY_USERNAME!,
    password: BSKY_PASSWORD!,
  })

  rpc = new Client({ handler: session })

  console.log('Successfully logged in to Bluesky')
}

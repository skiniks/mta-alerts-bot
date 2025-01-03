import { AtpAgent } from '@atproto/api'
import { BSKY_PASSWORD, BSKY_USERNAME } from '../config'
import type { FormattedAlert } from '../types'

export const agent = new AtpAgent({
  service: 'https://bsky.social',
})

export async function postAlertToBsky(formattedAlert: FormattedAlert): Promise<void> {
  if (!agent.session?.did)
    throw new Error('Not logged in - no session DID available')

  const truncatedText = formattedAlert.text.slice(0, 300)
  const record = {
    text: truncatedText,
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.createRecord({
    repo: agent.session.did,
    collection: 'app.bsky.feed.post',
    record,
  })

  // eslint-disable-next-line no-console
  console.log('New alert posted:', truncatedText)
}

export async function loginToBsky(): Promise<void> {
  await agent.login({
    identifier: BSKY_USERNAME!,
    password: BSKY_PASSWORD!,
  })
}

import { BskyAgent } from '@atproto/api'
import { BSKY_PASSWORD, BSKY_USERNAME } from '../config'
import type { FormattedAlert } from '../types'

export const agent = new BskyAgent({
  service: 'https://bsky.social',
})

export async function postAlertToBsky(formattedAlert: FormattedAlert): Promise<void> {
  const truncatedText = formattedAlert.text.slice(0, 300)
  await agent.post({
    $type: 'app.bsky.feed.post',
    text: truncatedText,
    createdAt: new Date().toISOString(),
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

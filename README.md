# MTA Alerts Bot

A serverless bot that monitors New York City's subway system through the MTA (Metropolitan Transportation Authority) Realtime Alerts feed and shares updates on Bluesky. The bot fetches service alerts from the NYC subway API once per minute, uses Supabase to prevent duplicate posts, and automatically shares service updates to Bluesky.

### Prerequisites

- `@atproto/api`: Library for posting updates to Bluesky
- `@supabase/supabase-js`: Client library for managing data in Supabase

## Configuration

Required environment variables:

```
MTA_API_KEY=your_mta_api_key
MTA_API_URL=your_mta_api_url
BSKY_USERNAME=your_bsky_username
BSKY_PASSWORD=your_bsky_password
```

## Deployment

The bot is hosted on Vercel with a cron job scheduled to check for updates every minute, as defined in `vercel.json`.

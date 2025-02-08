# MTA Alerts Bluesky Bot

A serverless bot that monitors New York City's subway system through the MTA (Metropolitan Transportation Authority) Realtime Subway Alerts feed and shares updates on Bluesky. The bot fetches service alerts from the NYC subway API once per minute, uses Supabase to prevent duplicate posts, and automatically shares service updates to Bluesky.

## Configuration

Required environment variables:

```
BSKY_PASSWORD=your_bsky_password
BSKY_USERNAME=your_bsky_username
MTA_API_KEY=your_mta_api_key
MTA_API_URL=your_mta_api_url
SUPABASE_KEY=your_supabase_key
SUPABASE_URL=your_supabase_url
```

## Deployment

The bot is hosted on Vercel with a cron job scheduled to check for updates every minute, as defined in `vercel.json`.

# MTA Alerts Bot

This project is a bot that fetches alerts from the MTA API, checks for duplicates in a Supabase database, and posts new alerts to a Bsky feed. The bot is deployed on Vercel and runs every 2 minutes.

### Prerequisites

The project uses the following dependencies:

- `@atproto/api` for interacting with the Bsky API
- `@supabase/supabase-js` for interacting with the Supabase database
- `axios` for making HTTP requests

## Configuration

The project requires several environment variables to be set:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
MTA_API_KEY=your_mta_api_key
MTA_API_URL=your_mta_api_url
BSKY_USERNAME=your_bsky_username
BSKY_PASSWORD=your_bsky_password
```

## Deployment

The bot is deployed on Vercel and uses a cron job to run every 2 minutes. The cron job is configured in the vercel.json file.

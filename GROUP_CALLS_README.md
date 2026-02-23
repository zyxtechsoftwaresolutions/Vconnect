# Group Video & Audio Calls (Jitsi Meet)

Group calls use **Jitsi Meet** – no API keys or setup required. Links work in the browser and on mobile.

## What’s in the app

- **Video** icon in the group chat header → **Start Instant Video/Audio Call** or **Schedule Video/Audio Call**
- Meeting link is **posted in the group chat** and listed in the **Calls** block above messages
- **Join Call** opens the link in a new tab (browser or Jitsi app on mobile)

## Setup

Run **`group-calls-migration.sql`** in the Supabase SQL Editor so the `group_calls` table and `CALL` message type exist. No other configuration needed.

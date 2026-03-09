# 🎵 LikedFM - Music Taste Sync for Last.fm + YouTube

LikedFM is a self-hosted music automation bridge that syncs your **loved tracks**, **library albums**, and **playlists** from **Last.fm** and automatically downloads them from **YouTube** using **yt-dlp**. Think of it as **Jellyseerr for music**.

## Features

✅ **Last.fm Integration**
- Sync loved tracks from your Last.fm profile
- Sync all albums from your Last.fm library
- Sync playlists from your Last.fm account
- Automatic deduplication with priority sourcing
- Full pagination support for all endpoints

✅ **YouTube Download Pipeline**
- Smart YouTube search with intelligent scoring system
- Support for official audio, lyrics videos, or auto-detection
- Concurrent downloads with configurable parallelism
- High-quality audio extraction (up to 320kbps MP3 or other formats)
- Real-time download progress tracking via SSE
- Automatic retry on failure with exponential backoff

✅ **Web Dashboard**
- Real-time track status tracking (Pending → Downloading → Downloaded)
- Live activity log with SSE updates
- Statistics dashboard (total synced, downloading, downloaded, failed, ignored)
- Manual sync trigger and per-track download control
- Retry failed downloads in bulk or individually
- Per-track ignore/un-ignore controls
- Album art thumbnails from Last.fm
- Source badges showing origin (Loved, Album, Playlist)
- Download progress bars with speed and ETA

✅ **Settings UI**
- Fully configurable via web interface
- Test Last.fm & yt-dlp binary availability
- Adjust sync intervals, audio format, and quality
- Enable/disable sync sources (loved, albums, playlists)
- No need to edit config files

✅ **Docker-Ready**
- Multi-stage build (optimized image size)
- Unraid Community Applications template included
- Pre-installed yt-dlp and ffmpeg
- Health check endpoint
- Non-root user for security
- Volume mounts for persistence and music library access

## Architecture

- **Backend**: Node.js + Express + Prisma + SQLite
- **Frontend**: React 18 + Vite + React Router + Tailwind CSS
- **Scheduler**: node-cron for automated sync intervals
- **Download Engine**: yt-dlp via child_process.spawn (streaming progress)
- **Database**: SQLite (persisted in `/config` volume)

## Quick Start

### Using Docker Compose

1. Clone the repository:
```bash
git clone https://github.com/yourusername/likedfm.git
cd likedfm
```

2. Build and start the container:
```bash
docker compose up -d --build
```

Or separately:
```bash
docker compose build
docker compose up -d
```

3. Access the web UI:
```
http://localhost:8767
```

4. Configure Last.fm credentials in the Settings page.

5. Click "Sync Now" to start!

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8767` | Web UI port |
| `DATABASE_URL` | `file:/app/config/likedfm.db` | SQLite database path |
| `NODE_ENV` | `production` | Node environment |
| `LASTFM_API_KEY` | - | Last.fm API Key (can be set via UI) |
| `LASTFM_SECRET` | - | Last.fm API Secret (can be set via UI) |
| `LASTFM_USERNAME` | - | Last.fm Username (can be set via UI) |
| `MUSIC_PATH` | `/mnt/user/Media/music` | **Host path** for downloaded music |
| `MUSIC_OUTPUT_DIR` | `/music` | **Container path** for downloads (do not change) |
| `AUDIO_FORMAT` | `mp3` | Download format: mp3, flac, opus, m4a |
| `AUDIO_QUALITY` | `320k` | Bitrate: 128k, 192k, 256k, 320k |
| `MAX_CONCURRENT_DOWNLOADS` | `2` | Parallel downloads (1-5) |
| `SEARCH_PREFERENCE` | `auto` | YouTube search mode: auto, official_audio, lyrics |
| `SYNC_INTERVAL` | `360` | Sync interval in minutes |
| `SYNC_LOVED` | `true` | Sync loved tracks |
| `SYNC_ALBUMS` | `true` | Sync library albums |
| `SYNC_PLAYLISTS` | `true` | Sync playlists |

### Important Notes

- **MUSIC_PATH** (host machine path) is what you customize
- **MUSIC_OUTPUT_DIR** (container path) should always be `/music`
- Use `${MUSIC_PATH:-/mnt/user/Media/music}` in docker-compose to allow overrides

## Getting API Keys

### Last.fm API

1. Visit https://www.last.fm/api
2. Click "Create an API account"
3. Fill in the form and accept terms
4. You'll get your **API Key** and **Shared Secret**
5. You'll need your **Last.fm username** (not email)

## Volume Mounts (Docker)

### Required Mounts

- **`./config:/app/config`** - SQLite database and persistent settings
- **`/path/to/your/music:/music`** - Music library for downloaded tracks (read-write)

### Configuring the Music Directory

The music download path is **fully customizable** via the `MUSIC_PATH` environment variable:

**Default:** `/mnt/user/Media/music` → `/music` (inside container)

**Docker Compose Example:**
```yaml
version: '3.8'

services:
  likedfm:
    image: likedfm:latest
    container_name: likedfm
    restart: unless-stopped
    ports:
      - "8767:8767"
    volumes:
      - ./config:/app/config
      - ${MUSIC_PATH:-/mnt/user/Media/music}:/music
    environment:
      SYNC_INTERVAL: 360
      AUDIO_FORMAT: mp3
      AUDIO_QUALITY: 320k
```

**Set Custom Path (Linux/Mac):**
```bash
export MUSIC_PATH=/home/user/Music
docker-compose up -d
```

**Set Custom Path (Windows PowerShell):**
```powershell
$env:MUSIC_PATH="C:\Users\YourName\Music"
docker-compose up -d
```

**Set Custom Path (Unraid):**
Edit the container settings and set:
- **MUSIC_PATH** = `/mnt/user/MyShare/Music` (or your preferred location)

### Volume Permission Notes

- Directory must have read-write permissions
- Container runs as user `likedfm` (UID 1001)
- Ensure the host directory exists: `mkdir -p /mnt/user/Media/music`
- Set proper permissions: `chmod 755 /mnt/user/Media/music`

## Installation on Unraid

### Via Community Applications

1. Open **Community Applications** → **Apps**
2. Search for "**LikedFM**"
3. Click **Install**
4. Configure environment variables and volume paths
5. Click **Apply**

### Manual Installation

1. Download the `unraid-template.xml` file
2. In Unraid, go to **Docker** → **Add Container**
3. Click "**Select a template**"
4. Click "**Upload template**"
5. Select the XML file
6. Configure settings and click **Apply**

## API Endpoints

### Tracks
- `GET /api/tracks` - List tracks with filters (status, source, sort, page)
- `PATCH /api/tracks/:id/ignore` - Mark track as ignored
- `PATCH /api/tracks/:id/unignore` - Revert ignored track
- `POST /api/sync/tracks/:id/download` - Manually download a track

### Sync
- `POST /api/sync` - Trigger manual sync now
- `GET /api/sync/status` - Get last sync time and next scheduled time
- `POST /api/sync/retry-failed` - Retry all failed downloads

### Settings
- `GET /api/settings` - Get current settings (masked)
- `POST /api/settings` - Save settings
- `POST /api/settings/test-lastfm` - Test Last.fm connection
- `POST /api/settings/test-ytdlp` - Check yt-dlp binary

### Stats
- `GET /api/stats` - Get track counts by status and source

### Events
- `GET /api/events` - Server-Sent Events stream for live updates

### Health
- `GET /health` - Health check endpoint

## Database Schema

### Tracks Table
```
id                Int (PK)
artist            String
title             String
lastfm_url        String
album_art_url     String
status            String (pending|downloading|downloaded|failed|ignored)
youtube_url       String
youtube_video_id  String
file_path         String
download_error    String
source            String (loved|album|playlist)
album_name        String
playlist_name     String
requested_at      DateTime
downloaded_at     DateTime
created_at        DateTime
updated_at        DateTime
```

### Sync Log Table
```
id                Int (PK)
synced_at         DateTime
tracks_found      Int
tracks_added      Int
tracks_downloaded Int
tracks_failed     Int
loved_count       Int
album_count       Int
playlist_count    Int
```

### Settings Table
```
id                          Int (PK)
lastfm_api_key              String
lastfm_secret               String
lastfm_username             String
sync_interval               Int (minutes)
sync_loved                  Boolean
music_output_dir            String
audio_format                String
audio_quality               String
max_concurrent_downloads    Int
search_preference           String
sync_albums                 Boolean
sync_playlists              Boolean
updated_at                  DateTime
```

## Sync Flow

1. **Fetch Last.fm Data**:
   - Pull all loved tracks (with pagination)
   - Pull all library albums (with pagination)
   - For each album, fetch all tracks
   - Pull all playlists (with pagination)
   - For each playlist, fetch all tracks

2. **Deduplicate**: Remove duplicates by (artist, title), keeping "loved" as priority source

3. **Insert into Database**: Add new tracks with status "pending" and source metadata

4. **Process Downloads** (up to max_concurrent at a time):
   - Search YouTube with intelligent scoring
   - Save YouTube URL and video ID to DB
   - Update status to "downloading"
   - Stream download with real-time progress events
   - On success: save file_path, mark "downloaded"
   - On failure: save error, mark "failed", enable retry

5. **Broadcast Events**: Send SSE updates to dashboard (start, progress, completed, failed)

6. **Log Results**: Record sync summary with counts by source and status

## Download Quality

The app uses **yt-dlp** to extract audio from YouTube videos with these options:

- **Format**: MP3 (default), FLAC, Opus, or M4A
- **Quality**: Up to 320kbps (configurable)
- **Metadata**: Embeds thumbnail and track metadata
- **Organization**: `Artist/Title.ext` directory structure
- **Retry**: Automatic retry up to 2x on failure

### YouTube Search Scoring

Results are scored based on:
- Title contains both artist AND track title (+3)
- Channel matches artist name (+2)
- "Official Audio" or official channel (+2)
- Duration 2-8 minutes (+1)
- **Disqualified**: Duration < 60s or > 10min

## Troubleshooting

### Sync not running
- Check Settings page to ensure all fields are filled
- Click "Test Last.fm" to verify API connectivity
- Check application logs: `docker logs likedfm`

### No YouTube results found
- Try different search preferences (auto, official_audio, lyrics)
- Check yt-dlp is working: `docker exec likedfm yt-dlp --version`
- Some tracks may not have good YouTube matches

### Downloads not appearing
- Verify music output directory has write permissions
- Check disk space available
- Review error message in track card
- Try retry button for failed tracks

### Database locked
- Stop the container: `docker-compose down`
- Remove database: `rm config/likedfm.db`
- Restart container: `docker-compose up -d`

## Utility Scripts

Located in `backend/scripts/` directory. These are helpful tools for database maintenance and debugging.

### Clear Permission Errors

If tracks show false "Permission denied" errors despite being downloaded successfully:

```bash
docker cp /mnt/user/data/LikedFM/backend/scripts/cleanup-errors.js likedfm:/app/cleanup-errors.js
docker exec likedfm node /app/cleanup-errors.js
```

This script will:
- Find all tracks with "Permission denied" errors
- Clear the error messages
- Reset tracks to "pending" status for retry

### Check Track in Database

Query the database for a specific track (e.g., find Polyphia tracks):

```bash
docker cp /mnt/user/data/LikedFM/backend/scripts/check-track.js likedfm:/app/check-track.js
docker exec likedfm node /app/check-track.js
```

Edit `check-track.js` to search for different tracks by modifying the query.

## Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- yt-dlp (for local testing)

### Running Locally

**Backend:**
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

**Frontend (separate terminal):**
```bash
cd frontend
npm install
npm run dev
```

The frontend dev server will proxy API calls to `http://localhost:8767`.

### Building Docker Image
```bash
docker-compose build
docker-compose up
```

## Project Structure

```
likedfm/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── index.js (Express app)
│   │   ├── scheduler.js (cron sync)
│   │   ├── services/
│   │   │   ├── lastfm.js (Last.fm API)
│   │   │   └── ytdlp.js (YouTube download)
│   │   └── routes/
│   │       ├── tracks.js
│   │       ├── sync.js
│   │       ├── settings.js
│   │       ├── stats.js
│   │       └── events.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── TrackCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── SyncStats.jsx
│   │   │   ├── ActivityLog.jsx
│   │   │   └── SettingsForm.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── Dockerfile
├── docker-compose.yml
├── unraid-template.xml
└── README.md
```

## License

MIT

## Support

- **GitHub Issues**: https://github.com/yourusername/likedfm/issues
- **Discussions**: https://github.com/yourusername/likedfm/discussions

## Roadmap

- [ ] Spotify integration
- [ ] Track download notifications
- [ ] Advanced filtering (genre, decade, etc.)
- [ ] Batch operations (ignore all pending, etc.)
- [ ] Export/import settings
- [ ] Multi-user support
- [ ] Preferred artists/channels list
- [ ] Quality/format presets

---

Made with ❤️ for music lovers and automation enthusiasts

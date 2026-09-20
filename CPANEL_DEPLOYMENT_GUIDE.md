# Complete cPanel Deployment Guide

This guide provides step-by-step instructions for deploying your video streaming platform to any cPanel hosting environment.

---

## Deployment Options

There are two primary ways to host this Next.js application on cPanel:

1. **Option A: cPanel Node.js Selector (Recommended)**
   - Runs the dynamic Next.js server with live server-side rendering, API endpoints, and real-time streaming features.
2. **Option B: Apache Reverse Proxy with PM2 / Standalone Node**
   - Ideal if you have SSH / terminal access in cPanel.

---

## Option A: Using cPanel "Setup Node.js App"

### Step 1: Prepare the Build
On your local machine or in Google AI Studio:
1. Run the production build command:
   ```bash
   npm run build
   ```
2. Verify that `.next` and `public` folders exist.

### Step 2: Configure cPanel Node.js Application
1. Log into your **cPanel Dashboard**.
2. Scroll to the **Software** section and click **Setup Node.js App**.
3. Click **Create Application**:
   - **Node.js version**: Select `18.x` or `20.x` LTS.
   - **Application mode**: Select `Production`.
   - **Application root**: Enter your folder name (e.g., `streaming_app` or `public_html/stream`).
   - **Application URL**: Select your domain or subdomain (e.g., `videos.yourdomain.com`).
   - **Application startup file**: Enter `server.js`.
4. Click **Create**.

### Step 3: Upload Files to cPanel
Using cPanel **File Manager** or **FTP** (FileZilla):
Upload the following files and directories into your **Application root** folder:
```
├── .next/
├── public/
├── package.json
├── package-lock.json
├── server.js
├── .env.production (or set environment variables in cPanel UI)
```
*(Do NOT upload `node_modules` — install them directly in cPanel for Linux binary compatibility).*

### Step 4: Install Dependencies & Run
1. In cPanel **Setup Node.js App**, open your application.
2. Click **Run NPM Install** button (or copy the virtual environment command and run `npm install --production` via cPanel Terminal).
3. Under **Environment variables**, click **Add Variable**:
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (or the port allocated by cPanel Passenger)
4. Click **Restart Application**.

---

## Option B: cPanel Apache `.htaccess` Configuration

If you run Node.js on port `3000` (via cPanel Terminal or PM2) and want your public domain on port `80`/`443` to proxy to it, place this in your `public_html/.htaccess`:

```apache
# Turn on URL Rewriting
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Exclude static assets if served directly
RewriteCond %{REQUEST_URI} !^/\.well-known

# Proxy all traffic to the Node.js application running on port 3000
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]

# WebSocket support for video streaming / live events
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule ^(.*)$ ws://127.0.0.1:3000/$1 [P,L]
```

---

## Option C: Optional Standalone `server.js` for cPanel Passenger

If your cPanel uses CloudLinux Passenger, create this minimal `server.js` in your root folder:

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

---

## Video File & Streaming Hosting on cPanel

### 1. Direct MP4/WebM files:
- You can store MP4 files inside `public_html/videos/` on your cPanel server.
- The URL will be `https://yourdomain.com/videos/my-video.mp4`.
- Input this URL directly into the Admin **Import Video by URL** tool.
- Enable `Accept-Ranges: bytes` in Apache (enabled by default on cPanel) for video scrubbing and seeking.

### 2. HLS (.m3u8) Streams:
- You can upload segmented HLS directories (.m3u8 manifest and .ts segment chunks) into `public_html/streams/`.
- The Video Player will automatically detect `.m3u8` and initialize HLS streaming with adaptive bitrate switching.

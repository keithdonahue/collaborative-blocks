# Deployment Guide

## ⚠️ Important Note

This application uses **WebSockets (Socket.io)** which require a **persistent server connection**. Vercel's serverless functions don't support persistent WebSocket connections, so **Vercel is not suitable for this app**.

## Recommended Platforms

For WebSocket applications, use one of these platforms:

### 1. **Railway** (Recommended - Easiest)
- ✅ Free tier available
- ✅ Supports persistent Node.js servers
- ✅ WebSocket support
- ✅ SQLite support
- ✅ Auto-deploy from GitHub

**Deploy to Railway:**
1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `collaborative-blocks`
5. Railway will auto-detect Node.js and deploy
6. Add environment variable: `PORT` (Railway sets this automatically)

### 2. **Render**
- ✅ Free tier available
- ✅ Supports WebSockets
- ✅ Auto-deploy from GitHub

**Deploy to Render:**
1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
6. Deploy!

### 3. **Fly.io**
- ✅ Free tier available
- ✅ Great for WebSocket apps
- ✅ Global edge network

**Deploy to Fly.io:**
1. Install Fly CLI: `npm i -g @fly/cli`
2. Run: `fly launch`
3. Follow prompts

### 4. **Heroku**
- ⚠️ No free tier (paid only)
- ✅ Excellent WebSocket support

## Quick Deploy to Railway (Recommended)

1. Visit: https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select `keithdonahue/collaborative-blocks`
4. Railway auto-detects and deploys!
5. Your app will be live at: `https://your-app-name.up.railway.app`

## Environment Variables

No environment variables needed for basic setup. The app uses:
- `PORT` - Automatically set by hosting platform
- SQLite database file (created automatically)

## Testing After Deployment

1. Open your deployed URL
2. Open multiple browser tabs/windows
3. Drag blocks around - they should sync in real-time!
4. Double-click to create new blocks

## Troubleshooting

- **WebSockets not connecting**: Make sure your platform supports persistent connections (not serverless)
- **Database errors**: Ensure the platform allows file system writes for SQLite
- **Port issues**: Most platforms set PORT automatically via environment variable

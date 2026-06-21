# Meteorduper Backend

This small Express backend receives POSTs from the Fabric mod and forwards readable messages to a Discord webhook.

Endpoints
- `POST /report` - accepts JSON body: `{ "username": "player", "uuid": "...", "client": "..." }`

Environment
- `DISCORD_WEBHOOK_URL` (required) - Discord webhook URL. Do NOT commit this value to source control. Use `backend/.env.example` as a template or set it in your Render service environment.

Local run

```bash
# requires Node 18+
npm install
npm start
```

Deploying to Render

Render supports deploying Node.js web services from a GitHub repository or via direct upload. This project is ready to be deployed as a web service.

Quick steps (GitHub → Render):

1. Push your `backend` folder to a GitHub repository (or the root of a repo).
2. Go to https://dashboard.render.com and create a new **Web Service**.
3. Connect your GitHub repo and select the repository + branch to deploy.
4. Set the **Build Command** (optional): `npm install` (Render usually auto-detects this).
5. Set the **Start Command**: `npm start`.
6. In the service's **Environment** tab, add an Environment Variable named `DISCORD_WEBHOOK_URL` with your webhook value.
7. Deploy. Render will build and start the service and provide a public URL (e.g. `https://your-service.onrender.com`).

Manual upload (drag & drop):

- Create a new Web Service on Render, choose "Deploy from a Git repo" or use the direct upload option if available. Ensure `npm start` is the start command and set `DISCORD_WEBHOOK_URL` in Environment variables.

Testing the endpoint

After deployment, test with `curl` (replace `YOUR_RENDER_URL`):

```bash
curl -X POST "https://YOUR_RENDER_URL/report" \
	-H "Content-Type: application/json" \
	-d '{"username":"testuser","uuid":"0000-1111","client":"Fabric 1.21.4"}'
```

Notes
- The code chunks long messages into ~1900-character pieces to avoid Discord's 2000-character limit.
- Store the webhook URL as an environment variable; never commit secrets into source control.

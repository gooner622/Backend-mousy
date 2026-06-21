import express from "express";
import { appendFile } from "fs/promises";

const app = express();
app.use(express.json());

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL || null;

// Log basic environment info for debugging on Render
console.log('[startup] PORT env:', process.env.PORT || '(not set)');
console.log('[startup] DISCORD_WEBHOOK_URL set:', !!process.env.DISCORD_WEBHOOK_URL);

if (!DISCORD_WEBHOOK) {
  console.warn("WARNING: No DISCORD webhook set. Set DISCORD_WEBHOOK_URL env variable.");
}

// Graceful signal and error logging for debugging restarts / SIGTERM
process.on('SIGTERM', () => {
  console.log('[signal] SIGTERM received, exiting');
  // flush and exit
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('[signal] SIGINT received, exiting');
  process.exit(0);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

function chunkString(str, size) {
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
}

async function postToDiscord(content) {
  if (!DISCORD_WEBHOOK) {
    console.error("No DISCORD_WEBHOOK configured, skipping send.");
    return;
  }

  const body = { content };

  const res = await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Discord webhook failed:", res.status, txt);
  }
}

app.post("/report", async (req, res) => {
  try {
    // Log incoming request for debugging: remote IP, headers, and body
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      console.log('[report] incoming request from', ip);
      console.log('[report] headers:', JSON.stringify(req.headers));
      console.log('[report] body:', JSON.stringify(req.body));
    } catch (logErr) {
      console.warn('[report] failed to log request details', logErr && logErr.message);
    }

    // Persist request to requests.log for post-mortem inspection
    try {
      const entry = { time: new Date().toISOString(), ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown', body: req.body };
      await appendFile('requests.log', JSON.stringify(entry) + '\n', { encoding: 'utf8' });
    } catch (fileErr) {
      console.warn('[report] failed to append to requests.log', fileErr && fileErr.message);
    }

    const { username, uuid, client } = req.body || {};
    if (!username) return res.status(400).json({ error: "username required" });

    const time = new Date().toISOString();
    const contentParts = [
      `Player joined: **${username}**`,
      `UUID: \`${uuid || 'unknown'}\``,
      `Client: ${client || 'unknown'}`,
      `Time: ${time}`,
    ];
    let content = contentParts.join("\n");

    // Discord limit for content is ~2000 characters. Use 1900 safety margin and split if needed.
    const max = 1900;
    if (content.length <= max) {
      await postToDiscord(content);
    } else {
      // Try to split by newline groups first.
      const parts = [];
      // Add a header
      const header = `Player joined: **${username}** (long message)\nTime: ${time}\n`;
      let remaining = content.replace(`Player joined: **${username}**\n`, "");

      const chunks = chunkString(remaining, max - header.length);
      for (let i = 0; i < chunks.length; i++) {
        parts.push(header + `Part ${i+1}/${chunks.length}:\n` + chunks[i]);
      }

      for (const p of parts) {
        await postToDiscord(p);
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

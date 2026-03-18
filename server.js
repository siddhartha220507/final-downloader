const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// STEP 3: /api/info - Get formats list
app.post("/api/info", (req, res) => {
  const url = req.body.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const yt = spawn("yt-dlp", ["-J", url]);

  let data = "";
  let error = "";

  yt.stdout.on("data", chunk => data += chunk);
  yt.stderr.on("data", chunk => error += chunk);

  yt.on("close", code => {
    if (code !== 0) {
      return res.status(500).json({ error: error || "Failed to fetch video info" });
    }

    try {
      const json = JSON.parse(data);

      // Separate audio and video formats
      const videoFormats = json.formats
        .filter(f => f.vcodec && f.vcodec !== 'none')
        .map(f => ({
          format_id: f.format_id,
          ext: f.ext,
          quality: f.format_note || f.format || "Unknown",
          filesize: f.filesize,
          type: "video"
        }));

      const audioFormats = json.formats
        .filter(f => f.acodec && f.acodec !== 'none')
        .map(f => ({
          format_id: f.format_id,
          ext: f.ext,
          quality: f.format_note || f.format || "Unknown",
          filesize: f.filesize,
          type: "audio"
        }));

      res.json({
        title: json.title,
        thumbnail: json.thumbnail,
        duration: json.duration,
        videoFormats,
        audioFormats
      });

    } catch (e) {
      res.status(500).json({ error: "Parsing failed: " + e.message });
    }
  });
});

// STEP 4: Download Endpoint
app.get("/api/download", (req, res) => {
  const { url, format_id } = req.query;

  if (!url || !format_id) {
    return res.status(400).json({ error: "URL and format_id are required" });
  }

  const yt = spawn("yt-dlp", [
    "-f", format_id,
    "-o", "-",
    url
  ]);

  res.setHeader("Content-Disposition", "attachment; filename=download");

  yt.stdout.pipe(res);

  yt.stderr.on("data", chunk => {
    console.error("Error:", chunk.toString());
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server running" });
});

// STEP 5: Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`Make sure yt-dlp is installed: pip install yt-dlp`);
});

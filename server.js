const express = require("express");
const { spawn } = require("child_process");
const app = express();

// ✅ Parse JSON
app.use(express.json());

// ✅ FORCE CORS HEADERS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ✅ HANDLE OPTIONS PREFLIGHT
app.options("*", (req, res) => {
  return res.sendStatus(200);
});

// ✅ HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "Server running ✅" });
});

// ✅ DEBUG: Test yt-dlp binary
app.get("/test", (req, res) => {
  try {
    const yt = spawn("yt-dlp", ["--version"]);
    let data = "";
    let error = "";

    yt.stdout.on("data", chunk => data += chunk);
    yt.stderr.on("data", chunk => error += chunk);

    yt.on("error", (err) => {
      return res.status(500).send(`yt-dlp spawn error: ${err.message}`);
    });

    yt.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).send(`yt-dlp error: ${error}`);
      }
      res.send(`✅ yt-dlp version: ${data}`);
    });
  } catch (e) {
    res.status(500).send(`Test error: ${e.message}`);
  }
});

// ✅ MAIN ENDPOINT: Get video info
app.post("/api/info", (req, res) => {
  const url = req.body.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // ✅ ONLY spawn yt-dlp inside route (never on startup!)
    const yt = spawn("yt-dlp", ["-J", url]);

    let data = "";
    let error = "";

    // Listen to stdout
    yt.stdout.on("data", chunk => {
      data += chunk;
    });

    // Listen to stderr
    yt.stderr.on("data", chunk => {
      error += chunk;
    });

    // ✅ IMPORTANT: Handle spawn errors
    yt.on("error", (err) => {
      console.error("Spawn error:", err);
      return res.status(500).json({ error: "yt-dlp failed to start: " + err.message });
    });

    // Handle process close
    yt.on("close", (code) => {
      if (code !== 0) {
        console.error("yt-dlp error:", error);
        return res.status(500).json({ error: "yt-dlp error: " + error });
      }

      try {
        const json = JSON.parse(data);

        // Separate formats
        const videoFormats = json.formats
          ?.filter(f => f.vcodec && f.vcodec !== 'none')
          .map(f => ({
            format_id: f.format_id,
            ext: f.ext,
            quality: f.format_note || f.format || "Unknown",
            filesize: f.filesize,
            type: "video"
          })) || [];

        const audioFormats = json.formats
          ?.filter(f => f.acodec && f.acodec !== 'none')
          .map(f => ({
            format_id: f.format_id,
            ext: f.ext,
            quality: f.format_note || f.format || "Unknown",
            filesize: f.filesize,
            type: "audio"
          })) || [];

        res.json({
          title: json.title,
          thumbnail: json.thumbnail,
          duration: json.duration,
          videoFormats,
          audioFormats
        });

      } catch (e) {
        console.error("Parse error:", e);
        res.status(500).json({ error: "Parse error: " + e.message });
      }
    });

  } catch (e) {
    console.error("Catch error:", e);
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

// ✅ DOWNLOAD ENDPOINT
app.get("/api/download", (req, res) => {
  const { url, format_id } = req.query;

  if (!url || !format_id) {
    return res.status(400).json({ error: "URL and format_id are required" });
  }

  try {
    const yt = spawn("yt-dlp", [
      "-f", format_id,
      "-o", "-",
      url
    ]);

    res.setHeader("Content-Disposition", "attachment; filename=video");

    yt.on("error", (err) => {
      console.error("Download spawn error:", err);
      res.status(500).send("Download failed");
    });

    yt.stdout.pipe(res);

    yt.stderr.on("data", chunk => {
      console.error("Download error:", chunk.toString());
    });

  } catch (e) {
    res.status(500).json({ error: "Download error: " + e.message });
  }
});

// ✅ ROOT ENDPOINT
app.get("/", (req, res) => {
  res.send("YouTube Downloader Backend ✅");
});

const PORT = process.env.PORT || 5000;

// ✅ START SERVER (NO yt-dlp here!)
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ CORS enabled`);
  console.log(`✅ Test: GET /test`);
  console.log(`✅ Health: GET /api/health`);
});

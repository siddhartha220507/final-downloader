const express = require("express");
const app = express();

// ✅ Parse JSON
app.use(express.json());

// ✅ FORCE CORS HEADERS (Most important)
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

// ✅ HEALTH CHECK (test endpoint)
app.get("/api/health", (req, res) => {
  res.json({ status: "Server running ✅" });
});

// ✅ TEST INFO ENDPOINT
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // TEMPORARY: Just return test data
  return res.json({
    title: "Test Video Title",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 212,
    videoFormats: [
      { format_id: "22", ext: "mp4", quality: "720p", filesize: 52428800, type: "video" },
      { format_id: "18", ext: "mp4", quality: "360p", filesize: 20971520, type: "video" }
    ],
    audioFormats: [
      { format_id: "140", ext: "m4a", quality: "128 kbps", filesize: 3145728, type: "audio" }
    ]
  });
});

// ✅ ROOT ENDPOINT
app.get("/", (req, res) => {
  res.send("YouTube Downloader Backend ✅");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ CORS enabled for all origins`);
  console.log(`✅ Test: curl http://localhost:${PORT}/api/health`);
});

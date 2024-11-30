const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());

/**
 * API keys for rotating requests.
 */
const apiKeys = [
  "db751b0a05msh95365b14dcde368p12dbd9jsn440b1b8ae7cb",
  "0649dc83c2msh88ac949854b30c2p1f2fe8jsn871589450eb3",
  "0e88d5d689msh145371e9bc7d2d8p17eebejsn8ff825d6291f",
  "ea7a66dfaemshecacaabadeedebbp17b247jsn7966d78a3945",
];

let currentKeyIndex = 0;

/**
 * Rotates through API keys and returns the next one.
 * @returns {string} The next API key.
 */
const getNextApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return apiKeys[currentKeyIndex];
};

/**
 * Extracts the video ID from a YouTube URL.
 * @param {string} url - The YouTube URL.
 * @returns {string|boolean} - The video ID or false if invalid.
 */
const youtube_parser = (url) => {
  url = url.replace(/\?si=.*/, ""); // Remove tracking parameters like ?si=
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7]?.length === 11 ? match[7] : false;
};

app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "YouTube URL is required." });
  }

  const videoId = youtube_parser(url);
  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL." });
  }

  const apiKey = getNextApiKey(); // Get the next API key
  const options = {
    method: "GET",
    url: "https://youtube-mp36.p.rapidapi.com/dl",
    params: { id: videoId },
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    const { title, link } = response.data;

    if (!link) {
      return res.status(500).json({ error: "Failed to retrieve download link." });
    }

    const filePath = path.join(__dirname, `${title}.mp3`);
    const writer = fs.createWriteStream(filePath);

    const audioResponse = await axios.get(link, { responseType: "stream" });
    audioResponse.data.pipe(writer);

    writer.on("finish", () => {
      res.download(filePath, `${title}.mp3`, () => {
        fs.unlinkSync(filePath); // Clean up the file after sending
      });
    });

    writer.on("error", (err) => {
      console.error("Error writing file:", err);
      res.status(500).json({ error: "Error downloading the MP3 file." });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to download MP3." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

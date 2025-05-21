const express = require('express');
const compression = require('compression');
const axios = require('axios');

const app = express();
const port = 3000;
app.use(compression());
app.use(express.json());

const apiKeys = [
  'db751b0a05msh95365b14dcde368p12dbd9jsn440b1b8ae7cb',
  '0649dc83c2msh88ac949854b30c2p1f2fe8jsn871589450eb3',
  '0e88d5d689msh145371e9bc7d2d8p17eebejsn8ff825d6291f',
  'ea7a66dfaemshecacaabadeedebbp17b247jsn7966d78a3945',
];
let currentKeyIndex = 0;
const getNextApiKey = () => apiKeys[(currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length)];

const cache = new Map();
const apiKeyUsage = new Map(apiKeys.map(key => [key, 0]));

const youtube_parser = url => {
  url = url.replace(/\?si=.*/, '');
  const match = url.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
  return match && match[7]?.length === 11 ? match[7] : false;
};

app.get('/', (req, res) => res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube MP3 Downloader</title>
    <style>
      body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 0; background: #f9f9f9; color: #333; }
      h1 { margin-top: 20px; font-size: 24px; color: #007BFF; }
      input, button { padding: 10px; font-size: 16px; margin: 5px; width: 90%; max-width: 400px; box-sizing: border-box; }
      button { background: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer; }
      button:hover { background: #0056b3; }
      footer { margin-top: 30px; font-size: 14px; color: gray; }
      footer a { color: #007BFF; text-decoration: none; }
      footer a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>YouTube MP3 Downloader</h1>
    <p>Enter a YouTube URL to download the MP3</p>
    <input id="youtubeUrl" placeholder="Enter YouTube URL">
    <button onclick="downloadMp3()">Search</button>
    <p id="result"></p>
    <footer>Dev by <a href="https://github.com/mistakes333" target="_blank">mistakes333</a></footer>
    <script>
      async function downloadMp3() {
        const url = document.getElementById('youtubeUrl').value;
        if (!url) return document.getElementById('result').innerText = 'Please enter a URL.';
        document.getElementById('result').innerText = 'Processing...';
        try {
          const res = await fetch(\`/download?url=\${encodeURIComponent(url)}\`);
          const data = await res.json();
          document.getElementById('result').innerHTML = data.link ? \`<a href="\${data.link}" target="_blank">Download</a>\` : 'Failed to get the MP3 link.';
        } catch (e) {
          document.getElementById('result').innerText = 'Error: ' + e.message;
        }
      }
    </script>
  </body>
  </html>
`));

app.get('/download', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Invalid URL parameter' });

  const videoId = youtube_parser(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

  if (cache.has(videoId)) return res.json({ success: true, cached: true, link: cache.get(videoId) });

  const apiKey = getNextApiKey();
  try {
    const { data } = await axios.get('https://youtube-mp36.p.rapidapi.com/dl', {
      params: { id: videoId },
      headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com' }
    });
    if (!data.link) throw new Error('Invalid response from API');
    cache.set(videoId, data.link);
    apiKeyUsage.set(apiKey, (apiKeyUsage.get(apiKey) || 0) + 1);
    res.json({ success: true, cached: false, link: data.link });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch download link' });
  }
});

app.get('/stats', (_req, res) => {
  const stats = { cachedItems: cache.size, apiKeyUsage: Array.from(apiKeyUsage.entries()).map(([key, count]) => ({ key, count })) };
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Statistics</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f9; text-align: center; margin: 0; padding: 20px; }
        .stats { max-width: 600px; margin: auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .stat-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
        .stat-item:last-child { border-bottom: none; }
        footer { margin-top: 20px; color: gray; }
        footer a { color: #007BFF; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>Server Statistics</h1>
      <div class="stats">
        <div class="stat-item"><span>Cached Items:</span><span>${stats.cachedItems}</span></div>
        ${stats.apiKeyUsage.map(({ key, count }) => `<div class="stat-item"><span>${key}</span><span>${count}</span></div>`).join('')}
      </div>
      <footer>Dev by <a href="https://github.com/mistakes333" target="_blank">mistakes333</a></footer>
    </body>
    </html>
  `);
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

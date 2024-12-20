import express from 'express';
import compression from 'compression';
import axios from 'axios';

// Initialize the app
const app = express();
const port = 3000;

// Middleware
app.use(compression());
app.use(express.json());

// API Key Rotation
const apiKeys = [
  'db751b0a05msh95365b14dcde368p12dbd9jsn440b1b8ae7cb',
  '0649dc83c2msh88ac949854b30c2p1f2fe8jsn871589450eb3',
  '0e88d5d689msh145371e9bc7d2d8p17eebejsn8ff825d6291f',
  'ea7a66dfaemshecacaabadeedebbp17b247jsn7966d78a3945',
];
let currentKeyIndex = 0;
const getNextApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return apiKeys[currentKeyIndex];
};

// Cache and Usage Tracking
const cache = new Map();
const apiKeyUsage = new Map(apiKeys.map((key) => [key, 0]));

// YouTube ID Parser
const youtube_parser = (url) => {
  url = url.replace(/\?si=.*/, '');
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7]?.length === 11 ? match[7] : false;
};

// Routes

// Dashboard
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>YouTube MP3 Downloader</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; }
        h1 { margin-top: 20px; font-size: 24px; color: #007BFF; }
        input, button { padding: 10px; font-size: 16px; margin: 5px; width: 90%; max-width: 400px; box-sizing: border-box; }
        button { background-color: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background-color: #0056b3; }
        footer { margin-top: 30px; font-size: 14px; color: gray; }
        footer a { color: #007BFF; text-decoration: none; }
        footer a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>YouTube MP3 Downloader</h1>
      <p>Enter a YouTube URL to download the MP3</p>
      <input type="text" id="youtubeUrl" placeholder="Enter YouTube URL">
      <button onclick="downloadMp3()">Search</button>
      <p id="result"></p>
      <footer>Dev by <a href="https://github.com/mistakes333" target="_blank">mistakes333</a></footer>
      <script>
        async function downloadMp3() {
          const url = document.getElementById('youtubeUrl').value;
          if (!url) {
            document.getElementById('result').innerText = 'Please enter a URL.';
            return;
          }
          document.getElementById('result').innerText = 'Processing...';
          try {
            const response = await fetch(\`/download?url=\${encodeURIComponent(url)}\`);
            const data = await response.json();
            if (data.link) {
              document.getElementById('result').innerHTML = \`<a href="\${data.link}" target="_blank">Download</a>\`;
            } else {
              document.getElementById('result').innerText = 'Failed to get the MP3 link.';
            }
          } catch (error) {
            document.getElementById('result').innerText = 'Error: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `;
  res.send(html);
});


// Download Endpoint
app.get('/download', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL parameter' });
  }

  const videoId = youtube_parser(url);
  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  // Check Cache
  if (cache.has(videoId)) {
    return res.json({ success: true, cached: true, link: cache.get(videoId) });
  }

  const apiKey = getNextApiKey();
  const options = {
    method: 'GET',
    url: 'https://youtube-mp36.p.rapidapi.com/dl',
    params: { id: videoId },
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);
    const { link } = response.data;

    if (link) {
      cache.set(videoId, link);
      apiKeyUsage.set(apiKey, (apiKeyUsage.get(apiKey) || 0) + 1);
      return res.json({ success: true, cached: false, link });
    } else {
      throw new Error('Invalid response from API');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch download link' });
  }
});

// Stats Page
app.get('/stats', (_req, res) => {
  const stats = {
    cachedItems: cache.size,
    apiKeyUsage: Array.from(apiKeyUsage.entries()).map(([key, count]) => ({
      key,
      count,
    })),
  };

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Statistics</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f9;
          text-align: center;
          margin: 0;
          padding: 20px;
        }
        .stats {
          max-width: 600px;
          margin: auto;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .stat-item:last-child {
          border-bottom: none;
        }
        footer {
          margin-top: 20px;
          color: gray;
        }
        footer a {
          color: #007BFF;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <h1>Server Statistics</h1>
      <div class="stats">
        <div class="stat-item">
          <span>Cached Items:</span>
          <span>${stats.cachedItems}</span>
        </div>
        ${stats.apiKeyUsage
          .map(
            ({ key, count }) => `
            <div class="stat-item">
              <span>${key}</span>
              <span>${count}</span>
            </div>
          `
          )
          .join('')}
      </div>
      <footer>Dev by <a href="https://github.com/mistakes333" target="_blank">mistakes333</a></footer>
    </body>
    </html>
  `;

  res.send(html);
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

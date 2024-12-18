const express = require('express');
const compression = require('compression');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Enable JSON parsing
app.use(express.json());

// Enable compression for all responses
app.use(compression());

// Path to cache file
const cacheFilePath = path.resolve(__dirname, 'cache.json');

// Load cache from file or initialize it
let cache = {};
if (fs.existsSync(cacheFilePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
  } catch (error) {
    console.error('Failed to load cache:', error.message);
  }
}

// Save cache to file
const saveCache = () => {
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save cache:', error.message);
  }
};

// API keys and rotation logic
const apiKeys = [
  'db751b0a05msh95365b14dcde368p12dbd9jsn440b1b8ae7cb',
  '0649dc83c2msh88ac949854b30c2p1f2fe8jsn871589450eb3',
  '0e88d5d689msh145371e9bc7d2d8p17eebejsn8ff825d6291f',
  'ea7a66dfaemshecacaabadeedebbp17b247jsn7966d78a3945',
];
let currentKeyIndex = 0;

const getNextApiKey = () => apiKeys[(currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length)];

const youtube_parser = (url) => {
  url = url.replace(/\?si=.*/, '');
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7]?.length === 11 ? match[7] : false;
};

// Serve the dashboard
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
            const response = await fetch(\`/dl?url=\${encodeURIComponent(url)}\`);
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

// Enhanced download route with caching
app.get('/dl', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    res.status(400).json({ error: 'Missing YouTube URL' });
    return;
  }

  const videoId = youtube_parser(url);
  if (!videoId) {
    res.status(400).json({ error: 'Invalid YouTube URL' });
    return;
  }

  // Check cache
  if (cache[videoId]) {
    console.log('Serving from cache:', videoId);
    res.json(cache[videoId]);
    return;
  }

  let retries = 3;
  let success = false;
  let response = null;

  while (retries > 0 && !success) {
    const apiKey = getNextApiKey();
    const options = {
      method: 'GET',
      url: 'https://youtube-mp36.p.rapidapi.com/dl',
      params: { id: videoId },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
      },
      timeout: 5000, // 5 seconds timeout
    };

    try {
      response = await axios.request(options);
      if (response.data && response.data.link) {
        success = true;
        cache[videoId] = response.data; // Store result in cache
        saveCache(); // Save to file
        break;
      } else {
        throw new Error('No MP3 link found in response.');
      }
    } catch (error) {
      console.error(`Attempt failed with API key: ${apiKey} - ${error.message}`);
      retries--;
    }
  }

  if (success) {
    res.json(response.data);
  } else {
    res.status(500).json({ error: 'Failed to fetch MP3 after multiple attempts.' });
  }
});

// Handle undefined routes
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

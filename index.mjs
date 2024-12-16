import http from 'node:http';
import { URL } from 'node:url';
import axios from 'axios';
import zlib from 'node:zlib';

const port = 3000;

// API keys and rotation logic
const apiKeys = [
  'db751b0a05msh95365b14dcde368p12dbd9jsn440b1b8ae7cb',
  '0649dc83c2msh88ac949854b30c2p1f2fe8jsn871589450eb3',
  '0e88d5d689msh145371e9bc7d2d8p17eebejsn8ff825d6291f',
  'ea7a66dfaemshecacaabadeedebbp17b247jsn7966d78a3945',
];
let currentKeyIndex = 0;
let retries = 0; // Retry counter

const getNextApiKey = () => apiKeys[(currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length)];

const youtube_parser = (url) => {
  url = url.replace(/\?si=.*/, '');
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7]?.length === 11 ? match[7] : false;
};

const respondWithCompression = (res, statusCode, content, type = 'text/plain') => {
  res.writeHead(statusCode, {
    'Content-Type': type,
    'Content-Encoding': 'gzip',
  });
  zlib.gzip(content, (err, compressed) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Compression error');
    } else {
      res.end(compressed);
    }
  });
};

const serveDashboard = (res) => {
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
  respondWithCompression(res, 200, html, 'text/html');
};

const handleDownload = async (res, url) => {
  const videoId = youtube_parser(url);
  if (!videoId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid YouTube URL' }));
    return;
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response.data));
  } catch (error) {
    console.error(error.message);
    if (retries < 3) {
      retries++;
      console.log(`Retrying... attempt ${retries}`);
      handleDownload(res, url);  // Retry the download
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to fetch MP3 after 3 retries' }));
  }
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const path = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  if (path === '/') {
    serveDashboard(res);
  } else if (path === '/dl') {
    const { url } = query;
    if (!url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing YouTube URL' }));
      return;
    }
    handleDownload(res, url);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

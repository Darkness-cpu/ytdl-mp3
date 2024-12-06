import http from 'node:http';
import { URL } from 'node:url';
import axios from 'axios';

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
      handleDownload(res, url); // Retry the download
      return;
    }
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to fetch MP3 after 3 retries' }));
  }
};

const addCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const apiDocs = `
# YouTube MP3 Downloader API

## Endpoints

### \`GET /dl\`
**Description**: Downloads YouTube video as MP3.

#### Query Parameters:
- \`url\` (required): The YouTube video URL.

#### Example Request:
\`\`\`
GET /dl?url=https://www.youtube.com/watch?v=UxxajLWwzqY
\`\`\`

#### Example Response:
\`\`\`json
{
  "status": "ok",
  "title": "Song Title",
  "link": "https://download-link.com/file.mp3"
}
\`\`\`
`;

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const path = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    addCorsHeaders(res);
    res.writeHead(204); // No Content
    res.end();
    return;
  }

  addCorsHeaders(res);

  if (path === '/dl') {
    const { url } = query;
    if (!url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing YouTube URL' }));
      return;
    }
    handleDownload(res, url);
  } else if (path === '/api-docs') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Documentation</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/15.0.3/marked.min.js"></script>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 0;
          }
          pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <h1>API Documentation</h1>
        <div id="content"></div>
        <script>
          const markdown = \`${apiDocs}\`;
          document.getElementById('content').innerHTML = marked.parse(markdown);
        </script>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

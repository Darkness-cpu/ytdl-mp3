const express = require('express');
const axios = require('axios');
const cors = require('cors');
const compression = require('compression');

const app = express();
const port = 3000;

// API keys and rotation logic
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

const youtube_parser = (url) => {
  url = url.replace(/\?si=.*/, '');
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7]?.length === 11 ? match[7] : false;
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(compression());

// Serve a simple dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>YouTube MP3 Downloader</title>
      <style>
        /* Global Styles */
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
          color: #333;
        }

        /* Header */
        h1 {
          margin-top: 20px;
          font-size: 24px;
          color: #007BFF;
        }

        p {
          margin: 10px;
          font-size: 16px;
        }

        /* Input and Button Styles */
        input, button {
          padding: 10px;
          font-size: 16px;
          margin: 5px;
          width: 90%;
          max-width: 400px;
          box-sizing: border-box;
        }

        button {
          background-color: #007BFF;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          width: 50%;
          max-width: 200px;
        }

        button:hover {
          background-color: #0056b3;
        }

        /* Result Section */
        #result {
          margin-top: 20px;
          font-size: 16px;
          color: #555;
        }

        /* Footer */
        footer {
          margin-top: 30px;
          font-size: 14px;
          color: gray;
        }

        footer a {
          color: #007BFF;
          text-decoration: none;
        }

        footer a:hover {
          text-decoration: underline;
        }

        /* Responsive Design */
        @media (max-width: 600px) {
          h1 {
            font-size: 20px;
          }

          input, button {
            font-size: 14px;
            padding: 8px;
          }

          button {
            width: 70%;
          }
        }
      </style>
    </head>
    <body>
      <h1>YouTube MP3 Downloader</h1>
      <p>Enter a YouTube URL to download the MP3</p>
      <input type="text" id="youtubeUrl" placeholder="Enter YouTube URL">
      <button onclick="downloadMp3()">Search</button>
      <p id="result"></p>
      <footer>
        Dev by <a href="https://github.com/Darkness-cpu" target="_blank">Darkness-cpu</a>
      </footer>
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
  `);
});
        
app.get('/api-docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Documentation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f4f4f9;
          color: #333;
        }

        h1 {
          color: #007BFF;
        }

        code {
          background-color: #e8e8e8;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }

        pre {
          background-color: #f8f8f8;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow-x: auto;
        }

        footer {
          margin-top: 30px;
          font-size: 14px;
          color: gray;
          text-align: center;
        }

        footer a {
          color: #007BFF;
          text-decoration: none;
        }

        footer a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <h1>API Documentation</h1>
      <h2>Endpoint: <code>https://ytdl-api-3w14.onrender.com/dl</code></h2>
      <p>Retrieve a downloadable MP3 link for a given YouTube video.</p>

      <h3>HTTP Method</h3>
      <p><code>GET</code></p>

      <h3>Query Parameters</h3>
      <table border="1" cellpadding="10" cellspacing="0">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>url</code></td>
            <td>string</td>
            <td>Yes</td>
            <td>The full YouTube video URL (e.g., <code>https://www.youtube.com/watch?v=VIDEO_ID</code>).</td>
          </tr>
        </tbody>
      </table>

      <h3>Response</h3>
      <h4>Success</h4>
      <pre>
{
  "link": "https://malpha.123tokyo.xyz/get.php/1/bb/dQw4w9WgXcQ.mp3?cid=MmEwMTo0Zjg6YzAxMjozMmVlOjoxfE5BfERF&h=UtuqjcteasOFs8z-z5sMpw&s=1733063589&n=Rick%20Astley%20-%20Never%20Gonna%20Give%20You%20Up%20%28Official%20Music%20Video%29&uT=R&uN=a2FuMDk1ODMwMDM0MQ%3D%3D",
  "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  "filesize": 3575203,
  "progress": 0,
  "duration": 212.06204147058,
  "status": "ok",
  "msg": "success"
}
      </pre>

      <h4>Error</h4>
      <pre>
{
  "error": "Error message here"
}
      </pre>

      <h3>Example Request</h3>
      <p>Access via browser or a tool like <code>curl</code>:</p>
      <pre>
GET /dl?url=https://youtu.be/dQw4w9WgXcQ?si=u84CSHQeapTSuGY1
      </pre>

      <h3>Example cURL</h3>
      <pre>
curl -X GET "https://ytdl-api-3w14.onrender.com/dl?url=https://youtu.be/dQw4w9WgXcQ?si=u84CSHQeapTSuGY1"
      </pre>

      <footer>
        Developer by <a href="https://github.com/Darkness-cpu" target="_blank">Darkness-cpu</a>
      </footer>
    </body>
    </html>
  `);
});


// Endpoint for downloading YouTube MP3
app.get('/dl', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: 'Missing YouTube URL' });
  }

  const videoId = youtube_parser(url);
  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
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
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch MP3' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port:${port}`);
});

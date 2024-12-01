const express = require('express');
const axios = require('axios');
const cors = require('cors');
const compression = require('compression');

const app = express();
const port = 4000;

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
        Develop By <a href="https://github.com/Darkness-cpu" target="_blank">Darkness-cpu</a>
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
  console.log(`Server is running on http://localhost:${port}`);
});

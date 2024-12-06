import express from 'express';
import axios from 'axios';
import compression from 'compression';
import bodyParser from 'body-parser';

// Initialize the express app
const app = express();

// Use compression and body-parser middleware
app.use(compression());
app.use(bodyParser.json());

// Port
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

// Endpoint to download MP3 from YouTube
app.get('/dl', async (req, res) => {
  const { url } = req.query;

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
    return res.status(200).json(response.data);
  } catch (error) {
    console.error(error.message);
    if (retries < 3) {
      retries++;
      console.log(`Retrying... attempt ${retries}`);
      return app.get('/download', async (req, res) => {
        const { url } = req.query;
        // Retry the download
        const videoId = youtube_parser(url);
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
          return res.status(200).json(response.data);
        } catch (err) {
          return res.status(500).json({ error: 'Failed to fetch MP3 after 3 retries' });
        }
      });
    }
    return res.status(500).json({ error: 'Failed to fetch MP3 after 3 retries' });
  }
});

// Start the server

app.listen(port, () => {
  console.log('Express server initialized');
});

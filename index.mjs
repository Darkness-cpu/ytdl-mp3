import express from 'express';
import compression from 'compression';
import axios from 'axios';

const app = express();
const port = 3000;

// Enable JSON parsing
app.use(express.json());

// Enable compression for all responses
app.use(compression());

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
  res.sendFile(__dirname + '/public/index.html');
});

// Handle the download path
app.get('/dl', async (req, res) => {
// Handle the download path with added stability
app.get('/download', async (req, res) => {
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

  let retries = 3; // Number of retry attempts
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
        break; // Exit loop if the request is successful
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
  console.log(`Server is running on port:${port}`);
});

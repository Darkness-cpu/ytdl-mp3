import express, { Request, Response } from 'express';
import compression from 'compression';
import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

const app = express();
const port = 3000;

// Enable JSON parsing
app.use(express.json());

// Enable compression for all responses
app.use(compression());

// Path to the cache file
const cacheFilePath = path.join(__dirname, 'cache.json.gz');

// Helper function: Load cache from gzip file
const loadCache = (): Record<string, string> => {
  if (!fs.existsSync(cacheFilePath)) return {};
  const compressedData = fs.readFileSync(cacheFilePath);
  const decompressedData = zlib.gunzipSync(compressedData).toString('utf-8');
  return JSON.parse(decompressedData);
};

// Helper function: Save cache to gzip file with compression level 9
const saveCache = (cache: Record<string, string>) => {
  const compressedData = zlib.gzipSync(JSON.stringify(cache), { level: 9 });
  fs.writeFileSync(cacheFilePath, compressedData);
};

// API keys and rotation logic
const apiKeys: string[] = [
  'db751b0a05msh95365b14dcde368p12dbd9jsn440b1b8ae7cb',
  '0649dc83c2msh88ac949854b30c2p1f2fe8jsn871589450eb3',
  '0e88d5d689msh145371e9bc7d2d8p17eebejsn8ff825d6291f',
  'ea7a66dfaemshecacaabadeedebbp17b247jsn7966d78a3945',
];
let currentKeyIndex = 0;

const getNextApiKey = (): string => apiKeys[(currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length)];

const youtube_parser = (url: string): string | false => {
  url = url.replace(/\?si=.*/, '');
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7]?.length === 11 ? match[7] : false;
};

// Download route
app.get('/download', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing YouTube URL' });
    return;
  }

  const videoId = youtube_parser(url);
  if (!videoId) {
    res.status(400).json({ error: 'Invalid YouTube URL' });
    return;
  }

  // Load cache
  const cache = loadCache();

  // Check cache
  if (cache[videoId]) {
    console.log('Serving from cache');
    res.json({ link: cache[videoId] });
    return;
  }

  let retries = 3;
  let success = false;
  let mp3Link = '';

  while (retries > 0 && !success) {
    const apiKey = getNextApiKey();
    const options: AxiosRequestConfig = {
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
      const response = await axios.request(options);
      if (response.data && response.data.link) {
        success = true;
        mp3Link = response.data.link;

        // Save to cache
        cache[videoId] = mp3Link;
        saveCache(cache);
        break;
      } else {
        throw new Error('No MP3 link found in response.');
      }
    } catch (error) {
      console.error(`Attempt failed with API key: ${apiKey} - ${(error as Error).message}`);
      retries--;
    }
  }

  if (success) {
    res.json({ link: mp3Link });
  } else {
    res.status(500).json({ error: 'Failed to fetch MP3 after multiple attempts.' });
  }
});

// Handle undefined routes
app.use((_req, res) => {
  res.status(404).send('Not Found');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

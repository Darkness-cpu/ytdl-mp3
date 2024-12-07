import { Elysia, t } from 'elysia';
import axios from 'axios';

const apiKeys = [
  'db751b0a05msh95365b14dcde368p12dbd9jsn440b1b8ae7cb',
  '0649dc83c2msh88ac949854b30c2p1f2fe8jsn871589450eb3',
  '0e88d5d689msh145371e9bc7d2d8p17eebejsn8ff825d6291f',
  'ea7a66dfaemshecacaabadeedebbp17b247jsn7966d78a3945',
];
let currentKeyIndex = 0;
let retries = 0; // Retry counter

const getNextApiKey = () => apiKeys[(currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length)];

const youtube_parser = (url: string): string | false => {
  url = url.replace(/\?si=.*/, '');
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7]?.length === 11 ? match[7] : false;
};

const handleDownload = async (url: string) => {
  const videoId = youtube_parser(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
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
    return response.data;
  } catch (error) {
    retries++;
    if (retries < 3) {
      console.log(`Retrying... attempt ${retries}`);
      return handleDownload(url);
    }
    throw new Error('Failed to fetch MP3 after 3 retries');
  }
};

const app = new Elysia()
  .get(
    '/download',
    async ({ query }) => {
      const { url } = query;
      if (!url) {
        return { error: 'Missing YouTube URL' };
      }

      try {
        const data = await handleDownload(url);
        retries = 0; // Reset retry counter
        return data;
      } catch (error: any) {
        return { error: error.message };
      }
    },
    {
      query: t.Object({
        url: t.String(),
      }),
    }
  )
  .listen(3000);

console.log(`⚡ Elysia server is running at http://localhost:3000`);

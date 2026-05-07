import axios from 'axios';

const wc = axios.create({
  baseURL: process.env.WC_BASE_URL,
  auth: {
    username: process.env.WC_CONSUMER_KEY!,
    password: process.env.WC_CONSUMER_SECRET!,
  },
  timeout: 15000,
});

export default wc;

// IMPORTS
import axios from 'axios';
import { getClientSessionId } from '@/realtime/client-session.js';

// SETUP SERVER BASE URL
const serverBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL || '').replace(/\/$/, '');

// SETUP HTTP CLIENT
const http = axios.create({
  baseURL: import.meta.env.DEV || !serverBaseUrl
    ? '/api'
    : `${ serverBaseUrl }/api`,
  headers: {
    'X-Client-Id': getClientSessionId(),
  },
});

// EXPORTS
export default http;

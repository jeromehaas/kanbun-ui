// IMPORTS
import axios from 'axios';
import { clearStoredAuthSession, getStoredAuthToken } from '@/auth/session.js';
import { getClientSessionId } from '@/realtime/client-session.js';

// SETUP SERVER BASE URL
const serverBaseUrl = (import.meta.env.VITE_SERVER_BASE_URL || '').replace(/\/$/, '');

// SETUP HTTP CLIENT
const http = axios.create({
  baseURL: import.meta.env.DEV || !serverBaseUrl
    ? '/api'
    : `${ serverBaseUrl }/api`,
});

// INTERCEPTOR: ATTACH AUTH AND CLIENT HEADERS
http.interceptors.request.use((config) => {

  // GET TOKEN
  const token = getStoredAuthToken();

  // APPEND HEADERS
  config.headers = config.headers || {};
  config.headers['X-Client-Id'] = getClientSessionId();

  // APPEND TOKEN IF AVAILABLE
  if (token) {
    config.headers.Authorization = `Bearer ${ token }`;
  } else {
    delete config.headers.Authorization;
  }

  // RETURN
  return config;
});

// INTERCEPTOR: HANDLE EXPIRED SESSIONS
http.interceptors.response.use(
  (response) => response,
  (error) => {

    // CHECK FOR SESSION
    const hasSession = Boolean(getStoredAuthToken());

    // CHECK FOR MISSING WINDOS OR ERROR RESPONSE
    if (typeof window !== 'undefined' && hasSession && error?.response?.status === 401) {

      // CLEAR AUTH SESSION
      clearStoredAuthSession();

      // DISPATCH FAILED AUTH EVENT
      window.dispatchEvent(new CustomEvent('kanbun:unauthorized', {
        detail: {
          message: error.response?.data?.ERROR || 'Your session expired. Please sign in again.',
        },
      }));
    }

    // RETURN
    return Promise.reject(error);
  },
);

// EXPORTS
export default http;

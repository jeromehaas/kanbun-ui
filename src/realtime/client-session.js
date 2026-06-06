// FUNCTION: CREATE CLIENT SESSION ID
const createClientSessionId = () => {

  // USE BROWSER UUID IF AVAILABLE
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // FALLBACK SESSION ID
  return `kanbun-${ Date.now() }-${ Math.random().toString(16).slice(2) }`;
};

// SETUP STATE
let clientSessionId = null;

// FUNCTION: GET CLIENT SESSION ID
const getClientSessionId = () => {

  // SSR FALLBACK
  if (typeof window === 'undefined') {
    return 'server-render';
  }

  // CREATE SESSION ON FIRST ACCESS
  if (!clientSessionId) {
    clientSessionId = createClientSessionId();
  }

  // RETURN SESSION ID
  return clientSessionId;
};

// EXPORTS
export {
  getClientSessionId,
};

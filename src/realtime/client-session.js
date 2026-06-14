// FUNCTION: CREATE CLIENT SESSION ID
const createClientSessionId = () => {

  // USE BROWSER UUID IF AVAILABLE
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {

    // RETURN
    return crypto.randomUUID();
  }

  // RETURN
  return `kanbun-${ Date.now() }-${ Math.random().toString(16).slice(2) }`;
};

// DEFINE CLIENT SESSION ID
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

  // RETURN
  return clientSessionId;
};

// EXPORTS
export {
  getClientSessionId,
};

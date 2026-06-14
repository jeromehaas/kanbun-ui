// SETUP STORAGE KEY
const AUTH_SESSION_STORAGE_KEY = 'kanbun-auth-session';

// FUNCTION: GET STORED AUTH SESSION
const getStoredAuthSession = () => {

  // CHECK FOR WINDOW
  if (typeof window === 'undefined') {

    // RETURN
    return {
      token: '',
      user: null,
    };
  }

  // GET STORED SESSION
  const rawSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  // STOP, IF NO SESSION EXISTS
  if (!rawSession) {

    // RETURN
    return {
      token: '',
      user: null,
    };
  }

  // TRY-CATCH BLOCK
  try {

    // GET SESSION
    const session = JSON.parse(rawSession);

    // RETURN
    return {
      token: session?.token || '',
      user: session?.user || null,
    };

  // HANDLE ERRORS
  } catch {

    // REMOVE SESSION STORAGE KEY
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

    // RETURN
    return {
      token: '',
      user: null,
    };
  }
};

// FUNCTION: GET STORED AUTH TOKEN
const getStoredAuthToken = () => getStoredAuthSession().token;

// FUNCTION: SET STORED AUTH SESSION
const setStoredAuthSession = ({ token, user }) => {

  // STOP, IF WINDOW IS NOT AVAILABLE
  if (typeof window === 'undefined') {
    return;
  }

  // SAVE SESSION
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({
    token,
    user,
  }));
};

// FUNCTION: CLEAR STORED AUTH SESSION
const clearStoredAuthSession = () => {

  // STOP, IF WINDOW IS NOT AVAILABLE
  if (typeof window === 'undefined') {
    return;
  }

  // REMOVE SESSION
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
};

// EXPORTS
export {
  getStoredAuthSession,
  getStoredAuthToken,
  setStoredAuthSession,
  clearStoredAuthSession,
};

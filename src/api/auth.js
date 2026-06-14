// IMPORTS
import http from '@/lib/http.js';

// FUNCTION: SIGN UP
const signUp = (data) => {

  // SEND REQUEST
  return http.post('/auth/sign-up', data);
};

// FUNCTION: SIGN IN
const signIn = (email, password) => {

  // SEND REQUEST
  return http.post('/auth/sign-in', {
    email,
    password,
  });
};

// FUNCTION: VERIFY TWO-FACTOR CODE
const verifyTwoFactor = (verificationToken, code) => {

  // SEND REQUEST
  return http.post('/auth/verify-2fa', {
    verification_token: verificationToken,
    code,
  });
};

// EXPORTS
export {
  signUp,
  signIn,
  verifyTwoFactor,
};

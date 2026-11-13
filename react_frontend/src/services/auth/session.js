// WHY: One module owns the auth token and the "is this a platform session" flag.
// Before this, seven files read/wrote sessionStorage directly, so changing where the token lives
// (or clearing it on logout) meant touching all of them. Everything now goes through these helpers.
// Every storage access is wrapped: sessionStorage can throw (blocked storage, private windows).

const TOKEN_KEY = 'authToken';
const PLATFORM_KEY = 'isPlatform';

const read = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the session simply will not survive a refresh */
  }
};

const remove = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const getToken = () => read(TOKEN_KEY);

export const isPlatformSession = () => read(PLATFORM_KEY) === 'true';

export const setSession = (token, isPlatform = false) => {
  write(TOKEN_KEY, token);
  write(PLATFORM_KEY, isPlatform ? 'true' : 'false');
};

export const clearSession = () => {
  remove(TOKEN_KEY);
  remove(PLATFORM_KEY);
};

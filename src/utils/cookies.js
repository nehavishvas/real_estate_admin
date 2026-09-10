export const setCookie = (name, value, days = 7) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(typeof value === 'object' ? JSON.stringify(value) : value)}; expires=${expires}; path=/; SameSite=Lax`;
};

export const setCookieMinutes = (name, value, minutes = 30) => {
  const expires = new Date(Date.now() + minutes * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(typeof value === 'object' ? JSON.stringify(value) : value)}; expires=${expires}; path=/; SameSite=Lax`;
};

export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const rawVal = decodeURIComponent(parts.pop().split(';').shift());
    try {
      return JSON.parse(rawVal);
    } catch (e) {
      return rawVal;
    }
  }
  return null;
};

export const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
};

export const clearAllAuthCookies = () => {
  const knownCookies = ['klever_auth_data', 'token', 'klever_refresh_token', 'refreshToken', 'accessToken', 'user'];
  knownCookies.forEach(name => deleteCookie(name));

  try {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      if (/token|auth|klever|user|jwt/i.test(name)) {
        deleteCookie(name);
      }
    }
  } catch (e) {
    console.warn('Error clearing cookies:', e);
  }
};

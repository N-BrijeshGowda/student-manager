// Backend address comes from frontend/.env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TOKEN_KEY = 'studentManagerToken';

// The login token is kept in memory, and copied to localStorage so a page refresh
// keeps you logged in. Storage can be blocked (for example in some private windows),
// so storage failures are ignored and the in-memory copy still works.
function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let currentToken = readStoredToken();

export function getToken() {
  return currentToken;
}

export function saveToken(token) {
  currentToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Login still works until the page is refreshed
  }
}

export function clearToken() {
  currentToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear
  }
}

// Sends a request to the backend and returns the JSON answer.
// Adds the login token when there is one.
// Throws an Error with a readable message (and the HTTP status) if anything goes wrong.
export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (networkError) {
    console.error('Network error:', networkError.message);
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  // Read the body as text first, then try to turn it into JSON
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Response was not valid JSON:', parseError.message);
    }
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || `Request failed (status ${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

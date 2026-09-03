async function getAnonymousIdToken() {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_API_KEY is not configured');

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase auth failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.idToken;
}

function databaseUrl(path, token) {
  const base = (process.env.FIREBASE_DATABASE_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('FIREBASE_DATABASE_URL is not configured');
  return `${base}/${path}.json?auth=${encodeURIComponent(token)}`;
}

function checkDeviceKey(request) {
  const expected = process.env.RADAR_DEVICE_KEY;
const supplied = request.headers['x-device-key'];
  return Boolean(expected && supplied && supplied === expected);
}

async function firebaseSet(path, value) {
  const token = await getAnonymousIdToken();
  const response = await fetch(databaseUrl(path, token), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase write failed: ${response.status} ${text}`);
  }
  return response.json();
}

async function firebaseGet(path) {
  const token = await getAnonymousIdToken();
  const response = await fetch(databaseUrl(path, token));
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase read failed: ${response.status} ${text}`);
  }
  return response.json();
}

module.exports = { checkDeviceKey, firebaseSet, firebaseGet };

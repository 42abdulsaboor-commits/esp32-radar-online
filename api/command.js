const { checkDeviceKey, firebaseGet } = require('./_firebase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!checkDeviceKey(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const command = await firebaseGet('radar/command');
    res.status(200).json(command || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Cloud read failed' });
  }
};

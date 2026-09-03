const { checkDeviceKey, firebaseSet } = require('./_firebase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!checkDeviceKey(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const angle = Number(body.angle);
    const distance = Number(body.distance);
    const object = Boolean(body.object);
    const mode = body.mode === 'CUSTOM' ? 'CUSTOM' : 'AUTO';

    if (!Number.isFinite(angle) || angle < 0 || angle > 180) {
      res.status(400).json({ error: 'Invalid angle' });
      return;
    }

    if (!Number.isFinite(distance)) {
      res.status(400).json({ error: 'Invalid distance' });
      return;
    }

    const latest = {
      angle: Math.round(angle),
      distance: Math.round(distance),
      object,
      mode,
      updatedAt: Date.now()
    };

    await firebaseSet('radar/latest', latest);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Cloud write failed' });
  }
};

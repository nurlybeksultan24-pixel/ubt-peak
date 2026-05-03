const router = require('express').Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Токенді тексеретін middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Токен жоқ' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Жарамсыз токен' });
  }
}

// БАРЛЫҚ ДЕРЕКТЕРДІ АЛУ
router.get('/', auth, async (req, res) => {
  const result = await db.query(
    'SELECT key, value FROM user_data WHERE user_id = $1',
    [req.user.userId]
  );
  // key-value объектіне айналдыру
  const data = {};
  result.rows.forEach(row => {
    try { data[row.key] = JSON.parse(row.value); }
    catch { data[row.key] = row.value; }
  });
  res.json(data);
});

// ДЕРЕКТІ САҚТАУ (бір key)
router.post('/set', auth, async (req, res) => {
  const { key, value } = req.body;
  await db.query(
    `INSERT INTO user_data (user_id, key, value, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, key) DO UPDATE
     SET value = $3, updated_at = NOW()`,
    [req.user.userId, key, JSON.stringify(value)]
  );
  res.json({ ok: true });
});

// БІРНЕШЕ ДЕРЕКТІ БІРДЕН САҚТАУ
router.post('/bulk-set', auth, async (req, res) => {
  const { items } = req.body; // [{ key, value }, ...]
  for (const { key, value } of items) {
    await db.query(
      `INSERT INTO user_data (user_id, key, value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, key) DO UPDATE
       SET value = $3, updated_at = NOW()`,
      [req.user.userId, key, JSON.stringify(value)]
    );
  }
  res.json({ ok: true });
});

module.exports = router;
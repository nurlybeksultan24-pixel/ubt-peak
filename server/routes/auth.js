const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// ТІРКЕЛУ
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Бұрын бар ма тексеру
    const exists = await db.query(
      'SELECT id FROM users WHERE username = $1', [username]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Бұл атаумен пайдаланушы бар' });
    }

    // Парольді шифрлау
    const hash = await bcrypt.hash(password, 10);

    // Сақтау
    const result = await db.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
    );

    // Токен жасау
    const token = jwt.sign(
      { userId: result.rows[0].id, username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// КІР У
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1', [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Пайдаланушы табылмады' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Қате пароль' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

module.exports = router;
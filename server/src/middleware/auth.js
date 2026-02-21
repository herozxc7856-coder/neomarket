/**
 * Middleware для авторизации и проверки прав доступа
 */

const jwt = require('jsonwebtoken');
const { get } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'neomarket-secret-key-change-in-production';

// Проверка JWT токена
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT * FROM users WHERE id = ?', [decoded.userId]);

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Генерация JWT токена
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Проверка роли администратора
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const allowedRoles = ['founder', 'admin', 'moderator'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }

  next();
};

// Проверка роли основателя
const founderMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  if (req.user.role !== 'founder') {
    return res.status(403).json({ error: 'Только для основателя' });
  }

  next();
};

// Обновление статуса онлайн
const updateOnlineStatus = async (userId) => {
  try {
    const { run } = require('../database');
    await run(
      'UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Update online status error:', error);
  }
};

// Установка статуса оффлайн
const setOfflineStatus = async (userId) => {
  try {
    const { run } = require('../database');
    await run(
      'UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Set offline status error:', error);
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  founderMiddleware,
  generateToken,
  updateOnlineStatus,
  setOfflineStatus,
  JWT_SECRET
};

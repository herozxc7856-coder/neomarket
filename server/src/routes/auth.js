/**
 * Роуты для авторизации и аутентификации
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { run, get, all } = require('../database');
const { generateToken, authMiddleware } = require('../middleware/auth');

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    // Валидация
    if (!email || !password || !nickname) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    if (nickname.length < 3 || nickname.length > 20) {
      return res.status(400).json({ error: 'Никнейм должен быть от 3 до 20 символов' });
    }

    // Проверка email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Неверный формат email' });
    }

    // Проверка существующего пользователя
    const existingUser = await get('SELECT id FROM users WHERE email = ? OR nickname = ?', [email, nickname]);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email или никнеймом уже существует' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const result = await run(
      'INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)',
      [email, hashedPassword, nickname]
    );

    // Генерация токена
    const token = generateToken(result.id);

    res.status(201).json({
      message: 'Регистрация успешна',
      token,
      user: {
        id: result.id,
        email,
        nickname,
        role: 'user',
        balance: 0,
        avatar: '/uploads/avatars/default.png'
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Авторизация
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Введите email и пароль' });
    }

    // Поиск пользователя
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Обновление статуса онлайн
    await run('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Генерация токена
    const token = generateToken(user.id);

    res.json({
      message: 'Вход успешен',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        balance: user.balance,
        avatar: user.avatar,
        is_online: 1
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение текущего пользователя
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await get(`
      SELECT id, email, nickname, avatar, role, balance, rating, deals_count, 
             is_online, created_at, last_seen 
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выход
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await run('UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id]);
    res.json({ message: 'Выход успешен' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Смена пароля
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Введите текущий и новый пароль' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
    }

    // Проверка текущего пароля
    const user = await get('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    // Обновление пароля
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

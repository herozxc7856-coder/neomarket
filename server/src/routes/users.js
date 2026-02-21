/**
 * Роуты для работы с пользователями
 */

const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const { authMiddleware, adminMiddleware, founderMiddleware } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

// Получение профиля пользователя по ID или никнейму
router.get('/profile/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Поиск по ID или никнейму
    const user = await get(`
      SELECT id, nickname, avatar, role, rating, deals_count, 
             is_online, created_at, last_seen 
      FROM users 
      WHERE id = ? OR nickname = ?
    `, [identifier, identifier]);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Получаем количество отзывов (скрыты до появления)
    const reviewsCount = await get('SELECT COUNT(*) as count FROM reviews WHERE seller_id = ?', [user.id]);

    // Получаем активные товары пользователя
    const products = await all(`
      SELECT p.*, g.name as game_name, c.name as category_name
      FROM products p
      LEFT JOIN games g ON p.game_id = g.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = ? AND p.is_active = 1 AND p.is_hidden = 0
      ORDER BY p.created_at DESC
    `, [user.id]);

    res.json({
      user: {
        ...user,
        reviews_count: reviewsCount.count,
        show_reviews: reviewsCount.count > 0, // Показывать отзывы только если они есть
        show_rating: reviewsCount.count > 0 && user.deals_count > 0
      },
      products
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление профиля
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nickname } = req.body;
    
    if (nickname) {
      if (nickname.length < 3 || nickname.length > 20) {
        return res.status(400).json({ error: 'Никнейм должен быть от 3 до 20 символов' });
      }

      // Проверка уникальности никнейма
      const existing = await get('SELECT id FROM users WHERE nickname = ? AND id != ?', [nickname, req.user.id]);
      if (existing) {
        return res.status(400).json({ error: 'Никнейм уже занят' });
      }

      await run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.user.id]);
    }

    res.json({ message: 'Профиль обновлен' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Загрузка аватарки
router.post('/avatar', authMiddleware, setUploadType('avatar'), upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    await run('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, req.user.id]);

    res.json({ 
      message: 'Аватарка обновлена',
      avatar: avatarPath
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение баланса и истории транзакций
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
    
    const transactions = await all(`
      SELECT * FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);

    res.json({
      balance: user.balance,
      transactions
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Пополнение баланса (фейковая система для теста)
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0 || amount > 100000) {
      return res.status(400).json({ error: 'Сумма должна быть от 1 до 100000' });
    }

    // Добавляем сумму на баланс
    await run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, req.user.id]);

    // Записываем транзакцию
    await run(`
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, 'deposit', amount, 'Пополнение баланса']);

    // Получаем обновленный баланс
    const user = await get('SELECT balance FROM users WHERE id = ?', [req.user.id]);

    res.json({
      message: 'Баланс успешно пополнен',
      balance: user.balance,
      amount
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вывод средств (заблокирован)
router.post('/withdraw', authMiddleware, async (req, res) => {
  res.status(403).json({ error: 'Вывод временно недоступен' });
});

// ===== АДМИН РОУТЫ =====

// Получение списка всех пользователей (для админа)
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { search, role, is_blocked } = req.query;
    
    let sql = `
      SELECT id, email, nickname, avatar, role, balance, rating, deals_count,
             is_online, is_blocked, created_at, last_seen
      FROM users WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (nickname LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      sql += ` AND role = ?`;
      params.push(role);
    }

    if (is_blocked !== undefined) {
      sql += ` AND is_blocked = ?`;
      params.push(is_blocked);
    }

    sql += ` ORDER BY created_at DESC`;

    const users = await all(sql, params);
    res.json({ users });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Блокировка/разблокировка пользователя
router.post('/admin/users/:id/block', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_blocked, reason } = req.body;

    const user = await get('SELECT role FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Нельзя заблокировать основателя
    if (user.role === 'founder') {
      return res.status(403).json({ error: 'Нельзя заблокировать основателя' });
    }

    // Модератор не может блокировать админа
    if (req.user.role === 'moderator' && (user.role === 'admin' || user.role === 'founder')) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    await run('UPDATE users SET is_blocked = ? WHERE id = ?', [is_blocked ? 1 : 0, id]);

    res.json({ 
      message: is_blocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Смена роли пользователя (только основатель)
router.post('/admin/users/:id/role', authMiddleware, founderMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['admin', 'moderator', 'verified', 'user'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Неверная роль' });
    }

    const user = await get('SELECT role FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.role === 'founder') {
      return res.status(403).json({ error: 'Нельзя изменить роль основателя' });
    }

    await run('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    res.json({ message: 'Роль пользователя изменена' });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение статистики (для админа)
router.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const usersCount = await get('SELECT COUNT(*) as count FROM users');
    const ordersCount = await get('SELECT COUNT(*) as count FROM orders');
    const productsCount = await get('SELECT COUNT(*) as count FROM products');
    const totalTurnover = await get(`
      SELECT SUM(amount) as total FROM transactions WHERE type IN ('payment', 'earning')
    `);
    const onlineUsers = await get('SELECT COUNT(*) as count FROM users WHERE is_online = 1');
    const pendingOrders = await get('SELECT COUNT(*) as count FROM orders WHERE status IN ("pending", "paid")');
    const supportTickets = await get('SELECT COUNT(*) as count FROM support_tickets WHERE status = "open"');

    res.json({
      users: usersCount.count,
      orders: ordersCount.count,
      products: productsCount.count,
      turnover: totalTurnover.total || 0,
      online_users: onlineUsers.count,
      pending_orders: pendingOrders.count,
      support_tickets: supportTickets.count
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

/**
 * Роуты для работы с чатом
 */

const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

// Получение списка чатов пользователя
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await all(`
      SELECT 
        o.id as order_id,
        o.order_number,
        o.status,
        o.updated_at,
        p.title as product_title,
        CASE 
          WHEN o.buyer_id = ? THEN seller.nickname
          ELSE buyer.nickname
        END as other_user_nickname,
        CASE 
          WHEN o.buyer_id = ? THEN seller.avatar
          ELSE buyer.avatar
        END as other_user_avatar,
        CASE 
          WHEN o.buyer_id = ? THEN seller.is_online
          ELSE buyer.is_online
        END as other_user_online,
        (SELECT COUNT(*) FROM messages WHERE order_id = o.id AND sender_id != ? AND is_read = 0) as unread_count,
        (SELECT message FROM messages WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE o.buyer_id = ? OR o.seller_id = ?
      ORDER BY o.updated_at DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение сообщений чата по order_id
router.get('/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Проверяем, что пользователь участник сделки
    const order = await get(`
      SELECT * FROM orders WHERE id = ?
    `, [orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    // Только участники сделки или админ могут видеть чат
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && 
        !['founder', 'admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // Получаем сообщения
    const messages = await all(`
      SELECT m.*, u.nickname, u.avatar, u.role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.order_id = ?
      ORDER BY m.created_at ASC
    `, [orderId]);

    // Отмечаем сообщения как прочитанные
    await run(`
      UPDATE messages SET is_read = 1 
      WHERE order_id = ? AND sender_id != ? AND is_read = 0
    `, [orderId, req.user.id]);

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отправка сообщения
router.post('/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Сообщение слишком длинное (максимум 2000 символов)' });
    }

    // Проверяем, что пользователь участник сделки
    const order = await get('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && 
        !['founder', 'admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // Сохраняем сообщение
    const result = await run(`
      INSERT INTO messages (order_id, sender_id, message)
      VALUES (?, ?, ?)
    `, [orderId, req.user.id, message.trim()]);

    // Обновляем время заказа
    await run('UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [orderId]);

    // Получаем созданное сообщение
    const newMessage = await get(`
      SELECT m.*, u.nickname, u.avatar, u.role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [result.id]);

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Загрузка файла в чат
router.post('/:orderId/attachment', authMiddleware, setUploadType('chat'), upload.single('file'), async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    // Проверяем доступ к заказу
    const order = await get('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && 
        !['founder', 'admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const filePath = `/uploads/chat/${req.file.filename}`;

    // Сохраняем сообщение с вложением
    const result = await run(`
      INSERT INTO messages (order_id, sender_id, message, attachments)
      VALUES (?, ?, ?, ?)
    `, [orderId, req.user.id, 'Вложение', JSON.stringify([filePath])]);

    // Обновляем время заказа
    await run('UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [orderId]);

    const newMessage = await get(`
      SELECT m.*, u.nickname, u.avatar, u.role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [result.id]);

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение количества непрочитанных сообщений
router.get('/unread/count', authMiddleware, async (req, res) => {
  try {
    const result = await get(`
      SELECT COUNT(*) as count 
      FROM messages m
      JOIN orders o ON m.order_id = o.id
      WHERE (o.buyer_id = ? OR o.seller_id = ?) 
        AND m.sender_id != ? 
        AND m.is_read = 0
    `, [req.user.id, req.user.id, req.user.id]);

    res.json({ count: result.count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== АДМИН РОУТЫ =====

// Получение всех чатов (для админа)
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    
    let sql = `
      SELECT 
        o.id as order_id,
        o.order_number,
        o.status,
        buyer.nickname as buyer_nickname,
        seller.nickname as seller_nickname,
        p.title as product_title,
        (SELECT COUNT(*) FROM messages WHERE order_id = o.id) as message_count,
        (SELECT created_at FROM messages WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as last_activity
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (o.order_number LIKE ? OR buyer.nickname LIKE ? OR seller.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY last_activity DESC';

    const chats = await all(sql, params);
    res.json({ chats });
  } catch (error) {
    console.error('Admin get chats error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение сообщений любого чата (для админа)
router.get('/admin/:orderId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    const messages = await all(`
      SELECT m.*, u.nickname, u.avatar, u.role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.order_id = ?
      ORDER BY m.created_at ASC
    `, [orderId]);

    res.json({ messages });
  } catch (error) {
    console.error('Admin get chat messages error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

/**
 * Роуты для работы с заказами
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { run, get, all } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Генерация номера заказа
const generateOrderNumber = () => {
  return 'NM-' + Date.now().toString(36).toUpperCase();
};

// Создание заказа (покупка)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { product_id } = req.body;

    // Получаем информацию о товаре
    const product = await get(`
      SELECT p.*, u.id as seller_id, u.is_blocked 
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.id = ? AND p.is_active = 1 AND p.is_hidden = 0
    `, [product_id]);

    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    if (product.is_blocked) {
      return res.status(400).json({ error: 'Продавец заблокирован' });
    }

    if (product.seller_id === req.user.id) {
      return res.status(400).json({ error: 'Нельзя купить свой товар' });
    }

    // Проверяем баланс покупателя
    const buyer = await get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
    if (buyer.balance < product.price) {
      return res.status(400).json({ error: 'Недостаточно средств на балансе' });
    }

    // Создаем заказ
    const orderNumber = generateOrderNumber();
    const autoConfirmAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24 часа

    const orderResult = await run(`
      INSERT INTO orders (order_number, buyer_id, seller_id, product_id, amount, status, auto_confirm_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [orderNumber, req.user.id, product.seller_id, product_id, product.price, 'paid', autoConfirmAt.toISOString()]);

    // Списываем деньги с баланса покупателя (заморозка)
    await run('UPDATE users SET balance = balance - ? WHERE id = ?', [product.price, req.user.id]);

    // Записываем транзакцию (заморозка)
    await run(`
      INSERT INTO transactions (user_id, type, amount, description, order_id)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, 'freeze', -product.price, `Заморозка средств по заказу ${orderNumber}`, orderResult.id]);

    // Создаем системное сообщение в чате
    await run(`
      INSERT INTO messages (order_id, sender_id, message)
      VALUES (?, ?, ?)
    `, [orderResult.id, req.user.id, 'Заказ создан. Ожидается передача товара от продавца.']);

    res.status(201).json({
      message: 'Заказ создан',
      order: {
        id: orderResult.id,
        order_number: orderNumber,
        status: 'paid',
        amount: product.price,
        auto_confirm_at: autoConfirmAt
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение списка заказов пользователя
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query; // 'buyer' или 'seller'

    let sql = `
      SELECT o.*, 
             p.title as product_title,
             buyer.nickname as buyer_nickname,
             buyer.avatar as buyer_avatar,
             seller.nickname as seller_nickname,
             seller.avatar as seller_avatar
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE 1=1
    `;
    const params = [];

    if (type === 'buyer') {
      sql += ' AND o.buyer_id = ?';
      params.push(req.user.id);
    } else if (type === 'seller') {
      sql += ' AND o.seller_id = ?';
      params.push(req.user.id);
    } else {
      sql += ' AND (o.buyer_id = ? OR o.seller_id = ?)';
      params.push(req.user.id, req.user.id);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = await all(sql, params);
    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение одного заказа
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await get(`
      SELECT o.*, 
             p.title as product_title,
             p.description as product_description,
             buyer.id as buyer_id,
             buyer.nickname as buyer_nickname,
             buyer.avatar as buyer_avatar,
             seller.id as seller_id,
             seller.nickname as seller_nickname,
             seller.avatar as seller_avatar
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE o.id = ?
    `, [id]);

    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    // Проверяем доступ (только участники сделки или админ)
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && 
        !['founder', 'admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // Получаем сообщения чата
    const messages = await all(`
      SELECT m.*, u.nickname, u.avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.order_id = ?
      ORDER BY m.created_at ASC
    `, [id]);

    res.json({ order, messages });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Подтверждение получения товара (покупатель)
router.post('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    if (order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Только покупатель может подтвердить получение' });
    }

    if (order.status !== 'delivered' && order.status !== 'paid') {
      return res.status(400).json({ error: 'Неверный статус заказа' });
    }

    // Обновляем статус заказа
    await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      ['completed', id]);

    // Переводим деньги продавцу
    await run('UPDATE users SET balance = balance + ? WHERE id = ?', [order.amount, order.seller_id]);

    // Записываем транзакцию для продавца
    await run(`
      INSERT INTO transactions (user_id, type, amount, description, order_id)
      VALUES (?, ?, ?, ?, ?)
    `, [order.seller_id, 'earning', order.amount, `Продажа по заказу ${order.order_number}`, id]);

    // Записываем транзакцию разморозки для покупателя
    await run(`
      INSERT INTO transactions (user_id, type, amount, description, order_id)
      VALUES (?, ?, ?, ?, ?)
    `, [order.buyer_id, 'unfreeze', 0, `Сделка завершена по заказу ${order.order_number}`, id]);

    // Обновляем счетчик сделок продавца
    await run('UPDATE users SET deals_count = deals_count + 1 WHERE id = ?', [order.seller_id]);

    // Системное сообщение
    await run(`
      INSERT INTO messages (order_id, sender_id, message)
      VALUES (?, ?, ?)
    `, [id, req.user.id, 'Сделка завершена. Спасибо за покупку!']);

    res.json({ message: 'Сделка успешно завершена' });
  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Открытие спора
router.post('/:id/dispute', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    if (order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Только покупатель может открыть спор' });
    }

    if (order.status !== 'delivered' && order.status !== 'paid') {
      return status(400).json({ error: 'Неверный статус заказа' });
    }

    await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      ['disputed', id]);

    // Системное сообщение
    await run(`
      INSERT INTO messages (order_id, sender_id, message)
      VALUES (?, ?, ?)
    `, [id, req.user.id, `Открыт спор. Причина: ${reason || 'Не указана'}`]);

    res.json({ message: 'Спор открыт. Администрация рассмотрит вашу заявку.' });
  } catch (error) {
    console.error('Dispute order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отмена заказа (покупатель, только если продавец еще не передал товар)
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    if (order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Только покупатель может отменить заказ' });
    }

    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'Заказ можно отменить только до получения товара' });
    }

    // Возвращаем деньги покупателю
    await run('UPDATE users SET balance = balance + ? WHERE id = ?', [order.amount, order.buyer_id]);

    // Записываем транзакцию возврата
    await run(`
      INSERT INTO transactions (user_id, type, amount, description, order_id)
      VALUES (?, ?, ?, ?, ?)
    `, [order.buyer_id, 'refund', order.amount, `Возврат по отмененному заказу ${order.order_number}`, id]);

    // Обновляем статус заказа
    await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      ['cancelled', id]);

    // Системное сообщение
    await run(`
      INSERT INTO messages (order_id, sender_id, message)
      VALUES (?, ?, ?)
    `, [id, req.user.id, 'Заказ отменен. Средства возвращены на баланс.']);

    res.json({ message: 'Заказ отменен. Средства возвращены на баланс.' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Передача товара (продавец)
router.post('/:id/deliver', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    if (order.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Только продавец может передать товар' });
    }

    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'Неверный статус заказа' });
    }

    await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      ['delivered', id]);

    // Системное сообщение
    await run(`
      INSERT INTO messages (order_id, sender_id, message)
      VALUES (?, ?, ?)
    `, [id, req.user.id, 'Товар передан. Пожалуйста, проверьте и подтвердите получение.']);

    res.json({ message: 'Товар отмечен как переданный' });
  } catch (error) {
    console.error('Deliver order error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== АДМИН РОУТЫ =====

// Получение всех заказов (для админа)
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let sql = `
      SELECT o.*, 
             p.title as product_title,
             buyer.nickname as buyer_nickname,
             seller.nickname as seller_nickname
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (o.order_number LIKE ? OR buyer.nickname LIKE ? OR seller.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = await all(sql, params);
    res.json({ orders });
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Решение спора (для админа)
router.post('/admin/:id/resolve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body; // 'buyer' или 'seller'

    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    if (order.status !== 'disputed') {
      return res.status(400).json({ error: 'Заказ не в статусе спора' });
    }

    if (decision === 'buyer') {
      // Возвращаем деньги покупателю
      await run('UPDATE users SET balance = balance + ? WHERE id = ?', [order.amount, order.buyer_id]);
      await run(`
        INSERT INTO transactions (user_id, type, amount, description, order_id)
        VALUES (?, ?, ?, ?, ?)
      `, [order.buyer_id, 'refund', order.amount, `Возврат по спору ${order.order_number}`, id]);
    } else if (decision === 'seller') {
      // Переводим деньги продавцу
      await run('UPDATE users SET balance = balance + ? WHERE id = ?', [order.amount, order.seller_id]);
      await run(`
        INSERT INTO transactions (user_id, type, amount, description, order_id)
        VALUES (?, ?, ?, ?, ?)
      `, [order.seller_id, 'earning', order.amount, `Продажа по спору ${order.order_number}`, id]);
      await run('UPDATE users SET deals_count = deals_count + 1 WHERE id = ?', [order.seller_id]);
    }

    await run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      ['completed', id]);

    // Системное сообщение
    await run(`
      INSERT INTO messages (order_id, sender_id, message)
      VALUES (?, ?, ?)
    `, [id, req.user.id, `Спор решен в пользу ${decision === 'buyer' ? 'покупателя' : 'продавца'}. ${comment || ''}`]);

    res.json({ message: 'Спор решен' });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

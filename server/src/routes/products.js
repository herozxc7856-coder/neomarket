/**
 * Роуты для работы с товарами
 */

const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Получение списка категорий
router.get('/categories', async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY sort_order');
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение списка игр
router.get('/games', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM games WHERE is_active = 1';
    const params = [];

    if (category) {
      sql += ' AND category_id = ?';
      params.push(category);
    }

    sql += ' ORDER BY popularity DESC';
    const games = await all(sql, params);
    res.json({ games });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение списка товаров с фильтрами
router.get('/', async (req, res) => {
  try {
    const { 
      game_id, 
      category_id, 
      search, 
      min_price, 
      max_price, 
      sort = 'newest',
      page = 1,
      limit = 20
    } = req.query;

    let sql = `
      SELECT p.*, 
             u.nickname as seller_nickname, 
             u.avatar as seller_avatar,
             u.role as seller_role,
             u.rating as seller_rating,
             g.name as game_name,
             c.name as category_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.is_hidden = 0 AND u.is_blocked = 0
    `;
    const params = [];

    if (game_id) {
      sql += ' AND p.game_id = ?';
      params.push(game_id);
    }

    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      sql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (min_price) {
      sql += ' AND p.price >= ?';
      params.push(min_price);
    }

    if (max_price) {
      sql += ' AND p.price <= ?';
      params.push(max_price);
    }

    // Сортировка
    switch (sort) {
      case 'price_asc':
        sql += ' ORDER BY p.price ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY p.price DESC';
        break;
      case 'popular':
        sql += ' ORDER BY p.views_count DESC';
        break;
      default:
        sql += ' ORDER BY p.created_at DESC';
    }

    // Пагинация
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = await all(sql, params);

    // Получаем общее количество для пагинации
    let countSql = `
      SELECT COUNT(*) as total 
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.is_active = 1 AND p.is_hidden = 0 AND u.is_blocked = 0
    `;
    const countParams = [];

    if (game_id) {
      countSql += ' AND p.game_id = ?';
      countParams.push(game_id);
    }
    if (category_id) {
      countSql += ' AND p.category_id = ?';
      countParams.push(category_id);
    }
    if (search) {
      countSql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await get(countSql, countParams);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение одного товара
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await get(`
      SELECT p.*, 
             u.nickname as seller_nickname, 
             u.avatar as seller_avatar,
             u.role as seller_role,
             u.rating as seller_rating,
             u.deals_count as seller_deals,
             g.name as game_name,
             c.name as category_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = 1 AND u.is_blocked = 0
    `, [id]);

    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Увеличиваем счетчик просмотров
    await run('UPDATE products SET views_count = views_count + 1 WHERE id = ?', [id]);

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание товара
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { game_id, category_id, title, description, price, server_name } = req.body;

    // Валидация
    if (!title || !price) {
      return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    if (price <= 0) {
      return res.status(400).json({ error: 'Цена должна быть больше 0' });
    }

    if (title.length < 5 || title.length > 200) {
      return res.status(400).json({ error: 'Название должно быть от 5 до 200 символов' });
    }

    const result = await run(`
      INSERT INTO products (seller_id, game_id, category_id, title, description, price, server_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, game_id || null, category_id || null, title, description || '', price, server_name || '']);

    res.status(201).json({
      message: 'Товар создан',
      product_id: result.id
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление товара
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, server_name, is_hidden } = req.body;

    // Проверяем владельца товара
    const product = await get('SELECT seller_id FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Только владелец или админ может редактировать
    if (product.seller_id !== req.user.id && !['founder', 'admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (server_name !== undefined) {
      updates.push('server_name = ?');
      params.push(server_name);
    }
    if (is_hidden !== undefined) {
      updates.push('is_hidden = ?');
      params.push(is_hidden ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    params.push(id);
    await run(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Товар обновлен' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление товара
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем владельца товара
    const product = await get('SELECT seller_id FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Только владелец или админ может удалить
    if (product.seller_id !== req.user.id && !['founder', 'admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    await run('UPDATE products SET is_active = 0 WHERE id = ?', [id]);

    res.json({ message: 'Товар удален' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== АДМИН РОУТЫ =====

// Получение всех товаров (для админа)
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { search, is_hidden, is_active } = req.query;
    
    let sql = `
      SELECT p.*, 
             u.nickname as seller_nickname,
             g.name as game_name,
             c.name as category_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN games g ON p.game_id = g.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (p.title LIKE ? OR u.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (is_hidden !== undefined) {
      sql += ' AND p.is_hidden = ?';
      params.push(is_hidden);
    }

    if (is_active !== undefined) {
      sql += ' AND p.is_active = ?';
      params.push(is_active);
    }

    sql += ' ORDER BY p.created_at DESC';

    const products = await all(sql, params);
    res.json({ products });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Скрыть/показать товар (для админа)
router.post('/admin/:id/hide', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_hidden } = req.body;

    await run('UPDATE products SET is_hidden = ? WHERE id = ?', [is_hidden ? 1 : 0, id]);

    res.json({ message: is_hidden ? 'Товар скрыт' : 'Товар показан' });
  } catch (error) {
    console.error('Hide product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

/**
 * Роуты для работы с правилами сайта
 */

const express = require('express');
const router = express.Router();
const { run, get } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Получение правил сайта
router.get('/', async (req, res) => {
  try {
    const rules = await get('SELECT * FROM rules ORDER BY id DESC LIMIT 1');
    
    if (!rules) {
      return res.json({ 
        title: 'Правила сайта',
        content: '<p>Правила пока не добавлены.</p>'
      });
    }

    res.json({ rules });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление правил (только для админа)
router.put('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Заголовок и содержание обязательны' });
    }

    const existing = await get('SELECT id FROM rules ORDER BY id DESC LIMIT 1');

    if (existing) {
      await run(`
        UPDATE rules SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [title, content, existing.id]);
    } else {
      await run(`
        INSERT INTO rules (title, content) VALUES (?, ?)
      `, [title, content]);
    }

    res.json({ message: 'Правила обновлены' });
  } catch (error) {
    console.error('Update rules error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

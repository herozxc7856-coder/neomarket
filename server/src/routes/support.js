/**
 * Роуты для работы с поддержкой
 */

const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');

// Создание обращения в поддержку
router.post('/tickets', authMiddleware, setUploadType('chat'), upload.array('attachments', 5), async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Тема и сообщение обязательны' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ error: 'Тема слишком длинная' });
    }

    // Собираем пути к вложениям
    const attachments = req.files ? req.files.map(f => `/uploads/chat/${f.filename}`) : [];

    const result = await run(`
      INSERT INTO support_tickets (user_id, subject, message, attachments)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, subject, message, JSON.stringify(attachments)]);

    res.status(201).json({
      message: 'Обращение создано',
      ticket_id: result.id
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение списка обращений пользователя
router.get('/tickets', authMiddleware, async (req, res) => {
  try {
    const tickets = await all(`
      SELECT id, subject, status, admin_response, created_at, updated_at
      FROM support_tickets
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение одного обращения
router.get('/tickets/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await get(`
      SELECT * FROM support_tickets WHERE id = ?
    `, [id]);

    if (!ticket) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    // Проверяем доступ
    if (ticket.user_id !== req.user.id && !['founder', 'admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== АДМИН РОУТЫ =====

// Получение всех обращений (для админа)
router.get('/admin/tickets', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let sql = `
      SELECT t.*, u.nickname as user_nickname, u.email as user_email
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (t.subject LIKE ? OR u.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY CASE t.status WHEN "open" THEN 0 WHEN "in_progress" THEN 1 ELSE 2 END, t.created_at DESC';

    const tickets = await all(sql, params);
    res.json({ tickets });
  } catch (error) {
    console.error('Admin get tickets error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Ответ на обращение (для админа)
router.post('/admin/tickets/:id/respond', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { response, status } = req.body;

    if (!response) {
      return res.status(400).json({ error: 'Ответ обязателен' });
    }

    const ticket = await get('SELECT * FROM support_tickets WHERE id = ?', [id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }

    const newStatus = status || 'closed';

    await run(`
      UPDATE support_tickets 
      SET admin_response = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [response, newStatus, id]);

    // Создаем системное сообщение пользователю (если нужно реализовать систему уведомлений)
    // TODO: Добавить уведомление пользователю

    res.json({ message: 'Ответ отправлен' });
  } catch (error) {
    console.error('Respond ticket error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

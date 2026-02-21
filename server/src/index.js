/**
 * NeoMarket Server
 * Игровая торговая площадка - бэкенд
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { initTables } = require('./database');
const { authMiddleware, updateOnlineStatus, setOfflineStatus } = require('./middleware/auth');

// Импорт роутов
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat');
const supportRoutes = require('./routes/support');
const rulesRoutes = require('./routes/rules');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статические файлы (загрузки)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API роуты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/rules', rulesRoutes);

// WebSocket для чата
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('Новое WebSocket подключение:', socket.id);

  // Авторизация сокета
  socket.on('auth', async (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('./middleware/auth');
      const { get } = require('./database');
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await get('SELECT id, nickname, role FROM users WHERE id = ?', [decoded.userId]);
      
      if (user) {
        socket.userId = user.id;
        socket.user = user;
        connectedUsers.set(user.id, socket);
        
        // Обновляем статус онлайн
        await updateOnlineStatus(user.id);
        
        // Уведомляем других пользователей о статусе
        socket.broadcast.emit('user_online', { userId: user.id });
        
        console.log(`Пользователь ${user.nickname} авторизован в WebSocket`);
      }
    } catch (error) {
      console.error('Socket auth error:', error);
    }
  });

  // Присоединение к комнате заказа (чату)
  socket.on('join_order', (orderId) => {
    if (!socket.userId) return;
    socket.join(`order_${orderId}`);
    console.log(`Пользователь ${socket.userId} присоединился к заказу ${orderId}`);
  });

  // Покидание комнаты заказа
  socket.on('leave_order', (orderId) => {
    socket.leave(`order_${orderId}`);
  });

  // Отправка сообщения
  socket.on('send_message', async (data) => {
    if (!socket.userId) return;
    
    try {
      const { run, get } = require('./database');
      const { orderId, message } = data;

      // Проверяем доступ к заказу
      const order = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (!order) return;

      if (order.buyer_id !== socket.userId && order.seller_id !== socket.userId) return;

      // Сохраняем сообщение
      const result = await run(`
        INSERT INTO messages (order_id, sender_id, message)
        VALUES (?, ?, ?)
      `, [orderId, socket.userId, message]);

      // Обновляем время заказа
      await run('UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [orderId]);

      // Получаем созданное сообщение
      const newMessage = await get(`
        SELECT m.*, u.nickname, u.avatar, u.role
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `, [result.id]);

      // Отправляем сообщение всем в комнате
      io.to(`order_${orderId}`).emit('new_message', newMessage);

      // Отправляем уведомление получателю если он онлайн
      const recipientId = order.buyer_id === socket.userId ? order.seller_id : order.buyer_id;
      const recipientSocket = connectedUsers.get(recipientId);
      if (recipientSocket) {
        recipientSocket.emit('new_notification', {
          type: 'message',
          orderId,
          message: `Новое сообщение от ${socket.user.nickname}`
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  });

  // Отметка сообщений как прочитанных
  socket.on('mark_read', async (orderId) => {
    if (!socket.userId) return;
    
    try {
      const { run } = require('./database');
      await run(`
        UPDATE messages SET is_read = 1 
        WHERE order_id = ? AND sender_id != ? AND is_read = 0
      `, [orderId, socket.userId]);
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // Отключение
  socket.on('disconnect', async () => {
    console.log('WebSocket отключение:', socket.id);
    
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      
      // Устанавливаем статус оффлайн через 30 секунд (на случай переподключения)
      setTimeout(async () => {
        if (!connectedUsers.has(socket.userId)) {
          await setOfflineStatus(socket.userId);
          socket.broadcast.emit('user_offline', { userId: socket.userId });
        }
      }, 30000);
    }
  });
});

// Middleware для доступа к io в роутах
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
const startServer = async () => {
  try {
    // Инициализация базы данных
    await initTables();
    
    server.listen(PORT, () => {
      console.log(`\n🚀 NeoMarket Server запущен на порту ${PORT}`);
      console.log(`📡 API доступно по адресу: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket подключен\n`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
};

startServer();

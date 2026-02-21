/**
 * База данных SQLite для NeoMarket
 * Использует sqlite3 для работы с БД
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Создаем директорию для базы данных если не существует
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'neomarket.db');

// Создаем подключение к БД
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
  } else {
    console.log('✅ Подключено к SQLite базе данных');
  }
});

// Включаем foreign keys
db.run('PRAGMA foreign_keys = ON');

// Функция для выполнения SQL запросов с промисами
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Инициализация таблиц
const initTables = async () => {
  try {
    // Таблица пользователей
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT UNIQUE NOT NULL,
        avatar TEXT DEFAULT '/uploads/avatars/default.svg',
        role TEXT DEFAULT 'user' CHECK(role IN ('founder', 'admin', 'moderator', 'verified', 'user')),
        balance REAL DEFAULT 0,
        rating REAL DEFAULT 0,
        deals_count INTEGER DEFAULT 0,
        is_online INTEGER DEFAULT 0,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_blocked INTEGER DEFAULT 0
      )
    `);

    // Таблица категорий
    await run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        icon TEXT,
        sort_order INTEGER DEFAULT 0
      )
    `);

    // Таблица игр
    await run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        image TEXT,
        category_id INTEGER,
        popularity INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Таблица товаров
    await run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id INTEGER NOT NULL,
        game_id INTEGER,
        category_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'RUB',
        server_name TEXT,
        is_active INTEGER DEFAULT 1,
        is_hidden INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Таблица заказов
    await run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        buyer_id INTEGER NOT NULL,
        seller_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'delivered', 'completed', 'disputed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        auto_confirm_at DATETIME,
        FOREIGN KEY (buyer_id) REFERENCES users(id),
        FOREIGN KEY (seller_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Таблица сообщений (чат)
    await run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        attachments TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
      )
    `);

    // Таблица транзакций (баланс)
    await run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('deposit', 'withdraw', 'payment', 'refund', 'earning', 'freeze', 'unfreeze')),
        amount REAL NOT NULL,
        description TEXT,
        order_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);

    // Таблица отзывов
    await run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        reviewer_id INTEGER NOT NULL,
        seller_id INTEGER NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        is_visible INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (reviewer_id) REFERENCES users(id),
        FOREIGN KEY (seller_id) REFERENCES users(id)
      )
    `);

    // Таблица правил сайта
    await run(`
      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица обращений в поддержку
    await run(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        attachments TEXT,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'closed')),
        admin_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Таблица системных настроек
    await run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Таблицы базы данных созданы');

    // Создаем основателя (админа) по умолчанию
    const bcrypt = require('bcryptjs');
    const founderExists = await get('SELECT id FROM users WHERE role = ?', ['founder']);
    
    if (!founderExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await run(`
        INSERT INTO users (email, password, nickname, role, is_online)
        VALUES (?, ?, ?, ?, ?)
      `, ['admin@neomarket.ru', hashedPassword, 'Founder', 'founder', 1]);
      console.log('✅ Создан аккаунт основателя: admin@neomarket.ru / admin123');
    }

    // Добавляем дефолтные категории
    const categories = [
      { name: 'Игровые аккаунты', slug: 'accounts', icon: 'user' },
      { name: 'Игровая валюта', slug: 'currency', icon: 'coins' },
      { name: 'Предметы и скины', slug: 'items', icon: 'package' },
      { name: 'Услуги', slug: 'services', icon: 'tool' },
      { name: 'Другое', slug: 'other', icon: 'more' }
    ];

    for (const cat of categories) {
      const exists = await get('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
      if (!exists) {
        await run('INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)', 
          [cat.name, cat.slug, cat.icon]);
      }
    }

    // Добавляем дефолтные игры
    const games = [
      { name: 'Counter-Strike 2', slug: 'cs2', popularity: 100 },
      { name: 'Dota 2', slug: 'dota2', popularity: 95 },
      { name: 'Valorant', slug: 'valorant', popularity: 90 },
      { name: 'World of Warcraft', slug: 'wow', popularity: 85 },
      { name: 'Genshin Impact', slug: 'genshin', popularity: 80 },
      { name: 'Fortnite', slug: 'fortnite', popularity: 75 },
      { name: 'League of Legends', slug: 'lol', popularity: 88 },
      { name: 'Minecraft', slug: 'minecraft', popularity: 82 }
    ];

    for (const game of games) {
      const exists = await get('SELECT id FROM games WHERE slug = ?', [game.slug]);
      if (!exists) {
        await run('INSERT INTO games (name, slug, popularity) VALUES (?, ?, ?)', 
          [game.name, game.slug, game.popularity]);
      }
    }

    // Добавляем правила по умолчанию
    const rulesExist = await get('SELECT id FROM rules WHERE id = 1');
    if (!rulesExist) {
      await run(`
        INSERT INTO rules (title, content) VALUES (?, ?)
      `, ['Правила пользования NeoMarket', `
<h2>1. Общие положения</h2>
<p>1.1. Настоящие правила регулируют отношения между пользователями и администрацией NeoMarket.</p>
<p>1.2. Регистрируясь на сайте, вы соглашаетесь с данными правилами.</p>

<h2>2. Регистрация и аккаунт</h2>
<p>2.1. Запрещена регистрация нескольких аккаунтов одним пользователем.</p>
<p>2.2. Запрещена передача аккаунта третьим лицам.</p>
<p>2.3. Пользователь несет ответственность за безопасность своего аккаунта.</p>

<h2>3. Торговля</h2>
<p>3.1. Запрещена продажа взломанных аккаунтов и краденых вещей.</p>
<p>3.2. Продавец обязан предоставить товар в соответствии с описанием.</p>
<p>3.3. Покупатель обязан проверить товар до подтверждения получения.</p>

<h2>4. Запрещено</h2>
<p>4.1. Использование нецензурной лексики в чатах.</p>
<p>4.2. Обман других пользователей.</p>
<p>4.3. Распространение вредоносного ПО.</p>
<p>4.4. Спам и флуд.</p>

<h2>5. Ответственность</h2>
<p>5.1. За нарушение правил администрация может заблокировать аккаунт.</p>
<p>5.2. В случае мошенничества средства могут быть заморожены.</p>
      `]);
    }

    console.log('✅ Дефолтные данные добавлены');

  } catch (error) {
    console.error('❌ Ошибка инициализации таблиц:', error);
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  initTables
};

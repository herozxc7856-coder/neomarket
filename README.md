# NeoMarket - Игровая торговая площадка

Полнофункциональный маркетплейс типа FunPay с бэкендом на Node.js + Express и фронтендом на React + TypeScript.

## 📋 Функционал

### ✅ Реализовано:

**Авторизация и пользователи:**
- Регистрация с email подтверждением
- Авторизация с JWT токенами
- Роли: Основатель, Админ, Модератор, Верифицированный, Пользователь
- Профили с аватарками
- Статус онлайн/оффлайн

**Товары:**
- Категории и игры
- Создание, редактирование, удаление товаров
- Поиск и фильтрация
- Просмотры

**Заказы и сделки:**
- Создание заказа со списанием баланса
- Чат между покупателем и продавцом (WebSocket)
- Статусы: Оплачен → Передан → Завершен/Спор/Отменен
- Автоподтверждение через 24 часа

**Баланс:**
- Пополнение (демо-режим)
- История транзакций
- Заморозка средств при заказе

**Админ-панель:**
- Статистика сайта
- Управление пользователями (блокировка, смена ролей)
- Модерация товаров
- Просмотр всех чатов

**Поддержка:**
- Создание тикетов
- Прикрепление файлов

**Правила сайта:**
- Страница с правилами
- Редактирование через админку

## 🚀 Запуск проекта

### Требования:
- Node.js 18+
- npm или yarn

### 1. Клонирование и установка

```bash
# Перейдите в папку проекта
cd neomarket

# Установка зависимостей сервера
cd server
npm install

# Установка зависимостей клиента
cd ../client
npm install
```

### 2. Настройка сервера

```bash
cd server

# Создайте файл .env (или скопируйте .env.example)
cp .env.example .env

# Отредактируйте .env при необходимости:
# PORT=3001
# JWT_SECRET=your-secret-key
# CLIENT_URL=http://localhost:5173
```

### 3. Запуск сервера

```bash
cd server

# Режим разработки (с автоперезагрузкой)
npm run dev

# Или обычный запуск
npm start
```

Сервер запустится на http://localhost:3001

### 4. Запуск клиента

```bash
cd client
npm run dev
```

Клиент запустится на http://localhost:5173

### 5. Доступ к приложению

Откройте в браузере: http://localhost:5173

## 🔑 Демо-данные

При первом запуске автоматически создается аккаунт основателя:

- **Email:** admin@neomarket.ru
- **Пароль:** admin123

Также создаются:
- Категории товаров
- Популярные игры
- Правила сайта

## 📁 Структура проекта

```
neomarket/
├── server/                 # Бэкенд
│   ├── src/
│   │   ├── database.js     # SQLite подключение
│   │   ├── index.js        # Главный файл сервера
│   │   ├── middleware/     # Middleware (auth, upload)
│   │   └── routes/         # API роуты
│   ├── uploads/            # Загруженные файлы
│   ├── data/               # База данных SQLite
│   └── package.json
│
└── client/                 # Фронтенд
    ├── src/
    │   ├── components/     # React компоненты
    │   ├── pages/          # Страницы
    │   ├── store/          # Zustand store
    │   ├── utils/          # API и утилиты
    │   └── App.tsx         # Главный компонент
    └── package.json
```

## 🔧 API Endpoints

### Auth
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь
- `POST /api/auth/logout` - Выход

### Users
- `GET /api/users/profile/:identifier` - Профиль пользователя
- `GET /api/users/balance` - Баланс и транзакции
- `POST /api/users/deposit` - Пополнение

### Products
- `GET /api/products` - Список товаров
- `GET /api/products/:id` - Детали товара
- `POST /api/products` - Создание товара
- `PUT /api/products/:id` - Обновление товара
- `DELETE /api/products/:id` - Удаление товара

### Orders
- `GET /api/orders` - Список заказов
- `POST /api/orders` - Создание заказа
- `POST /api/orders/:id/confirm` - Подтвердить получение
- `POST /api/orders/:id/cancel` - Отменить заказ
- `POST /api/orders/:id/dispute` - Открыть спор
- `POST /api/orders/:id/deliver` - Передать товар

### Chat
- `GET /api/chat/:orderId` - Сообщения чата
- `POST /api/chat/:orderId` - Отправить сообщение

### Admin
- `GET /api/users/admin/stats` - Статистика
- `GET /api/users/admin/users` - Список пользователей
- `POST /api/users/admin/users/:id/block` - Блокировка
- `POST /api/users/admin/users/:id/role` - Смена роли

## 🛡️ Безопасность

- Пароли хешируются с bcrypt
- JWT токены для авторизации
- Проверка прав доступа на всех защищенных роутах
- Валидация входных данных
- Защита от SQL-инъекций (параметризованные запросы)

## 📝 Примечания

- База данных SQLite хранится в `server/data/neomarket.db`
- Загруженные файлы сохраняются в `server/uploads/`
- WebSocket используется для real-time чата
- В демо-режиме пополнение баланса не требует реальной оплаты

## 🐛 Возможные проблемы

**Ошибка "Cannot find module"**
```bash
# Удалите node_modules и переустановите
rm -rf node_modules package-lock.json
npm install
```

**Ошибка порта уже занят**
```bash
# Измените PORT в server/.env
PORT=3002
```

**Проблемы с SQLite**
```bash
# Удалите базу данных для сброса
rm server/data/neomarket.db
# Перезапустите сервер - БД создастся заново
```

## 📄 Лицензия

MIT License
"# neomarket"  

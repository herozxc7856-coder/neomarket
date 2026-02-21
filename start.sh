#!/bin/bash

# NeoMarket Quick Start Script
# Запускает сервер и клиент одновременно

echo "🚀 Запуск NeoMarket..."
echo ""

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Пожалуйста, установите Node.js 18+"
    exit 1
fi

# Запуск сервера
echo "📡 Запуск сервера..."
cd server

# Проверка зависимостей
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей сервера..."
    npm install
fi

# Создание .env если не существует
if [ ! -f ".env" ]; then
    echo "⚙️ Создание .env файла..."
    cp .env.example .env
fi

# Запуск сервера в фоне
npm start &
SERVER_PID=$!

cd ..

# Запуск клиента
echo "🎨 Запуск клиента..."
cd client

# Проверка зависимостей
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей клиента..."
    npm install
fi

# Создание .env если не существует
if [ ! -f ".env" ]; then
    echo "⚙️ Создание .env файла..."
    cp .env.example .env
fi

# Запуск клиента
npm run dev &
CLIENT_PID=$!

cd ..

echo ""
echo "✅ NeoMarket запущен!"
echo "📡 Сервер: http://localhost:3001"
echo "🎨 Клиент: http://localhost:5173"
echo ""
echo "🔑 Демо-аккаунт: admin@neomarket.ru / admin123"
echo ""
echo "Нажмите Ctrl+C для остановки"

# Ожидание завершения
trap "kill $SERVER_PID $CLIENT_PID; exit" INT
wait

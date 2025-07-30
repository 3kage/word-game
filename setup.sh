#!/bin/bash

# 🚀 Word Game - Quick Start Script
# This script helps you quickly set up the development environment

echo "🎮 Ukrainian Word Game - Development Setup"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не знайдено. Будь ласка, встановіть Node.js спочатку."
    echo "📥 Завантажити: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm не знайдено. Будь ласка, встановіть npm спочатку."
    exit 1
fi

echo "✅ Node.js $(node --version) знайдено"
echo "✅ npm $(npm --version) знайдено"

# Install dependencies
echo ""
echo "📦 Встановлення залежностей..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Залежності встановлено успішно"
else
    echo "❌ Помилка встановлення залежностей"
    exit 1
fi

# Check if .env exists, if not create from example
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️  Створення файлу .env з прикладу..."
    cp .env.example .env
    echo "✅ Файл .env створено. Відредагуйте його за потреби."
fi

# Run lint check
echo ""
echo "🧹 Перевірка якості коду..."
npm run lint

if [ $? -eq 0 ]; then
    echo "✅ Код пройшов перевірку"
else
    echo "⚠️  Знайдено попередження в коді"
fi

# Validate HTML
echo ""
echo "📝 Валідація HTML..."
npm run validate

if [ $? -eq 0 ]; then
    echo "✅ HTML валідний"
else
    echo "⚠️  Знайдено проблеми в HTML"
fi

echo ""
echo "🎉 Готово! Тепер ви можете:"
echo "   📱 npm run dev     - запустити локальний сервер"
echo "   🧹 npm run lint    - перевірити код"
echo "   📝 npm run validate - перевірити HTML"
echo "   🚀 npm run deploy  - деплоїти на GitHub Pages"
echo ""
echo "🌐 Локальний сервер буде доступний на http://localhost:8080"
echo "📚 Детальна документація: README.md"
echo ""
echo "🔧 Для розробки виконайте: npm run dev"

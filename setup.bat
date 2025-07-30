@echo off
REM 🚀 Word Game - Quick Start Script for Windows
REM This script helps you quickly set up the development environment

echo 🎮 Ukrainian Word Game - Development Setup
echo ==========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не знайдено. Будь ласка, встановіть Node.js спочатку.
    echo 📥 Завантажити: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm не знайдено. Будь ласка, встановіть npm спочатку.
    pause
    exit /b 1
)

echo ✅ Node.js знайдено
echo ✅ npm знайдено

REM Install dependencies
echo.
echo 📦 Встановлення залежностей...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Помилка встановлення залежностей
    pause
    exit /b 1
)

echo ✅ Залежності встановлено успішно

REM Check if .env exists, if not create from example
if not exist ".env" (
    echo.
    echo ⚙️  Створення файлу .env з прикладу...
    copy .env.example .env >nul
    echo ✅ Файл .env створено. Відредагуйте його за потреби.
)

REM Run lint check
echo.
echo 🧹 Перевірка якості коду...
call npm run lint

if %errorlevel% neq 0 (
    echo ⚠️  Знайдено попередження в коді
) else (
    echo ✅ Код пройшов перевірку
)

REM Validate HTML
echo.
echo 📝 Валідація HTML...
call npm run validate

if %errorlevel% neq 0 (
    echo ⚠️  Знайдено проблеми в HTML
) else (
    echo ✅ HTML валідний
)

echo.
echo 🎉 Готово! Тепер ви можете:
echo    📱 npm run dev     - запустити локальний сервер
echo    🧹 npm run lint    - перевірити код
echo    📝 npm run validate - перевірити HTML
echo    🚀 npm run deploy  - деплоїти на GitHub Pages
echo.
echo 🌐 Локальний сервер буде доступний на http://localhost:8080
echo 📚 Детальна документація: README.md
echo.
echo 🔧 Для розробки виконайте: npm run dev
echo.
pause

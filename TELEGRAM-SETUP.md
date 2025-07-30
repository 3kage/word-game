# 🚀 Налаштування Telegram Мультиплеєра без серверів

## Огляд

Цей проект реалізує мультиплеєрну гру в слова, використовуючи тільки **GitHub** та **Telegram** - без потреби у власних серверах!

### Як це працює:

```
[Гравець 1] ←→ [GitHub Gist API] ←→ [Гравець 2]
     ↓               ↓                    ↓
[Telegram Bot] → [Сповіщення] ← [Telegram Bot]
```

- **GitHub Gist** - зберігає стан кімнат та ігрових дій
- **Telegram Bot API** - надсилає сповіщення в реальному часі
- **GitHub Pages** - хостить гру безкоштовно

## 📋 Налаштування

### 1. Створення Telegram Бота

1. Відкрийте [@BotFather](https://t.me/BotFather) у Telegram
2. Відправте `/newbot`
3. Введіть назву бота: `Ukrainian Word Game`
4. Введіть username: `word_game_ua_bot` (або інший доступний)
5. Скопіюйте **Bot Token** (виглядає як `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Налаштування GitHub Secrets

Перейдіть до **Settings → Secrets and variables → Actions** вашого репозиторію та додайте:

```
Name: TELEGRAM_BOT_TOKEN
Value: [ваш Bot Token з BotFather]
```

`GITHUB_TOKEN` вже автоматично доступний в GitHub Actions.

### 3. Налаштування Telegram WebApp

1. У [@BotFather](https://t.me/BotFather) відправте `/setmenubutton`
2. Оберіть вашого бота
3. Введіть текст кнопки: `🎮 Грати`
4. Введіть URL WebApp: `https://[ваш-username].github.io/word-game`

### 4. Додаткові налаштування бота

```bash
# Опис бота
/setdescription
🇺🇦 Українська гра в слова з мультиплеєром! Грайте з друзями в режимі реального часу. Розвивайте словниковий запас та веселіться разом!

# Короткий опис
/setabouttext  
Гра в слова українською з мультиплеєром 🎮

# Команди
/setcommands
start - 🎮 Почати гру
help - ❓ Допомога  
create - 🏠 Створити кімнату
join - 🚪 Приєднатися до кімнати
stats - 📊 Статистика
```

## 🔧 Конфігурація

### Змінні середовища

Файл `env-config.js` містить всі налаштування:

```javascript
'MULTIPLAYER_MODE': 'telegram',        // Режим мультиплеєра
'TELEGRAM_BOT_TOKEN': '',              // З GitHub Secrets
'GITHUB_TOKEN': '',                    // Автоматично
'GITHUB_REPO': '3kage/word-game',      // Ваш репозиторій
'TELEGRAM_API_URL': 'https://api.telegram.org/bot'
```

### GitHub Actions

Workflow `deploy.yml` автоматично:

1. ✅ Вбудовує токени з secrets
2. ✅ Налаштовує Telegram бота  
3. ✅ Деплоїть на GitHub Pages
4. ✅ Створює релізи

## 🎮 Як грати

### Для користувачів:

1. **Відкрийте бота в Telegram** - знайдіть `@word_game_ua_bot`
2. **Натисніть "🎮 Грати"** - відкриється WebApp
3. **Створіть кімнату** або **приєднайтеся** за кодом
4. **Грайте з друзями** в режимі реального часу!

### Створення кімнати:
- Введіть ваше ім'я
- Оберіть категорію слів
- Отримайте 6-значний код
- Поділіться кодом з друзями

### Приєднання:
- Введіть ваше ім'я  
- Введіть код кімнати від друга
- Очікуйте поки хост почне гру

## 🏗️ Архітектура

### Компоненти

```
📁 word-game/
├── 📄 env-config.js              # Конфігурація середовища
├── 📄 multiplayer-telegram.js    # Telegram API менеджер
├── 📄 multiplayer-telegram-adapter.js # UI адаптер
├── 📄 build-config.js            # Build-time конфігурація
├── 📁 .github/workflows/
│   └── 📄 deploy.yml             # GitHub Actions
└── 📄 index.html                 # Основна сторінка
```

### API Потоки

**Створення кімнати:**
```
User → TelegramMultiplayerManager → GitHub Gist API → Create Gist
     ← Room Code ← Success Response ← 
```

**Синхронізація гри:**
```
Player Action → Update Gist → Polling → Other Players
             ↓
    Telegram Notification
```

### Зберігання даних

**GitHub Gist структура:**
```json
{
  "code": "ABC123",
  "host": {"id": "tg_123", "name": "Олексій"},
  "players": [
    {"id": "tg_123", "name": "Олексій", "joinedAt": 1640995200000},
    {"id": "tg_456", "name": "Марія", "joinedAt": 1640995260000}
  ],
  "settings": {
    "category": "Технології", 
    "roundDuration": 60,
    "maxPlayers": 2
  },
  "gameState": {
    "status": "playing",
    "actions": [
      {
        "id": "1640995300000",
        "playerId": "tg_123", 
        "action": "correct",
        "data": {"word": "КОМП'ЮТЕР", "points": 10},
        "timestamp": 1640995300000
      }
    ],
    "score": {"tg_123": 20, "tg_456": 15}
  }
}
```

## 🔒 Безпека

### Обмеження
- Gist створюються як **приватні**
- Токени передаються через **GitHub Secrets**
- Rate limiting **2 секунди** між запитами
- Автоматичне **видалення старих кімнат**

### Приватність
- Мінімум персональних даних
- Коди кімнат **випадкові 6 символів**
- Дані не зберігаються після гри

## 🚀 Розгортання

### Автоматичне (рекомендовано)

1. Fork цього репозиторію
2. Додайте `TELEGRAM_BOT_TOKEN` до Secrets
3. Push до `main` гілки
4. GitHub Actions автоматично деплоїть

### Ручне

```bash
# Клонувати
git clone https://github.com/3kage/word-game.git
cd word-game

# Встановити залежності  
npm install

# Налаштувати середовище
export TELEGRAM_BOT_TOKEN="your_bot_token"

# Білд
npm run build

# Деплой на GitHub Pages
npm run deploy
```

## 📊 Моніторинг

### Статистика доступна через:

**GitHub API:**
```bash
curl https://api.github.com/repos/3kage/word-game/traffic/views
```

**Telegram Bot API:**
```bash
curl https://api.telegram.org/bot$TOKEN/getUpdates
```

### Логи GitHub Actions:
- Успішність деплою
- Статистика використання
- Помилки конфігурації

## 🤝 Підтримка

### Часті проблеми:

**"Не вдається створити кімнату"**
- Перевірте `TELEGRAM_BOT_TOKEN` у Secrets
- Перевірте права GitHub Token

**"Гравці не бачать одне одного"**  
- Перевірте інтернет з'єднання
- Спробуйте перезавантажити сторінку

**"WebApp не відкривається"**
- Перевірте URL у @BotFather
- Переконайтеся що GitHub Pages активні

### Отримати допомогу:

1. [Issues на GitHub](https://github.com/3kage/word-game/issues)
2. [Документація GitHub Pages](https://pages.github.com/)
3. [Telegram Bot API](https://core.telegram.org/bots/api)

## 🎉 Приклади використання

### Для розробників:

```javascript
// Створити кімнату
const room = await telegramMP.createRoom({
  category: 'Технології',
  roundDuration: 90
});

// Приєднатися  
await telegramMP.joinRoom('ABC123', 'Ваше ім\'я');

// Відправити дію
await telegramMP.sendGameAction('correct', {
  word: 'КОМП\'ЮТЕР',
  points: 10
});
```

### Для освітніх закладів:

- Створіть тематичні кімнати для уроків
- Використовуйте різні категорії слів
- Організовуйте змагання між класами
- Розвивайте українську мову в ігровій формі

---

**🇺🇦 Слава Україні! Грайте та розвивайтеся українською мовою! 🎮**

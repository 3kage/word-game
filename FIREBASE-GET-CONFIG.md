# 🔥 Отримання Firebase конфігурації для word-bot-ua

## 📋 Ваш Firebase проект готовий!

Чудово! Ви вже створили Firebase проект `word-bot-ua` з Realtime Database. Тепер потрібно отримати конфігураційні дані.

## 🔑 Крок 1: Отримання конфігурації

### 1.1 Перейдіть в Project Settings
```
1. Відкрийте Firebase Console: https://console.firebase.google.com
2. Виберіть проект "word-bot-ua"
3. Натисніть на іконку шестерні (⚙️) зліва
4. Виберіть "Project settings"
```

### 1.2 Додайте Web App
```
1. Прокрутіть вниз до розділу "Your apps"
2. Натисніть на іконку Web "</>"
3. Введіть nickname: "word-game-web"
4. НЕ потрібно вибирати Firebase Hosting поки що
5. Натисніть "Register app"
```

### 1.3 Скопіюйте конфігурацію
```javascript
// Ви побачите щось подібне до цього:
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Скопіюйте цей ключ
  authDomain: "word-bot-ua.firebaseapp.com",
  databaseURL: "https://word-bot-ua-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "word-bot-ua",
  storageBucket: "word-bot-ua.appspot.com",
  messagingSenderId: "123456789012", // Скопіюйте це число
  appId: "1:123456789012:web:abcdef..." // Скопіюйте цей ID
};
```

## 🔐 Крок 2: Увімкнення Authentication

### 2.1 Анонімна автентифікація
```
1. В Firebase Console перейдіть в "Authentication"
2. Натисніть "Get started" якщо потрібно
3. Перейдіть на вкладку "Sign-in method"
4. Знайдіть "Anonymous" в списку
5. Натисніть на нього та увімкніть
6. Збережіть зміни
```

## 🛡️ Крок 3: Налаштування Security Rules

### 3.1 Оновлення правил бази даних
```
1. Перейдіть в "Realtime Database"
2. Натисніть на вкладку "Rules"
3. Замініть існуючі правила на ці:
```

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() || data.child('hostId').val() == auth.uid || data.child('players').child(auth.uid).exists())",
        ".validate": "newData.hasChildren(['code', 'hostId', 'createdAt', 'settings', 'gameState', 'players'])",
        
        "players": {
          "$playerId": {
            ".write": "auth != null && $playerId == auth.uid",
            ".validate": "newData.hasChildren(['id', 'name', 'joinedAt', 'lastSeen', 'status'])"
          }
        },
        
        "gameState": {
          ".write": "auth != null && (root.child('rooms').child($roomCode).child('hostId').val() == auth.uid || root.child('rooms').child($roomCode).child('players').child(auth.uid).exists())"
        },
        
        "gameActions": {
          ".write": "auth != null && root.child('rooms').child($roomCode).child('players').child(auth.uid).exists()",
          "$actionId": {
            ".validate": "newData.hasChildren(['type', 'playerId', 'timestamp']) && newData.child('playerId').val() == auth.uid"
          }
        },
        
        ".validate": "(now - newData.child('createdAt').val()) < 86400000"
      }
    },
    
    "users": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && $userId == auth.uid",
        ".validate": "newData.hasChildren(['name', 'createdAt'])"
      }
    },
    
    "statistics": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && $userId == auth.uid"
      }
    }
  }
}
```

### 3.2 Збережіть правила
```
Натисніть "Publish" для збереження нових правил
```

## ⚙️ Крок 4: Оновлення коду

### 4.1 Оновіть firebase-config.js
```javascript
// Замініть ці значення на ваші справжні:
static getConfig() {
    return {
        apiKey: "AIzaSyC...", // ВАШ API KEY
        authDomain: "word-bot-ua.firebaseapp.com",
        databaseURL: "https://word-bot-ua-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "word-bot-ua",
        storageBucket: "word-bot-ua.appspot.com",
        messagingSenderId: "123456789012", // ВАШ SENDER ID
        appId: "1:123456789012:web:abcdef..." // ВАШ APP ID
    };
}
```

### 4.2 Альтернативно - через environment variables
```javascript
// В .env файлі або GitHub Secrets:
FIREBASE_API_KEY=AIzaSyC...
FIREBASE_AUTH_DOMAIN=word-bot-ua.firebaseapp.com
FIREBASE_DATABASE_URL=https://word-bot-ua-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_PROJECT_ID=word-bot-ua
FIREBASE_STORAGE_BUCKET=word-bot-ua.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef...
```

## 🧪 Крок 5: Тестування

### 5.1 Відкрийте firebase-demo.html
```
1. Відкрийте файл firebase-demo.html в браузері
2. Перевірте консоль на помилки (F12)
3. Спробуйте створити кімнату
4. Відкрийте другу вкладку та приєднайтесь
```

### 5.2 Перевірка в Firebase Console
```
1. Поверніться в Firebase Console
2. Відкрийте "Realtime Database" > "Data"
3. Повинні з'явитися дані в розділі "rooms"
4. В "Authentication" > "Users" з'являться анонімні користувачі
```

## ✅ Чек-лист готовності

- [ ] Firebase проект створено ✅ (word-bot-ua)
- [ ] Realtime Database налаштовано ✅
- [ ] Web App додано до проекту
- [ ] Конфігурація скопійована в код
- [ ] Anonymous Authentication увімкнено
- [ ] Security Rules оновлено
- [ ] Тестування пройшло успішно

## 🚨 Важливі моменти безпеки

### ⚠️ API ключі
```
- API ключ Firebase можна використовувати публічно
- Безпека забезпечується через Security Rules
- Все одно рекомендується використовувати environment variables
```

### 🔒 Security Rules
```
- Правила обмежують доступ до даних
- Тільки автентифіковані користувачі можуть читати/писати
- Гравці можуть редагувати тільки свої дані
- Кімнати автоматично видаляються через 24 години
```

## 🎯 Наступні кроки

1. **Отримайте конфігурацію** з Firebase Console
2. **Оновіть код** з правильними даними
3. **Протестуйте локально** через firebase-demo.html
4. **Інтегруйте** з основною грою
5. **Розгорніть** на GitHub Pages або Firebase Hosting

---

**🔥 Ви майже готові!** Потрібно тільки скопіювати конфігурацію з Firebase Console.

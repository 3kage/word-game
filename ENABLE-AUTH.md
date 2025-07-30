# 🔐 Увімкнення Anonymous Authentication

## Швидкі кроки:

### 1. Перейдіть в Authentication
```
Firebase Console → word-bot-ua → Authentication
```

### 2. Натисніть "Get started"
(якщо Authentication ще не налаштовано)

### 3. Перейдіть на вкладку "Sign-in method"

### 4. Знайдіть "Anonymous" в списку

### 5. Увімкніть Anonymous authentication
```
1. Натисніть на "Anonymous"
2. Переведіть перемикач в положення "Enable"
3. Натисніть "Save"
```

### 6. Тестуйте!
Відкрийте `firebase-test.html` в браузері

---

## 🛡️ Security Rules (додайте в Realtime Database → Rules):

```json
{
  "rules": {
    "test": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
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
        }
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
        ".read": "auth != null && $userId == auth.uid",
        ".write": "auth != null && $userId == auth.uid"
      }
    }
  }
}
```

### 📝 Пояснення Security Rules:

**`test`** - Тестова секція для перевірки з'єднання  
**`rooms/$roomCode`** - Кімнати для мультиплеєр ігор:
- Читати можуть всі авторизовані користувачі
- Писати можуть: створювач кімнати, хост, учасники
- Валідація структури кімнати

**`players/$playerId`** - Гравці можуть редагувати тільки свої дані  
**`gameState`** - Стан гри можуть змінювати учасники  
**`gameActions`** - Дії в грі можуть додавати учасники  
**`users/$userId`** - Профілі користувачів  
**`statistics/$userId`** - Статистика гри  

Після цього все має працювати! 🎉

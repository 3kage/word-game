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
        
        "players": {
          "$playerId": {
            ".write": "auth != null && $playerId == auth.uid"
          }
        },
        
        "gameState": {
          ".write": "auth != null"
        },
        
        "gameActions": {
          ".write": "auth != null"
        }
      }
    }
  }
}
```

Після цього все має працювати! 🎉

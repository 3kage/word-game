# 🚀 Деплой проекту на GitHub Pages

## 📋 Покрокова інструкція

### 1. Підготовка репозиторію

```bash
# Клонуйте репозиторій
git clone https://github.com/ваш-username/words-game-ua.git
cd words-game-ua

# Встановіть залежності
npm install
```

### 2. Налаштування змінних середовища

```bash
# Скопіюйте файл прикладу
cp .env.example .env

# Відредагуйте .env файл з вашими даними
nano .env
```

### 3. Локальна розробка

```bash
# Запустіть локальний сервер
npm run dev

# Перевірте якість коду
npm run lint

# Валідація HTML
npm run validate
```

### 4. Деплой на GitHub Pages

#### Автоматичний деплой (рекомендується)

1. **Увімкніть GitHub Pages:**
   - Йдіть в Settings вашого репозиторію
   - Прокрутіть до секції "Pages"
   - В Source оберіть "GitHub Actions"

2. **Налаштуйте Secrets (для production):**
   - Йдіть в Settings > Secrets and variables > Actions
   - Додайте необхідні secrets:
     - `PAYMENT_PROVIDER_TOKEN` (якщо використовуєте платежі)
     - `TELEGRAM_BOT_TOKEN` (якщо потрібно)

3. **Пуш в main/master гілку:**
   ```bash
   git add .
   git commit -m "feat: add deployment configuration"
   git push origin main
   ```

#### Ручний деплой

```bash
# Зібрати та деплоїти
npm run deploy
```

### 5. Налаштування GitHub репозиторію

#### Налаштуйте захист гілки main:
- Settings > Branches
- Add rule для main/master
- Увімкніть "Require status checks to pass"
- Оберіть checks: "quality-check", "build-and-deploy"

#### Налаштуйте Issue та PR шаблони:
Файли вже створені в `.github/` папці

### 6. Моніторинг та підтримка

#### Перевірка деплою:
- Йдіть в Actions tab вашого репозиторію
- Перевірте статус workflows
- Ваш сайт буде доступний на: `https://ваш-username.github.io/words-game-ua`

#### Налаштування Custom Domain (опціонально):
1. Додайте CNAME файл в root папку з вашим доменом
2. В Settings > Pages налаштуйте Custom domain
3. Увімкніть "Enforce HTTPS"

### 7. Оновлення проекту

```bash
# Для нових фічей
git checkout -b feature/назва-фічі
# Внесіть зміни
git add .
git commit -m "feat: опис нової функції"
git push origin feature/назва-фічі
# Створіть Pull Request

# Для виправлень
git checkout -b fix/назва-виправлення
# Внесіть зміни
git add .
git commit -m "fix: опис виправлення"
git push origin fix/назва-виправлення
# Створіть Pull Request
```

### 8. Корисні команди

```bash
# Перевірка розміру проекту
npm run build

# Локальний превью продакшн версії
npm run serve

# Швидка перевірка перед пушем
npm run lint && npm run validate
```

## 🛡️ Безпека

- ❌ **Ніколи не комітте** файли `.env` з секретними даними
- ✅ Використовуйте GitHub Secrets для чутливих даних
- ✅ Регулярно перевіряйте код на вразливості
- ✅ Використовуйте HTTPS для всіх запитів

## 📊 Моніторинг

- Перевіряйте GitHub Actions для статусу деплою
- Моніторте розмір файлів (quality workflow показує це)
- Регулярно оновлюйте залежності

## 🆘 Вирішення проблем

### Build fails:
- Перевірте syntax помилки: `npm run lint`
- Перевірте HTML: `npm run validate`

### GitHub Pages не працює:
- Перевірте Settings > Pages
- Переконайтесь що GitHub Actions увімкнені
- Перевірте Actions tab для помилок

### Платежі не працюють:
- Переконайтесь що PAYMENT_PROVIDER_TOKEN налаштований
- Перевірте що токен валідний і активний

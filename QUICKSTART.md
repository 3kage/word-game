# 🚀 Quick Start

## Для нових розробників

### Windows:
```bash
git clone https://github.com/3kage/word-game.git
cd word-game
setup.bat
```

### Linux/Mac:
```bash
git clone https://github.com/3kage/word-game.git
cd word-game
chmod +x setup.sh
./setup.sh
```

### Ручне встановлення:
```bash
git clone https://github.com/3kage/word-game.git
cd word-game
npm install
npm run dev
```

## Основні команди

```bash
npm run dev      # Запустити локальний сервер (http://localhost:8080)
npm run lint     # Перевірити якість коду
npm run validate # Валідувати HTML
npm run build    # Збірка для production
npm run deploy   # Деплой на GitHub Pages
```

## Налаштування

1. Скопіюйте `.env.example` в `.env`
2. Заповніть необхідні змінні середовища
3. Запустіть `npm run dev`

## Деплой

Автоматичний деплой на GitHub Pages при push в main гілку.

Детальніше: [DEPLOY.md](./DEPLOY.md)

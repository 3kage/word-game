// Telegram Multiplayer Adapter for Word Game
class TelegramMultiplayerAdapter {
    constructor(wordGame) {
        this.game = wordGame;
        this.telegramMP = null;
        this.isMultiplayerMode = false;
        this.currentRoom = null;
        
        this.init();
    }

    async init() {
        // Перевіряємо режим мультиплеєра
        const multiplayerMode = window.EnvironmentConfig?.getMultiplayerMode() || 'websocket';
        
        if (multiplayerMode === 'telegram' && window.TelegramMultiplayerManager) {
            console.log('📱 Ініціалізація Telegram мультиплеєра...');
            this.telegramMP = new window.TelegramMultiplayerManager();
            this.setupTelegramEventListeners();
            this.setupTelegramUI();
            console.log('✅ Telegram мультиплеєр готовий');
        } else {
            console.log('🌐 Використовується WebSocket мультиплеєр');
        }
    }

    setupTelegramEventListeners() {
        if (!this.telegramMP) return;

        // Room events
        this.telegramMP.on('roomCreated', (data) => this.onRoomCreated(data));
        this.telegramMP.on('roomJoined', (data) => this.onRoomJoined(data));
        this.telegramMP.on('playerJoined', (data) => this.onPlayerJoined(data));
        this.telegramMP.on('playerLeft', (data) => this.onPlayerLeft(data));
        this.telegramMP.on('leftRoom', (data) => this.onLeftRoom(data));

        // Game events
        this.telegramMP.on('gameStarted', (data) => this.onGameStarted(data));
        this.telegramMP.on('gameAction', (data) => this.onGameAction(data));
        this.telegramMP.on('playersUpdated', (data) => this.onPlayersUpdated(data));
        
        // Connection events
        this.telegramMP.on('error', (data) => this.onError(data));
    }

    setupTelegramUI() {
        // Додаємо кнопку мультиплеєра до головного меню
        this.addMultiplayerButton();
        
        // Створюємо UI для Telegram мультиплеєра
        this.createTelegramMultiplayerScreens();
    }

    addMultiplayerButton() {
        const menu = document.getElementById('main-menu') || document.querySelector('.menu-buttons');
        if (!menu) return;

        // Перевіряємо чи кнопка вже існує
        if (document.getElementById('telegram-multiplayer-btn')) return;

        const multiplayerBtn = document.createElement('button');
        multiplayerBtn.id = 'telegram-multiplayer-btn';
        multiplayerBtn.className = 'menu-btn';
        multiplayerBtn.innerHTML = `
            <span class="btn-icon">📱</span>
            <span class="btn-text">Мультиплеєр</span>
            <span class="btn-subtitle">Грати з друзями</span>
        `;
        multiplayerBtn.onclick = () => this.showTelegramMultiplayerMenu();

        // Вставляємо кнопку після кнопки одиночної гри
        const singlePlayerBtn = document.querySelector('.menu-btn');
        if (singlePlayerBtn && singlePlayerBtn.nextSibling) {
            menu.insertBefore(multiplayerBtn, singlePlayerBtn.nextSibling);
        } else {
            menu.appendChild(multiplayerBtn);
        }
    }

    createTelegramMultiplayerScreens() {
        const container = document.body;

        // Меню мультиплеєра
        const multiplayerMenu = document.createElement('div');
        multiplayerMenu.id = 'telegram-multiplayer-menu';
        multiplayerMenu.className = 'screen hidden';
        multiplayerMenu.innerHTML = `
            <div class="card">
                <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
                    📱 Telegram Мультиплеєр
                </h2>
                
                <div class="space-y-4">
                    <button id="tg-create-room-btn" class="menu-btn w-full">
                        <span class="btn-icon">🏠</span>
                        <span class="btn-text">Створити кімнату</span>
                        <span class="btn-subtitle">Почати нову гру</span>
                    </button>
                    
                    <button id="tg-join-room-btn" class="menu-btn w-full">
                        <span class="btn-icon">🚪</span>
                        <span class="btn-text">Приєднатися</span>
                        <span class="btn-subtitle">Ввести код кімнати</span>
                    </button>
                    
                    <div class="telegram-info p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 class="font-semibold text-blue-800 mb-2">ℹ️ Як це працює:</h3>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• Гра використовує GitHub для зберігання стану кімнат</li>
                            <li>• Telegram для сповіщень та координації</li>
                            <li>• Жодних сторонніх серверів не потрібно</li>
                            <li>• Безкоштовно та безпечно</li>
                        </ul>
                    </div>
                </div>
                
                <button class="back-btn" onclick="window.telegramMultiplayerAdapter?.showMainMenu()">
                    ← Назад
                </button>
            </div>
        `;
        container.appendChild(multiplayerMenu);

        // Екран створення кімнати
        const createRoomScreen = document.createElement('div');
        createRoomScreen.id = 'tg-create-room-screen';
        createRoomScreen.className = 'screen hidden';
        createRoomScreen.innerHTML = `
            <div class="card">
                <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
                    🏠 Створити кімнату
                </h2>
                
                <div class="form-group">
                    <label for="tg-player-name" class="form-label">Ваше ім'я:</label>
                    <input type="text" id="tg-player-name" class="form-input" 
                           placeholder="Введіть ваше ім'я" maxlength="20">
                </div>
                
                <div class="form-group">
                    <label for="tg-room-category" class="form-label">Категорія:</label>
                    <select id="tg-room-category" class="form-input">
                        <option value="Змішаний">Змішаний</option>
                        <option value="Технології">Технології</option>
                        <option value="Природа">Природа</option>
                        <option value="Їжа">Їжа</option>
                        <option value="Спорт">Спорт</option>
                        <option value="Мистецтво">Мистецтво</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="tg-round-duration" class="form-label">Тривалість раунду:</label>
                    <select id="tg-round-duration" class="form-input">
                        <option value="30">30 секунд</option>
                        <option value="60" selected>60 секунд</option>
                        <option value="90">90 секунд</option>
                        <option value="120">2 хвилини</option>
                    </select>
                </div>
                
                <button id="tg-create-room-confirm" class="btn-primary w-full">
                    Створити кімнату
                </button>
                
                <div id="tg-room-created" class="hidden mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 class="font-semibold text-green-800 mb-2">✅ Кімнату створено!</h3>
                    <div class="text-lg font-mono text-center p-3 bg-white rounded border">
                        Код кімнати: <span id="tg-room-code" class="font-bold text-2xl"></span>
                    </div>
                    <p class="text-sm text-green-700 mt-2 text-center">
                        Поділіться цим кодом з друзями
                    </p>
                    <div class="mt-4 flex gap-2">
                        <button id="tg-copy-room-code" class="btn-secondary flex-1">
                            📋 Копіювати код
                        </button>
                        <button id="tg-share-room-code" class="btn-secondary flex-1">
                            📤 Поділитися
                        </button>
                    </div>
                    <div id="tg-room-players" class="mt-4">
                        <h4 class="font-semibold">Гравці в кімнаті:</h4>
                        <div id="tg-players-list" class="mt-2"></div>
                    </div>
                    <button id="tg-start-game" class="btn-primary w-full mt-4 hidden">
                        🎮 Почати гру
                    </button>
                </div>
                
                <button class="back-btn" onclick="window.telegramMultiplayerAdapter?.showTelegramMultiplayerMenu()">
                    ← Назад
                </button>
            </div>
        `;
        container.appendChild(createRoomScreen);

        // Екран приєднання до кімнати
        const joinRoomScreen = document.createElement('div');
        joinRoomScreen.id = 'tg-join-room-screen';
        joinRoomScreen.className = 'screen hidden';
        joinRoomScreen.innerHTML = `
            <div class="card">
                <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
                    🚪 Приєднатися до кімнати
                </h2>
                
                <div class="form-group">
                    <label for="tg-join-player-name" class="form-label">Ваше ім'я:</label>
                    <input type="text" id="tg-join-player-name" class="form-input" 
                           placeholder="Введіть ваше ім'я" maxlength="20">
                </div>
                
                <div class="form-group">
                    <label for="tg-join-room-code" class="form-label">Код кімнати:</label>
                    <input type="text" id="tg-join-room-code" class="form-input" 
                           placeholder="Введіть 6-значний код" maxlength="6" 
                           style="text-transform: uppercase; font-family: monospace;">
                </div>
                
                <button id="tg-join-room-confirm" class="btn-primary w-full">
                    Приєднатися
                </button>
                
                <div id="tg-join-success" class="hidden mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 class="font-semibold text-green-800 mb-2">✅ Успішно приєднались!</h3>
                    <div id="tg-join-room-info"></div>
                    <div id="tg-join-players-list" class="mt-2"></div>
                    <p class="text-sm text-green-700 mt-2">
                        Очікуємо поки хост почне гру...
                    </p>
                </div>
                
                <button class="back-btn" onclick="window.telegramMultiplayerAdapter?.showTelegramMultiplayerMenu()">
                    ← Назад
                </button>
            </div>
        `;
        container.appendChild(joinRoomScreen);

        // Налаштовуємо обробники подій
        this.setupTelegramEventHandlers();
    }

    setupTelegramEventHandlers() {
        // Кнопки меню
        document.getElementById('tg-create-room-btn')?.addEventListener('click', 
            () => this.showCreateRoomScreen());
        document.getElementById('tg-join-room-btn')?.addEventListener('click', 
            () => this.showJoinRoomScreen());

        // Створення кімнати
        document.getElementById('tg-create-room-confirm')?.addEventListener('click', 
            () => this.createRoom());
        document.getElementById('tg-copy-room-code')?.addEventListener('click', 
            () => this.copyRoomCode());
        document.getElementById('tg-share-room-code')?.addEventListener('click', 
            () => this.shareRoomCode());
        document.getElementById('tg-start-game')?.addEventListener('click', 
            () => this.startGame());

        // Приєднання до кімнати
        document.getElementById('tg-join-room-confirm')?.addEventListener('click', 
            () => this.joinRoom());

        // Автоматичне форматування коду кімнати
        document.getElementById('tg-join-room-code')?.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });

        // Заповнення імені з Telegram
        this.fillTelegramUserInfo();
    }

    fillTelegramUserInfo() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            const name = user.first_name || user.username || 'Telegram User';
            
            document.getElementById('tg-player-name').value = name;
            document.getElementById('tg-join-player-name').value = name;
        }
    }

    // Navigation methods
    showMainMenu() {
        this.hideAllScreens();
        document.getElementById('main-menu')?.classList.remove('hidden');
    }

    showTelegramMultiplayerMenu() {
        this.hideAllScreens();
        document.getElementById('telegram-multiplayer-menu')?.classList.remove('hidden');
    }

    showCreateRoomScreen() {
        this.hideAllScreens();
        document.getElementById('tg-create-room-screen')?.classList.remove('hidden');
    }

    showJoinRoomScreen() {
        this.hideAllScreens();
        document.getElementById('tg-join-room-screen')?.classList.remove('hidden');
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    }

    // Room management
    async createRoom() {
        const playerName = document.getElementById('tg-player-name')?.value.trim();
        const category = document.getElementById('tg-room-category')?.value;
        const roundDuration = parseInt(document.getElementById('tg-round-duration')?.value);

        if (!playerName) {
            alert('Будь ласка, введіть ваше ім\'я');
            return;
        }

        if (!this.telegramMP) {
            alert('Telegram мультиплеєр не ініціалізовано');
            return;
        }

        const result = await this.telegramMP.createRoom({
            category: category,
            roundDuration: roundDuration,
            maxPlayers: 2
        });

        if (result.success) {
            this.currentRoom = result.roomCode;
            this.isMultiplayerMode = true;
            
            // Показуємо інформацію про створену кімнату
            document.getElementById('tg-room-code').textContent = result.roomCode;
            document.getElementById('tg-room-created')?.classList.remove('hidden');
            
            // Приховуємо форму
            document.getElementById('tg-create-room-confirm').style.display = 'none';
        }
    }

    async joinRoom() {
        const playerName = document.getElementById('tg-join-player-name')?.value.trim();
        const roomCode = document.getElementById('tg-join-room-code')?.value.trim();

        if (!playerName) {
            alert('Будь ласка, введіть ваше ім\'я');
            return;
        }

        if (!roomCode || roomCode.length !== 6) {
            alert('Будь ласка, введіть правильний код кімнати (6 символів)');
            return;
        }

        if (!this.telegramMP) {
            alert('Telegram мультиплеєр не ініціалізовано');
            return;
        }

        const result = await this.telegramMP.joinRoom(roomCode, playerName);

        if (result.success) {
            this.currentRoom = roomCode;
            this.isMultiplayerMode = true;
            
            // Показуємо успішне приєднання
            document.getElementById('tg-join-success')?.classList.remove('hidden');
            
            // Приховуємо форму
            document.getElementById('tg-join-room-confirm').style.display = 'none';
        }
    }

    async startGame() {
        if (!this.telegramMP || !this.currentRoom) return;

        await this.telegramMP.sendGameAction('startGame');
        
        // Запускаємо основну гру
        this.startMultiplayerGame();
    }

    startMultiplayerGame() {
        // Переходимо до ігрового екрану
        this.hideAllScreens();
        
        // Запускаємо гру з мультиплеєр режимом
        if (this.game && this.game.startGame) {
            this.game.isMultiplayerMode = true;
            this.game.multiplayerManager = this.telegramMP;
            this.game.startGame();
        }
    }

    // Utility methods
    copyRoomCode() {
        const roomCode = document.getElementById('tg-room-code')?.textContent;
        if (roomCode && navigator.clipboard) {
            navigator.clipboard.writeText(roomCode).then(() => {
                // Показуємо сповіщення
                this.showNotification('Код скопійовано!');
            });
        }
    }

    shareRoomCode() {
        const roomCode = document.getElementById('tg-room-code')?.textContent;
        if (roomCode && window.Telegram?.WebApp) {
            // Використовуємо Telegram WebApp API для поділення
            const shareText = `🎮 Приєднуйся до гри в слова!\nКод кімнати: ${roomCode}\n\nПереходь за посиланням: ${window.location.href}`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'Гра в слова',
                    text: shareText,
                    url: window.location.href
                });
            } else {
                // Fallback - копіюємо текст
                navigator.clipboard?.writeText(shareText);
                this.showNotification('Інформацію скопійовано!');
            }
        }
    }

    showNotification(message) {
        // Простий спосіб показати сповіщення
        if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            // Fallback для браузера
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }

    updatePlayersList(players, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !players) return;

        container.innerHTML = players.map(player => `
            <div class="player-item flex items-center space-x-2 p-2 bg-white rounded border">
                <span class="text-green-600">👤</span>
                <span class="font-medium">${player.name}</span>
                ${player.id === this.telegramMP?.playerId ? '<span class="text-xs text-gray-500">(ви)</span>' : ''}
            </div>
        `).join('');
    }

    // Event handlers
    onRoomCreated(data) {
        console.log('🏠 Кімнату створено:', data);
        this.updatePlayersList(data.players, 'tg-players-list');
    }

    onRoomJoined(data) {
        console.log('🚪 Приєднався до кімнати:', data);
    }

    onPlayerJoined(data) {
        console.log('👤 Гравець приєднався:', data);
        
        // Оновлюємо список гравців
        this.updatePlayersList(data.players, 'tg-players-list');
        this.updatePlayersList(data.players, 'tg-join-players-list');
        
        // Показуємо кнопку старту якщо достатньо гравців
        if (data.players && data.players.length >= 2) {
            document.getElementById('tg-start-game')?.classList.remove('hidden');
        }
        
        this.showNotification(`${data.playerName} приєднався до гри!`);
    }

    onPlayerLeft(data) {
        console.log('👋 Гравець покинув кімнату:', data);
        this.showNotification(`${data.playerName} покинув гру`);
    }

    onLeftRoom(data) {
        console.log('🚪 Покинули кімнату');
        this.currentRoom = null;
        this.isMultiplayerMode = false;
        this.showMainMenu();
    }

    onGameStarted(data) {
        console.log('🎮 Гра почалася!', data);
        this.startMultiplayerGame();
    }

    onGameAction(data) {
        console.log('🎯 Ігрова дія:', data);
        
        // Передаємо дію до основної гри
        if (this.game && this.game.handleMultiplayerAction) {
            this.game.handleMultiplayerAction(data);
        }
        
        // Показуємо сповіщення про дію іншого гравця
        if (data.playerId !== this.telegramMP?.playerId) {
            const actionText = this.getActionDescription(data.action, data.data);
            this.showNotification(`${data.playerName}: ${actionText}`);
        }
    }

    onPlayersUpdated(data) {
        console.log('👥 Список гравців оновлено:', data);
        this.updatePlayersList(data.players, 'tg-players-list');
        this.updatePlayersList(data.players, 'tg-join-players-list');
    }

    onError(data) {
        console.error('❌ Помилка мультиплеєра:', data);
        alert(`Помилка: ${data.message}`);
    }

    getActionDescription(action, data) {
        switch (action) {
            case 'correct': return `Правильно! +${data?.points || 10} балів`;
            case 'skip': return 'Пропустив слово';
            case 'pause': return 'Призупинив гру';
            case 'resume': return 'Відновив гру';
            case 'startGame': return 'Розпочав гру!';
            case 'endGame': return 'Завершив гру';
            default: return action;
        }
    }

    // Public methods for game integration
    sendGameAction(action, data = {}) {
        if (this.telegramMP && this.isMultiplayerMode) {
            this.telegramMP.sendGameAction(action, data);
        }
    }

    leaveRoom() {
        if (this.telegramMP && this.currentRoom) {
            this.telegramMP.leaveRoom();
        }
    }

    // Cleanup
    destroy() {
        if (this.telegramMP) {
            this.telegramMP.destroy();
        }
    }
}

// Глобальна ініціалізація
window.addEventListener('DOMContentLoaded', () => {
    // Чекаємо поки основна гра завантажиться
    const initAdapter = () => {
        if (window.wordGame && window.EnvironmentConfig) {
            window.telegramMultiplayerAdapter = new TelegramMultiplayerAdapter(window.wordGame);
        } else {
            setTimeout(initAdapter, 100);
        }
    };
    initAdapter();
});

// Експорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramMultiplayerAdapter;
}

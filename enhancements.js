// Advanced Game Features
// This file contains enhanced gameplay features

class GameEnhancements {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.hintsUsed = 0;
        this.maxHints = 3;
        this.adaptiveDifficulty = new AdaptiveDifficulty();
        this.achievementSystem = new AchievementSystem();
        this.notificationSystem = new NotificationSystem();
    }

    // Hint system
    getHint(word) {
        if (this.hintsUsed >= this.maxHints) {
            return { error: 'Підказки закінчились!' };
        }

        this.hintsUsed++;
        const hints = this.generateHints(word);
        
        return {
            hint: hints[Math.floor(Math.random() * hints.length)],
            hintsLeft: this.maxHints - this.hintsUsed
        };
    }

    generateHints(word) {
        const hints = [];
        
        // Length hint
        hints.push(`Слово містить ${word.length} букв`);
        
        // First letter hint
        hints.push(`Слово починається на "${word[0].toUpperCase()}"`);
        
        // Category hint (if available)
        const category = this.getWordCategory(word);
        if (category) {
            hints.push(`Це слово з категорії "${category}"`);
        }
        
        // Rhyme hint
        const rhyme = this.findRhyme(word);
        if (rhyme) {
            hints.push(`Римується зі словом "${rhyme}"`);
        }
        
        // Syllable hint
        const syllables = this.countSyllables(word);
        hints.push(`Слово має ${syllables} складів`);
        
        return hints;
    }

    getWordCategory(word) {
        // Find which category contains this word
        for (const [categoryName, words] of Object.entries(wordDictionaries)) {
            if (words.includes(word)) {
                return categoryName;
            }
        }
        return null;
    }

    findRhyme(word) {
        // Simple rhyme detection (endings)
        const ending = word.slice(-2).toLowerCase();
        const commonRhymes = {
            'ка': 'мука',
            'ти': 'йти',
            'ов': 'любов',
            'ія': 'мрія',
            'ер': 'вечер'
        };
        return commonRhymes[ending] || null;
    }

    countSyllables(word) {
        // Simple Ukrainian syllable counting
        const vowels = 'аеєиіїоуюя';
        let count = 0;
        let lastWasVowel = false;
        
        for (const char of word.toLowerCase()) {
            const isVowel = vowels.includes(char);
            if (isVowel && !lastWasVowel) {
                count++;
            }
            lastWasVowel = isVowel;
        }
        
        return Math.max(1, count);
    }
}

// Adaptive Difficulty System
class AdaptiveDifficulty {
    constructor() {
        this.playerStats = {
            averageWordsPerRound: 0,
            averageSkipRate: 0,
            streakPerformance: 0,
            gameHistory: []
        };
    }

    updateStats(gameResult) {
        this.playerStats.gameHistory.push(gameResult);
        
        // Keep only last 10 games for analysis
        if (this.playerStats.gameHistory.length > 10) {
            this.playerStats.gameHistory.shift();
        }
        
        this.calculateAverages();
        this.adjustDifficulty();
    }

    calculateAverages() {
        const history = this.playerStats.gameHistory;
        if (history.length === 0) return;

        const totalWords = history.reduce((sum, game) => sum + game.wordsGuessed, 0);
        const totalSkips = history.reduce((sum, game) => sum + game.wordsSkipped, 0);
        const totalStreaks = history.reduce((sum, game) => sum + game.bestStreak, 0);

        this.playerStats.averageWordsPerRound = totalWords / history.length;
        this.playerStats.averageSkipRate = totalSkips / (totalWords + totalSkips);
        this.playerStats.streakPerformance = totalStreaks / history.length;
    }

    adjustDifficulty() {
        const { averageWordsPerRound, averageSkipRate, streakPerformance } = this.playerStats;
        
        // Suggest difficulty adjustments
        if (averageWordsPerRound > 12 && averageSkipRate < 0.2 && streakPerformance > 8) {
            return this.suggestIncrease();
        } else if (averageWordsPerRound < 5 && averageSkipRate > 0.5) {
            return this.suggestDecrease();
        }
        
        return { suggestion: 'current', message: 'Поточна складність підходить вам' };
    }

    suggestIncrease() {
        return {
            suggestion: 'increase',
            message: 'Ви добре справляєтесь! Спробуйте складніший рівень?',
            newDifficulty: this.getNextDifficulty('up')
        };
    }

    suggestDecrease() {
        return {
            suggestion: 'decrease',
            message: 'Можливо, варто спробувати легший рівень?',
            newDifficulty: this.getNextDifficulty('down')
        };
    }

    getNextDifficulty(direction) {
        const levels = ['EASY', 'NORMAL', 'HARD', 'EXPERT'];
        const currentIndex = levels.indexOf(this.game?.settings?.difficulty || 'NORMAL');
        
        if (direction === 'up' && currentIndex < levels.length - 1) {
            return levels[currentIndex + 1];
        } else if (direction === 'down' && currentIndex > 0) {
            return levels[currentIndex - 1];
        }
        
        return null;
    }
}

// Achievement System
class AchievementSystem {
    constructor() {
        this.unlockedAchievements = new Set();
        this.pendingAchievements = [];
        this.loadAchievements();
    }

    loadAchievements() {
        // Load from storage
        const saved = localStorage.getItem('game_achievements');
        if (saved) {
            this.unlockedAchievements = new Set(JSON.parse(saved));
        }
    }

    saveAchievements() {
        localStorage.setItem('game_achievements', 
            JSON.stringify([...this.unlockedAchievements]));
    }

    checkAchievements(gameData) {
        const achievements = GameConfig.ACHIEVEMENTS;
        
        // Check each achievement
        Object.values(achievements).forEach(achievement => {
            if (!this.unlockedAchievements.has(achievement.id)) {
                if (this.checkAchievementCondition(achievement, gameData)) {
                    this.unlockAchievement(achievement);
                }
            }
        });
    }

    checkAchievementCondition(achievement, gameData) {
        switch (achievement.id) {
            case 'first_win':
                return gameData.isWinner;
            
            case 'speed_demon':
                return gameData.wordsInRound >= 10;
            
            case 'streak_master':
                return gameData.bestStreak >= 15;
            
            case 'perfect_round':
                return gameData.wordsSkipped === 0 && gameData.wordsGuessed > 5;
            
            default:
                return false;
        }
    }

    unlockAchievement(achievement) {
        this.unlockedAchievements.add(achievement.id);
        this.pendingAchievements.push(achievement);
        this.saveAchievements();
        
        // Show notification
        this.showAchievementNotification(achievement);
    }

    showAchievementNotification(achievement) {
        // Create achievement popup
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <h3>Досягнення розблоковано!</h3>
            <h4>${achievement.name}</h4>
            <p>${achievement.description}</p>
            <div class="achievement-points">+${achievement.points} очок</div>
        `;
        
        document.body.appendChild(popup);
        
        // Remove after animation
        setTimeout(() => {
            popup.remove();
        }, 4000);
        
        // Create confetti effect
        this.createConfetti();
    }

    createConfetti() {
        const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 3 + 's';
                
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 50);
        }
    }

    getAchievementProgress() {
        return {
            total: Object.keys(GameConfig.ACHIEVEMENTS).length,
            unlocked: this.unlockedAchievements.size,
            percentage: Math.round((this.unlockedAchievements.size / Object.keys(GameConfig.ACHIEVEMENTS).length) * 100)
        };
    }
}

// Notification System
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = [];
    }

    createContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getIcon(type);
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;
        
        this.container.appendChild(toast);
        this.notifications.push(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                    this.notifications = this.notifications.filter(n => n !== toast);
                }
            }, 300);
        }, duration);
        
        return toast;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️',
            achievement: '🏆'
        };
        return icons[type] || icons.info;
    }

    showSuccess(message) {
        return this.show(message, 'success');
    }

    showWarning(message) {
        return this.show(message, 'warning');
    }

    showError(message) {
        return this.show(message, 'error');
    }

    showAchievement(message) {
        return this.show(message, 'achievement', 6000);
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.GameEnhancements = GameEnhancements;
    window.AdaptiveDifficulty = AdaptiveDifficulty;
    window.AchievementSystem = AchievementSystem;
    window.NotificationSystem = NotificationSystem;
}

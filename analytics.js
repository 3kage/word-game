// Analytics and Metrics System
class GameAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.events = [];
        this.sessionStart = Date.now();
        this.isEnabled = this.checkAnalyticsConsent();
        
        if (this.isEnabled) {
            this.init();
        }
    }

    init() {
        // Track session start
        this.trackEvent('session_start', {
            user_agent: navigator.userAgent,
            language: navigator.language,
            screen_resolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            is_telegram: !!window.Telegram?.WebApp
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('session_pause');
            } else {
                this.trackEvent('session_resume');
            }
        });

        // Track before unload
        window.addEventListener('beforeunload', () => {
            this.trackSessionEnd();
        });
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    checkAnalyticsConsent() {
        // Check if user has consented to analytics
        const consent = localStorage.getItem('analytics_consent');
        return consent === 'true';
    }

    trackEvent(eventName, properties = {}) {
        if (!this.isEnabled) return;

        const event = {
            id: this.generateEventId(),
            session_id: this.sessionId,
            event: eventName,
            timestamp: Date.now(),
            properties: {
                ...properties,
                session_duration: Date.now() - this.sessionStart
            }
        };

        this.events.push(event);
        
        // Send event if online, otherwise queue for later
        if (navigator.onLine) {
            this.sendEvent(event);
        } else {
            this.queueOfflineEvent(event);
        }
    }

    generateEventId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Game-specific tracking methods
    trackGameStart(gameMode, difficulty, category) {
        this.trackEvent('game_start', {
            game_mode: gameMode,
            difficulty: difficulty,
            category: category
        });
    }

    trackGameEnd(result) {
        this.trackEvent('game_end', {
            duration: result.duration,
            player1_score: result.player1Score,
            player2_score: result.player2Score,
            winner: result.winner,
            total_words: result.totalWords,
            total_skips: result.totalSkips,
            best_streak: result.bestStreak
        });
    }

    trackWordGuessed(word, category, timeToGuess) {
        this.trackEvent('word_guessed', {
            word_length: word.length,
            category: category,
            time_to_guess: timeToGuess
        });
    }

    trackWordSkipped(word, category, timeShown) {
        this.trackEvent('word_skipped', {
            word_length: word.length,
            category: category,
            time_shown: timeShown
        });
    }

    trackAchievementUnlocked(achievementId) {
        this.trackEvent('achievement_unlocked', {
            achievement_id: achievementId
        });
    }

    trackSettingsChanged(setting, oldValue, newValue) {
        this.trackEvent('settings_changed', {
            setting: setting,
            old_value: oldValue,
            new_value: newValue
        });
    }

    trackError(errorType, errorMessage, context = {}) {
        this.trackEvent('error', {
            error_type: errorType,
            error_message: errorMessage,
            context: context
        });
    }

    trackPerformance(metric, value, context = {}) {
        this.trackEvent('performance', {
            metric: metric,
            value: value,
            context: context
        });
    }

    trackSessionEnd() {
        const sessionDuration = Date.now() - this.sessionStart;
        this.trackEvent('session_end', {
            session_duration: sessionDuration,
            total_events: this.events.length
        });
        
        // Send all queued events
        this.flushEvents();
    }

    async sendEvent(event) {
        try {
            // In a real implementation, this would send to your analytics service
            console.log('Analytics Event:', event);
            
            // Example: send to a hypothetical analytics endpoint
            // await fetch('/api/analytics', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(event)
            // });
            
        } catch (error) {
            console.warn('Failed to send analytics event:', error);
            this.queueOfflineEvent(event);
        }
    }

    queueOfflineEvent(event) {
        const offlineEvents = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
        offlineEvents.push(event);
        
        // Keep only last 100 events to prevent storage overflow
        if (offlineEvents.length > 100) {
            offlineEvents.splice(0, offlineEvents.length - 100);
        }
        
        localStorage.setItem('offline_analytics', JSON.stringify(offlineEvents));
    }

    async flushEvents() {
        if (!navigator.onLine) return;

        const offlineEvents = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
        
        for (const event of offlineEvents) {
            try {
                await this.sendEvent(event);
            } catch (error) {
                console.warn('Failed to flush offline event:', error);
                break; // Stop if sending fails
            }
        }
        
        // Clear sent events
        localStorage.removeItem('offline_analytics');
    }

    // Privacy methods
    enableAnalytics() {
        localStorage.setItem('analytics_consent', 'true');
        this.isEnabled = true;
        this.init();
    }

    disableAnalytics() {
        localStorage.setItem('analytics_consent', 'false');
        this.isEnabled = false;
        
        // Clear stored data
        localStorage.removeItem('offline_analytics');
        this.events = [];
    }

    // Get analytics summary for user
    getAnalyticsSummary() {
        const gameHistory = JSON.parse(localStorage.getItem('word_game_history') || '[]');
        
        return {
            total_games: gameHistory.length,
            total_playtime: gameHistory.reduce((sum, game) => sum + (game.duration || 0), 0),
            average_score: gameHistory.reduce((sum, game) => sum + (game.score || 0), 0) / gameHistory.length || 0,
            best_score: Math.max(...gameHistory.map(game => game.score || 0)),
            favorite_category: this.getMostUsedCategory(gameHistory)
        };
    }

    getMostUsedCategory(gameHistory) {
        const categoryCount = {};
        gameHistory.forEach(game => {
            if (game.category) {
                categoryCount[game.category] = (categoryCount[game.category] || 0) + 1;
            }
        });
        
        return Object.keys(categoryCount).reduce((a, b) => 
            categoryCount[a] > categoryCount[b] ? a : b, 'Змішаний');
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor(analytics) {
        this.analytics = analytics;
        this.metrics = {
            loadTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            fps: 0
        };
        
        this.init();
    }

    init() {
        // Measure page load time
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            this.metrics.loadTime = perfData.loadEventEnd - perfData.fetchStart;
            
            this.analytics?.trackPerformance('page_load_time', this.metrics.loadTime);
        });

        // Monitor memory usage (if available)
        if ('memory' in performance) {
            setInterval(() => {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
                
                // Alert if memory usage is high
                if (this.metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
                    this.analytics?.trackPerformance('high_memory_usage', this.metrics.memoryUsage);
                }
            }, 30000); // Check every 30 seconds
        }

        // FPS monitoring
        this.startFPSMonitoring();
    }

    startFPSMonitoring() {
        let lastTime = performance.now();
        let frameCount = 0;

        const countFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                this.metrics.fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
                
                // Track low FPS
                if (this.metrics.fps < 30) {
                    this.analytics?.trackPerformance('low_fps', this.metrics.fps);
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(countFPS);
        };
        
        requestAnimationFrame(countFPS);
    }

    measureRenderTime(operation, callback) {
        const startTime = performance.now();
        
        const result = callback();
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        this.analytics?.trackPerformance(operation + '_render_time', renderTime);
        
        return result;
    }

    getMetrics() {
        return { ...this.metrics };
    }
}

// Global analytics instance
let gameAnalytics = null;
let performanceMonitor = null;

// Initialize analytics when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if analytics should be enabled
    const consent = localStorage.getItem('analytics_consent');
    
    if (consent === null) {
        // Show consent dialog (implement in UI)
        console.log('Analytics consent not set. Please ask user for permission.');
    } else if (consent === 'true') {
        gameAnalytics = new GameAnalytics();
        performanceMonitor = new PerformanceMonitor(gameAnalytics);
    }
});

// Export for global use
if (typeof window !== 'undefined') {
    window.GameAnalytics = GameAnalytics;
    window.PerformanceMonitor = PerformanceMonitor;
    window.gameAnalytics = gameAnalytics;
    window.performanceMonitor = performanceMonitor;
}

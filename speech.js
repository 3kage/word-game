// Speech Recognition and Text-to-Speech System
class SpeechManager {
    constructor() {
        this.isEnabled = window.EnvironmentConfig?.isSpeechAPIEnabled() || false;
        this.language = window.EnvironmentConfig?.getSpeechLanguage() || 'uk-UA';
        
        // Speech Recognition
        this.recognition = null;
        this.isListening = false;
        
        // Text-to-Speech
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.selectedVoice = null;
        
        // Settings
        this.settings = {
            speechRate: 1.0,
            speechPitch: 1.0,
            speechVolume: 1.0,
            voiceHintsEnabled: true,
            speechRecognitionEnabled: true
        };
        
        this.init();
    }

    async init() {
        if (!this.isEnabled) {
            console.log('Speech API disabled in configuration');
            return;
        }

        // Load settings
        this.loadSettings();
        
        // Initialize Speech Recognition
        this.initSpeechRecognition();
        
        // Initialize Text-to-Speech
        await this.initTextToSpeech();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    loadSettings() {
        const saved = localStorage.getItem('speech_settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('speech_settings', JSON.stringify(this.settings));
    }

    initSpeechRecognition() {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.language;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.onListeningStart();
        };

        this.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            this.onSpeechResult(result);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.onSpeechError(event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.onListeningEnd();
        };
    }

    async initTextToSpeech() {
        // Wait for voices to load
        return new Promise((resolve) => {
            const loadVoices = () => {
                this.voices = this.synthesis.getVoices();
                this.selectBestVoice();
                resolve();
            };

            if (this.voices.length) {
                loadVoices();
            } else {
                this.synthesis.onvoiceschanged = loadVoices;
            }
        });
    }

    selectBestVoice() {
        // Try to find voice for current language
        const langCode = this.language.split('-')[0];
        
        // Preferred voices by language
        const preferredVoices = {
            'uk': ['Milena', 'Ukrainian', 'uk-UA'],
            'en': ['Samantha', 'Alex', 'en-US', 'en-GB'],
            'ru': ['Russian', 'ru-RU'],
            'pl': ['Polish', 'pl-PL'],
            'de': ['German', 'de-DE'],
            'fr': ['French', 'fr-FR'],
            'es': ['Spanish', 'es-ES']
        };

        const preferred = preferredVoices[langCode] || [];
        
        // Find best matching voice
        for (const voiceName of preferred) {
            const voice = this.voices.find(v => 
                v.name.includes(voiceName) || 
                v.lang.includes(voiceName) ||
                v.lang.startsWith(langCode)
            );
            
            if (voice) {
                this.selectedVoice = voice;
                break;
            }
        }

        // Fallback to first available voice for language
        if (!this.selectedVoice) {
            this.selectedVoice = this.voices.find(v => v.lang.startsWith(langCode)) || this.voices[0];
        }
    }

    setupEventListeners() {
        // Listen for language changes
        window.addEventListener('languageChanged', (event) => {
            this.language = this.getLanguageCode(event.detail.language);
            if (this.recognition) {
                this.recognition.lang = this.language;
            }
            this.selectBestVoice();
        });
    }

    getLanguageCode(langCode) {
        const codes = {
            'uk': 'uk-UA',
            'en': 'en-US',
            'ru': 'ru-RU',
            'pl': 'pl-PL',
            'de': 'de-DE',
            'fr': 'fr-FR',
            'es': 'es-ES'
        };
        return codes[langCode] || 'uk-UA';
    }

    // Speech Recognition Methods
    startListening() {
        if (!this.recognition || this.isListening || !this.settings.speechRecognitionEnabled) {
            return false;
        }

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // Text-to-Speech Methods
    speak(text, options = {}) {
        if (!this.synthesis || !this.settings.voiceHintsEnabled) {
            return;
        }

        // Cancel previous speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.selectedVoice;
        utterance.rate = options.rate || this.settings.speechRate;
        utterance.pitch = options.pitch || this.settings.speechPitch;
        utterance.volume = options.volume || this.settings.speechVolume;

        utterance.onstart = () => {
            this.onSpeechStart(text);
        };

        utterance.onend = () => {
            this.onSpeechEnd(text);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
        };

        this.synthesis.speak(utterance);
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    // Game Integration Methods
    announceWord(word) {
        if (!this.settings.voiceHintsEnabled) return;
        
        const announcement = window.t ? 
            window.t('speech.new_word', { word }) : 
            `Нове слово: ${word}`;
        
        this.speak(announcement);
    }

    announceHint(hint) {
        if (!this.settings.voiceHintsEnabled) return;
        
        const announcement = window.t ? 
            window.t('speech.hint', { hint }) : 
            `Підказка: ${hint}`;
        
        this.speak(announcement);
    }

    announceScore(score) {
        if (!this.settings.voiceHintsEnabled) return;
        
        const announcement = window.t ? 
            window.t('speech.score', { score }) : 
            `Рахунок: ${score}`;
        
        this.speak(announcement);
    }

    announceTimeWarning(seconds) {
        if (!this.settings.voiceHintsEnabled) return;
        
        const announcement = window.t ? 
            window.t('speech.time_warning', { seconds }) : 
            `Залишилось ${seconds} секунд`;
        
        this.speak(announcement);
    }

    announceGameEnd(result) {
        if (!this.settings.voiceHintsEnabled) return;
        
        const announcement = result.won ? 
            (window.t ? window.t('speech.game_won') : 'Ви виграли!') :
            (window.t ? window.t('speech.game_lost') : 'Гра закінчена');
        
        this.speak(announcement);
    }

    // Voice Command Processing
    processVoiceCommand(transcript) {
        const command = transcript.toLowerCase().trim();
        
        // Define command patterns for different languages
        const commands = {
            'uk': {
                'correct': ['правильно', 'так', 'вірно', 'добре'],
                'skip': ['пропустити', 'далі', 'наступне', 'скіп'],
                'hint': ['підказка', 'допомога', 'хінт'],
                'repeat': ['повтори', 'ще раз', 'повтор'],
                'stop': ['стоп', 'зупинити', 'закінчити']
            },
            'en': {
                'correct': ['correct', 'right', 'yes', 'good'],
                'skip': ['skip', 'next', 'pass'],
                'hint': ['hint', 'help', 'clue'],
                'repeat': ['repeat', 'again', 'once more'],
                'stop': ['stop', 'end', 'finish']
            },
            'ru': {
                'correct': ['правильно', 'да', 'верно', 'хорошо'],
                'skip': ['пропустить', 'дальше', 'следующее'],
                'hint': ['подсказка', 'помощь'],
                'repeat': ['повтори', 'еще раз'],
                'stop': ['стоп', 'остановить', 'закончить']
            }
        };

        const langCode = window.i18n?.getCurrentLanguage() || 'uk';
        const langCommands = commands[langCode] || commands['uk'];

        // Check for commands
        for (const [action, phrases] of Object.entries(langCommands)) {
            if (phrases.some(phrase => command.includes(phrase))) {
                this.executeVoiceCommand(action);
                return action;
            }
        }

        return null;
    }

    executeVoiceCommand(action) {
        const event = new CustomEvent('voiceCommand', { detail: { action } });
        window.dispatchEvent(event);

        // Track voice command usage
        if (window.gameAnalytics) {
            window.gameAnalytics.trackEvent('voice_command', { action });
        }
    }

    // Event Handlers (to be overridden by game)
    onListeningStart() {
        console.log('Started listening...');
        // Show listening indicator
        this.showListeningIndicator();
    }

    onListeningEnd() {
        console.log('Stopped listening');
        // Hide listening indicator
        this.hideListeningIndicator();
    }

    onSpeechResult(transcript) {
        console.log('Speech result:', transcript);
        
        // Process as voice command
        const command = this.processVoiceCommand(transcript);
        
        if (!command) {
            // If not a command, treat as answer attempt
            const event = new CustomEvent('speechAnswer', { detail: { answer: transcript } });
            window.dispatchEvent(event);
        }
    }

    onSpeechError(error) {
        console.error('Speech error:', error);
        
        // Show user-friendly error message
        const errorMessages = {
            'no-speech': window.t ? window.t('speech.error.no_speech') : 'Мову не розпізнано',
            'audio-capture': window.t ? window.t('speech.error.no_mic') : 'Мікрофон недоступний',
            'not-allowed': window.t ? window.t('speech.error.permission') : 'Доступ до мікрофона заборонено'
        };
        
        const message = errorMessages[error] || (window.t ? window.t('speech.error.general') : 'Помилка розпізнавання мови');
        
        if (window.gameNotifications) {
            window.gameNotifications.showWarning(message);
        }
    }

    onSpeechStart(text) {
        console.log('Started speaking:', text);
    }

    onSpeechEnd(text) {
        console.log('Finished speaking:', text);
    }

    // UI Helpers
    showListeningIndicator() {
        // Create or show listening indicator
        let indicator = document.getElementById('listening-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'listening-indicator';
            indicator.className = 'listening-indicator';
            indicator.innerHTML = `
                <div class="listening-animation">
                    <div class="listening-dot"></div>
                    <div class="listening-dot"></div>
                    <div class="listening-dot"></div>
                </div>
                <span>${window.t ? window.t('speech.listening') : 'Слухаю...'}</span>
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.style.display = 'flex';
    }

    hideListeningIndicator() {
        const indicator = document.getElementById('listening-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Settings Methods
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    getSettings() {
        return { ...this.settings };
    }

    getAvailableVoices() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            localService: voice.localService
        }));
    }

    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.selectedVoice = voice;
            this.saveSettings();
        }
    }

    // Utility Methods
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition) && 
               !!window.speechSynthesis;
    }

    getSupportedLanguages() {
        // Get unique languages from available voices
        const languages = [...new Set(this.voices.map(v => v.lang))];
        return languages.sort();
    }
}

// CSS for listening indicator
const speechCSS = `
.listening-indicator {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 25px;
    padding: 12px 20px;
    display: none;
    align-items: center;
    gap: 10px;
    box-shadow: var(--card-shadow);
    z-index: 1000;
    animation: slideUpIndicator 0.3s ease;
}

.listening-animation {
    display: flex;
    gap: 3px;
}

.listening-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-primary);
    animation: listeningPulse 1.4s ease-in-out infinite both;
}

.listening-dot:nth-child(1) { animation-delay: -0.32s; }
.listening-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes listeningPulse {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes slideUpIndicator {
    from {
        transform: translateX(-50%) translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
}
`;

// Add CSS to document
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = speechCSS;
    document.head.appendChild(style);
}

// Global instance
let speechManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    speechManager = new SpeechManager();
    
    // Make available globally
    window.speechManager = speechManager;
});

// Export
if (typeof window !== 'undefined') {
    window.SpeechManager = SpeechManager;
}

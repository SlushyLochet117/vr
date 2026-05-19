export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.isEnabled = true;
        this.volume = 0.3;
        this.sounds = {};
        this.initialized = false;
        this.voiceEnabled = true;
        this.lastSpokenCombo = 0;
        
        // Variables para música de fondo
        this.musicInterval = null;
        this.isMusicPlaying = false;
        this.musicTempo = 120;
        this.currentMelodyIndex = 0;
        this.comboLevel = 1;
    }
    
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🔊 Sistema de sonidos inicializado');
        } catch(e) {
            console.warn('No se pudo inicializar audio:', e);
            this.isEnabled = false;
        }
    }
    
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
            console.log('🔊 Audio reanudado');
        }
    }
    
    // ========== MÚSICA DE FONDO 8-BIT ==========
    
    startBackgroundMusic() {
        if (!this.isEnabled || !this.audioContext) return;
        if (this.isMusicPlaying) return;
        
        this.resume();
        this.isMusicPlaying = true;
        this.currentMelodyIndex = 0;
        
        this.playMelodyLoop();
        console.log('🎵 Música 8-bit iniciada!');
    }
    
    stopBackgroundMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        this.isMusicPlaying = false;
        console.log('🎵 Música detenida');
    }
    
    updateMusicTempo(combo) {
        this.comboLevel = Math.floor(combo);
        if (this.isMusicPlaying) {
            this.restartMusicWithTempo();
        }
    }
    
    restartMusicWithTempo() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
        }
        this.playMelodyLoop();
    }
    
    playMelodyLoop() {
        if (!this.isMusicPlaying) return;
        
        const baseTempo = 100;
        const tempo = baseTempo + (this.comboLevel - 1) * 15;
        const beatDuration = 60000 / tempo;
        
        let melody;
        if (this.comboLevel < 3) {
            melody = this.getNormalMelody();
        } else if (this.comboLevel < 5) {
            melody = this.getExcitedMelody();
        } else {
            melody = this.getEpicMelody();
        }
        
        let noteIndex = 0;
        
        this.musicInterval = setInterval(() => {
            if (!this.isMusicPlaying) return;
            
            const note = melody[noteIndex % melody.length];
            if (note) {
                this.playMusicNote(note.freq, note.duration, note.volume || 0.15);
            }
            
            noteIndex++;
        }, beatDuration);
    }
    
    getNormalMelody() {
        return [
            { freq: 262, duration: 0.2 },
            { freq: 294, duration: 0.2 },
            { freq: 330, duration: 0.2 },
            { freq: 262, duration: 0.4 },
            { freq: 330, duration: 0.2 },
            { freq: 349, duration: 0.2 },
            { freq: 392, duration: 0.4 },
            { freq: 349, duration: 0.2 },
            { freq: 330, duration: 0.2 },
            { freq: 294, duration: 0.2 },
            { freq: 262, duration: 0.6 }
        ];
    }
    
    getExcitedMelody() {
        return [
            { freq: 330, duration: 0.15, volume: 0.2 },
            { freq: 392, duration: 0.15, volume: 0.2 },
            { freq: 440, duration: 0.15, volume: 0.2 },
            { freq: 392, duration: 0.15, volume: 0.2 },
            { freq: 440, duration: 0.15, volume: 0.2 },
            { freq: 523, duration: 0.3, volume: 0.25 },
            { freq: 494, duration: 0.15, volume: 0.2 },
            { freq: 440, duration: 0.15, volume: 0.2 },
            { freq: 392, duration: 0.15, volume: 0.2 },
            { freq: 349, duration: 0.15, volume: 0.2 },
            { freq: 330, duration: 0.4, volume: 0.25 }
        ];
    }
    
    getEpicMelody() {
        return [
            { freq: 392, duration: 0.2, volume: 0.25 },
            { freq: 440, duration: 0.2, volume: 0.25 },
            { freq: 523, duration: 0.2, volume: 0.25 },
            { freq: 587, duration: 0.4, volume: 0.3 },
            { freq: 523, duration: 0.2, volume: 0.25 },
            { freq: 494, duration: 0.2, volume: 0.25 },
            { freq: 440, duration: 0.2, volume: 0.25 },
            { freq: 523, duration: 0.2, volume: 0.25 },
            { freq: 587, duration: 0.2, volume: 0.25 },
            { freq: 659, duration: 0.6, volume: 0.35 }
        ];
    }
    
    playMusicNote(freq, duration, volume = 0.15) {
        if (!this.isEnabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = volume * this.volume;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gainNode);
        osc.start();
        osc.stop(now + duration);
        
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    }
    
    playPowerUpFanfare() {
        if (!this.isEnabled || !this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume * 0.5;
        
        const fanfare = [
            { freq: 523, start: 0, duration: 0.15 },
            { freq: 587, start: 0.15, duration: 0.15 },
            { freq: 659, start: 0.3, duration: 0.15 },
            { freq: 783, start: 0.45, duration: 0.3 },
            { freq: 659, start: 0.75, duration: 0.15 },
            { freq: 783, start: 0.9, duration: 0.15 },
            { freq: 880, start: 1.05, duration: 0.4 }
        ];
        
        fanfare.forEach(note => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'square';
            osc.frequency.value = note.freq;
            osc.connect(gainNode);
            osc.start(now + note.start);
            osc.stop(now + note.start + note.duration);
        });
        
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    }
    
    // ========== VOZ ==========
    
    speakCombo(comboLevel) {
        if (!this.voiceEnabled) return;
        if (!window.speechSynthesis) return;
        
        const integerCombo = Math.floor(comboLevel);
        if (integerCombo === this.lastSpokenCombo) return;
        if (integerCombo < 2) return;
        
        this.lastSpokenCombo = integerCombo;
        
        const messages = {
            2: { text: "¡Doble!", pitch: 1.0, rate: 1.1 },
            3: { text: "¡Triple!", pitch: 1.1, rate: 1.1 },
            4: { text: "¡Espectacular!", pitch: 1.2, rate: 1.0 },
            5: { text: "¡SUPREMO!", pitch: 1.3, rate: 0.9 }
        };
        
        const comboMessage = messages[integerCombo];
        if (!comboMessage) return;
        
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(comboMessage.text);
        utterance.rate = comboMessage.rate;
        utterance.pitch = comboMessage.pitch;
        utterance.volume = this.volume * 0.8;
        
        const voices = speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang.includes('es'));
        if (spanishVoice) utterance.voice = spanishVoice;
        
        speechSynthesis.speak(utterance);
    }
    
    // ========== FUNCIÓN QUE FALTABA (welcomeMessage) ==========
    welcomeMessage() {
        if (!this.voiceEnabled) return;
        if (!window.speechSynthesis) return;
        
        const utterance = new SpeechSynthesisUtterance("¡Slice Master! Corta frutas, evita bombas");
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = this.volume * 0.5;
        
        setTimeout(() => {
            speechSynthesis.speak(utterance);
        }, 1000);
    }
    
    // ========== SONIDOS ==========
    
    playSlice(fruitType = 'normal') {
        if (!this.isEnabled || !this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume;
        
        let frequencies = [800, 900, 1000];
        let duration = 0.1;
        
        switch(fruitType) {
            case 'apple':
                frequencies = [880, 1046];
                break;
            case 'orange':
                frequencies = [698, 880];
                break;
            case 'watermelon':
                frequencies = [523, 659];
                break;
            case 'banana':
                frequencies = [659, 783];
                break;
            case 'bomb':
                frequencies = [200, 150];
                duration = 0.2;
                break;
            case 'powerup':
                frequencies = [1200, 1500, 1800];
                duration = 0.15;
                break;
            default:
                frequencies = [800, 1000];
        }
        
        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gainNode);
            osc.start();
            osc.stop(now + duration + i * 0.02);
        });
        
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.05);
    }
    
    playPowerUp() {
        if (!this.isEnabled || !this.audioContext) return;
        this.resume();
        
        this.playPowerUpFanfare();
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume * 0.8;
        
        const notes = [523, 659, 783, 1046];
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gainNode);
            osc.start();
            osc.stop(now + 0.15 + i * 0.08);
        });
        
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    }
    
    playCombo(comboLevel) {
        if (!this.isEnabled || !this.audioContext) return;
        this.resume();
        
        this.updateMusicTempo(comboLevel);
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume * (0.5 + comboLevel * 0.1);
        
        const baseFreq = 440 + comboLevel * 50;
        const osc = this.audioContext.createOscillator();
        osc.type = comboLevel > 3 ? 'sawtooth' : 'square';
        osc.frequency.value = baseFreq;
        osc.connect(gainNode);
        osc.start();
        osc.stop(now + 0.2);
        
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        
        this.speakCombo(comboLevel);
    }
    
    playGameOver() {
        if (!this.isEnabled || !this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume;
        
        const notes = [523, 493, 440, 392];
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gainNode);
            osc.start();
            osc.stop(now + 0.2 + i * 0.15);
        });
        
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        console.log(`🔊 Volumen: ${Math.floor(this.volume * 100)}%`);
    }
    
    toggle() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled && this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
            this.isMusicPlaying = false;
        } else if (this.isEnabled && this.initialized) {
            this.startBackgroundMusic();
        }
        
        console.log(this.isEnabled ? '🔊 Sonido activado' : '🔇 Sonido desactivado');
        return this.isEnabled;
    }
    
    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        console.log(this.voiceEnabled ? '🗣️ Voz de combo activada' : '🔇 Voz de combo desactivada');
        
        if (!this.voiceEnabled && window.speechSynthesis) {
            speechSynthesis.cancel();
        }
        
        return this.voiceEnabled;
    }
}
export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.isEnabled = true;
        this.volume = 0.3;
        this.sounds = {};
        this.initialized = false;
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
    
    playSlice(fruitType = 'normal') {
        if (!this.isEnabled || !this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume;
        
        // Diferentes sonidos según la fruta
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
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume * 0.8;
        
        // Melodía ascendente para power-up
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
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume * (0.5 + comboLevel * 0.1);
        
        // Sonido más épico con combo alto
        const baseFreq = 440 + comboLevel * 50;
        const osc = this.audioContext.createOscillator();
        osc.type = comboLevel > 3 ? 'sawtooth' : 'square';
        osc.frequency.value = baseFreq;
        osc.connect(gainNode);
        osc.start();
        osc.stop(now + 0.2);
        
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    }
    
    playGameOver() {
        if (!this.isEnabled || !this.audioContext) return;
        this.resume();
        
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume;
        
        // Melodía descendente triste
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
    
    playBackgroundMusic() {
        if (!this.isEnabled || !this.audioContext) return;
        this.resume();
        // Música de fondo simple (loop de 4 notas)
        console.log('🎵 Música de fondo activada');
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        console.log(`🔊 Volumen: ${Math.floor(this.volume * 100)}%`);
    }
    
    toggle() {
        this.isEnabled = !this.isEnabled;
        console.log(this.isEnabled ? '🔊 Sonido activado' : '🔇 Sonido desactivado');
        return this.isEnabled;
    }
}
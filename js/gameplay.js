export class GameManager {
    constructor() {
        this.score = 0;
        this.combo = 1;
        this.comboTimer = 0;
        this.maxCombo = 1;
        this.pointMultiplier = 1;
        this.slowMotion = false;
        this.ghostMode = false;  // ← Agregado: modo fantasma
        this.onScoreUpdate = null;
        this.onComboUpdate = null;
        this.streak = 0;
    }
    
    // ========== MÉTODO PARA MODO FANTASMA ==========
    
    setGhostMode(active) {
        this.ghostMode = active;
        console.log(active ? '👻 Modo fantasma: las bombas no te afectan!' : '👻 Modo fantasma terminado');
    }
    
    // ========== AGREGAR PUNTOS ==========
    
    addPoints(points, effectManager, position, fruitType) {
        // MODO FANTASMA: ignorar bombas
        if (points < 0 && this.ghostMode) {
            console.log('👻 Bomba ignorada por modo fantasma');
            return 0;
        }
        
        const comboBonus = this.combo;
        let totalPoints = points * comboBonus * this.pointMultiplier;
        
        if (points > 0 && this.streak > 3) {
            totalPoints = Math.floor(totalPoints * 1.5);
        }
        
        this.score += totalPoints;
        
        if (points > 0) {
            this.comboTimer = 1.5;
            this.combo = Math.min(this.combo + 0.25, 5);
            this.streak++;
            
            if (this.combo >= 3 && effectManager && position) {
                effectManager.createComboEffect(position, Math.floor(this.combo));
            }
        } else if (points < 0 && !this.ghostMode) {
            // Solo perder combo si NO estamos en modo fantasma
            this.combo = 1;
            this.comboTimer = 0;
            this.streak = 0;
        }
        
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        
        if (this.onScoreUpdate) this.onScoreUpdate(this.score, totalPoints);
        if (this.onComboUpdate) this.onComboUpdate(this.combo);
        
        const comboFill = document.getElementById('combo-fill');
        if (comboFill) {
            comboFill.style.width = `${(this.combo / 5) * 100}%`;
        }
        
        // Mostrar notificación de multiplicador
        if (this.pointMultiplier > 1 && totalPoints > 0) {
            this.showMultiplierNotification(this.pointMultiplier, position);
        }
        
        return totalPoints;
    }
    
    // ========== NOTIFICACIONES ==========
    
    showMultiplierNotification(multiplier, position) {
        const div = document.createElement('div');
        div.textContent = `x${multiplier} MULTIPLICADOR!`;
        div.style.position = 'absolute';
        div.style.left = '50%';
        div.style.top = '30%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.background = 'rgba(0,0,0,0.8)';
        div.style.color = '#ffaa44';
        div.style.padding = '10px 20px';
        div.style.borderRadius = '20px';
        div.style.fontSize = '20px';
        div.style.fontWeight = 'bold';
        div.style.zIndex = '1000';
        div.style.pointerEvents = 'none';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    }
    
    // ========== MULTIPLICADOR DE PUNTOS ==========
    
    setPointMultiplier(multiplier) {
        this.pointMultiplier = multiplier;
        console.log(`🍎 Multiplicador de puntos x${multiplier}!`);
        
        const multiplierDiv = document.createElement('div');
        multiplierDiv.textContent = `🍎 PUNTOS x${multiplier} 🍎`;
        multiplierDiv.style.position = 'absolute';
        multiplierDiv.style.left = '50%';
        multiplierDiv.style.top = '40%';
        multiplierDiv.style.transform = 'translate(-50%, -50%)';
        multiplierDiv.style.background = 'rgba(0,0,0,0.8)';
        multiplierDiv.style.color = '#ffdd66';
        multiplierDiv.style.padding = '15px 30px';
        multiplierDiv.style.borderRadius = '30px';
        multiplierDiv.style.fontSize = '24px';
        multiplierDiv.style.fontWeight = 'bold';
        multiplierDiv.style.zIndex = '1000';
        multiplierDiv.style.pointerEvents = 'none';
        document.body.appendChild(multiplierDiv);
        setTimeout(() => multiplierDiv.remove(), 2000);
    }
    
    // ========== CÁMARA LENTA ==========
    
    setSlowMotion(active) {
        this.slowMotion = active;
        console.log(active ? '⏱️ CÁMARA LENTA activada!' : '⏱️ Cámara lenta terminada');
    }
    
    getDeltaModifier() {
        return this.slowMotion ? 0.4 : 1;
    }
    
    // ========== ACTUALIZAR TEMPORIZADOR DE COMBO ==========
    
    updateTimer(deltaTime) {
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = Math.max(1, this.combo - 0.5);
                if (this.combo < 1) this.combo = 1;
                if (this.onComboUpdate) this.onComboUpdate(this.combo);
                
                const comboFill = document.getElementById('combo-fill');
                if (comboFill) {
                    comboFill.style.width = `${(this.combo / 5) * 100}%`;
                }
            }
        }
    }
    
    // ========== RESET ==========
    
    reset() {
        this.score = 0;
        this.combo = 1;
        this.comboTimer = 0;
        this.streak = 0;
        this.pointMultiplier = 1;
        this.ghostMode = false;
        if (this.onScoreUpdate) this.onScoreUpdate(0, 0);
        if (this.onComboUpdate) this.onComboUpdate(1);
        
        const comboFill = document.getElementById('combo-fill');
        if (comboFill) comboFill.style.width = '0%';
    }
    
    // ========== CALLBACKS ==========
    
    setCallbacks(onScore, onCombo) {
        this.onScoreUpdate = onScore;
        this.onComboUpdate = onCombo;
    }
}
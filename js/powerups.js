import * as THREE from 'three';

export class PowerUpManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.powerups = [];
        this.activeEffects = {};
        this.spawnTimer = 0;
    }
    
    getPowerUpTypes() {
        return [
            // Power-ups originales
            { name: 'speed', color: 0xff44ff, icon: '⚡', effect: 'Velocidad x2', duration: 5, type: 'sword' },
            { name: 'freeze', color: 0x44ffff, icon: '❄️', effect: 'Frutas congeladas', duration: 4, type: 'fruits' },
            { name: 'magnet', color: 0xffaa44, icon: '🧲', effect: 'Atracción magnética', duration: 6, type: 'magnet' },
            { name: 'multiplier', color: 0xffdd66, icon: '🍎', effect: 'Puntos x3', duration: 5, type: 'score' },
            { name: 'slowmo', color: 0x4488ff, icon: '⏱️', effect: 'Cámara lenta', duration: 4, type: 'global' },
            
            // NUEVOS POWER-UPS
            { name: 'rainbow', color: 0xff66ff, icon: '🌈', effect: 'Frutas arcoíris', duration: 7, type: 'visual', special: 'rainbow' },
            { name: 'ghost', color: 0x88aaff, icon: '👻', effect: 'Atraviesas bombas', duration: 5, type: 'invincible' },
            { name: 'golden', color: 0xffdd00, icon: '👑', effect: 'Espada dorada', duration: 4, type: 'sword', special: 'golden' },
            { name: 'fruit_rain', color: 0x44ffaa, icon: '🌧️', effect: 'Lluvia de frutas', duration: 6, type: 'spawn' },
            { name: 'explosion', color: 0xff4444, icon: '💥', effect: 'Explosión masiva', duration: 1, type: 'instant' },
            { name: 'double_points', color: 0xffaa88, icon: '2️⃣', effect: 'Puntos dobles', duration: 8, type: 'score' },
            { name: 'slow_fruits', color: 0x66ccff, icon: '🐢', effect: 'Frutas lentas', duration: 6, type: 'fruits' },
            { name: 'mega_sword', color: 0xff8844, icon: '🗡️', effect: 'Súper espada', duration: 4, type: 'sword', special: 'mega' }
        ];
    }
    
    createPowerUp(x, z) {
        const types = this.getPowerUpTypes();
        const type = types[Math.floor(Math.random() * types.length)];
        
        const group = new THREE.Group();
        
        // Forma según el tipo de power-up
        let core;
        if (type.name === 'rainbow') {
            core = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.22, 0),
                new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color, emissiveIntensity: 0.6 })
            );
        } else if (type.name === 'ghost') {
            core = new THREE.Mesh(
                new THREE.SphereGeometry(0.22, 8, 8),
                new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color, transparent: true, opacity: 0.7 })
            );
        } else {
            core = new THREE.Mesh(
                new THREE.SphereGeometry(0.22, 16, 16),
                new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color, emissiveIntensity: 0.6 })
            );
        }
        group.add(core);
        
        // Anillo giratorio (colores cambiantes para rainbow)
        const ringMat = type.name === 'rainbow' 
            ? new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xff44ff })
            : new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 16, 32), ringMat);
        group.add(ring);
        
        // Puntas según el tipo
        const spikeCount = type.name === 'golden' ? 8 : 5;
        for (let i = 0; i < spikeCount; i++) {
            const spike = new THREE.Mesh(
                new THREE.ConeGeometry(0.08, 0.25, 4),
                new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color })
            );
            const angle = (i / spikeCount) * Math.PI * 2;
            spike.position.set(Math.cos(angle) * 0.38, Math.sin(angle) * 0.38, 0);
            spike.rotation.z = angle;
            group.add(spike);
        }
        
        // Luz
        const light = new THREE.PointLight(type.color, 0.8, 3);
        group.add(light);
        
        // Partículas alrededor
        const particles = [];
        const particleCount = type.name === 'rainbow' ? 12 : 8;
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 4, 4),
                new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color })
            );
            group.add(particle);
            particles.push(particle);
        }
        
        // Trayectoria flotante
        const velocityY = 2 + Math.random() * 2;
        const velocityX = (Math.random() - 0.5) * 1.5;
        const velocityZ = (Math.random() - 0.5) * 1.5;
        
        group.position.set(x, 0.8, z);
        group.userData = {
            type: type.name,
            effect: type,
            duration: type.duration,
            velocity: new THREE.Vector3(velocityX, velocityY, velocityZ),
            gravity: 6,
            rotationSpeed: 3,
            particles: particles,
            light: light,
            time: 0,
            colorCycle: 0
        };
        
        this.scene.add(group);
        this.powerups.push(group);
        return group;
    }
    
    update(deltaTime) {
        this.powerups = this.powerups.filter(powerup => {
            powerup.userData.velocity.y -= powerup.userData.gravity * deltaTime;
            powerup.position.x += powerup.userData.velocity.x * deltaTime;
            powerup.position.y += powerup.userData.velocity.y * deltaTime;
            powerup.position.z += powerup.userData.velocity.z * deltaTime;
            
            powerup.rotation.y += powerup.userData.rotationSpeed * deltaTime;
            powerup.rotation.x += powerup.userData.rotationSpeed * 0.5 * deltaTime;
            
            // Efecto rainbow: cambiar colores
            if (powerup.userData.type === 'rainbow') {
                powerup.userData.colorCycle += deltaTime * 3;
                const hue = powerup.userData.colorCycle % (Math.PI * 2);
                const r = Math.sin(hue) * 0.5 + 0.5;
                const g = Math.sin(hue + 2) * 0.5 + 0.5;
                const b = Math.sin(hue + 4) * 0.5 + 0.5;
                const color = (Math.floor(r * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(b * 255);
                
                powerup.children.forEach(child => {
                    if (child.material) {
                        child.material.color.setHex(color);
                        if (child.material.emissive) child.material.emissive.setHex(color);
                    }
                });
            }
            
            // Animar partículas
            powerup.userData.time += deltaTime * 5;
            powerup.userData.particles.forEach((particle, i) => {
                const angle = powerup.userData.time + (i / powerup.userData.particles.length) * Math.PI * 2;
                particle.position.set(Math.cos(angle) * 0.45, Math.sin(angle) * 0.45, 0);
            });
            
            if (powerup.userData.light) {
                powerup.userData.light.intensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
            }
            
            const shouldRemove = powerup.position.y < -0.8 ||
                                 Math.abs(powerup.position.x - this.camera.position.x) > 12 ||
                                 Math.abs(powerup.position.z - this.camera.position.z) > 12;
            
            if (shouldRemove) {
                this.scene.remove(powerup);
                return false;
            }
            return true;
        });
        
        // Spawn más frecuente
        this.spawnTimer += deltaTime;
        const spawnDelay = this.powerups.length < 3 ? 6 : 9;
        if (this.spawnTimer > spawnDelay) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 3;
            const x = this.camera.position.x + Math.cos(angle) * radius;
            const z = this.camera.position.z + Math.sin(angle) * radius;
            this.createPowerUp(x, z);
            this.spawnTimer = 0;
        }
    }
    
    checkCollection(swordPos, collectionRadius) {
        let collected = [];
        
        this.powerups.forEach(powerup => {
            const dist = swordPos.distanceTo(powerup.position);
            if (dist < collectionRadius) {
                collected.push(powerup);
            }
        });
        
        collected.forEach(powerup => {
            this.scene.remove(powerup);
            this.powerups = this.powerups.filter(p => p !== powerup);
        });
        
        return collected;
    }
    
    activateEffect(powerup, gameManager, fruitManager, swordManager) {
        const effect = powerup.userData.effect;
        
        switch(effect.name) {
            case 'speed':
                if (swordManager) swordManager.setSpeedMultiplier(2);
                setTimeout(() => { if (swordManager) swordManager.setSpeedMultiplier(1); }, effect.duration * 1000);
                break;
                
            case 'freeze':
                if (fruitManager) fruitManager.setSpeedMultiplier(0.3);
                setTimeout(() => { if (fruitManager) fruitManager.setSpeedMultiplier(1); }, effect.duration * 1000);
                break;
                
            case 'magnet':
                if (fruitManager) fruitManager.setMagnetActive(true, swordManager);
                setTimeout(() => { if (fruitManager) fruitManager.setMagnetActive(false); }, effect.duration * 1000);
                break;
                
            case 'multiplier':
                if (gameManager) gameManager.setPointMultiplier(3);
                setTimeout(() => { if (gameManager) gameManager.setPointMultiplier(1); }, effect.duration * 1000);
                break;
                
            case 'slowmo':
                if (gameManager) gameManager.setSlowMotion(true);
                setTimeout(() => { if (gameManager) gameManager.setSlowMotion(false); }, effect.duration * 1000);
                break;
                
            // NUEVOS POWER-UPS
            case 'rainbow':
                if (fruitManager) {
                    fruitManager.setRainbowMode(true);
                    setTimeout(() => { if (fruitManager) fruitManager.setRainbowMode(false); }, effect.duration * 1000);
                }
                break;
                
            case 'ghost':
                if (gameManager) gameManager.setGhostMode(true);
                setTimeout(() => { if (gameManager) gameManager.setGhostMode(false); }, effect.duration * 1000);
                break;
                
            case 'golden':
                if (swordManager) {
                    swordManager.setGoldenMode(true);
                    setTimeout(() => { if (swordManager) swordManager.setGoldenMode(false); }, effect.duration * 1000);
                }
                break;
                
            case 'fruit_rain':
                if (fruitManager) fruitManager.startFruitRain(6);
                break;
                
            case 'explosion':
                if (fruitManager) fruitManager.clearAllFruits();
                if (gameManager) gameManager.addPoints(500, null, null, 'explosion');
                break;
                
            case 'double_points':
                if (gameManager) {
                    gameManager.setPointMultiplier(2);
                    setTimeout(() => { if (gameManager) gameManager.setPointMultiplier(1); }, effect.duration * 1000);
                }
                break;
                
            case 'slow_fruits':
                if (fruitManager) fruitManager.setSpeedMultiplier(0.5);
                setTimeout(() => { if (fruitManager) fruitManager.setSpeedMultiplier(1); }, effect.duration * 1000);
                break;
                
            case 'mega_sword':
                if (swordManager) {
                    swordManager.setMegaSword(true);
                    setTimeout(() => { if (swordManager) swordManager.setMegaSword(false); }, effect.duration * 1000);
                }
                break;
        }
        
        return effect;
    }
    
    clearAll() {
        this.powerups.forEach(p => this.scene.remove(p));
        this.powerups = [];
    }
}
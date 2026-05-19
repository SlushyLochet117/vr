import * as THREE from 'three';

export class EffectManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.slashEffects = [];
    }
    
    createSliceEffect(position, fruitType) {
        // Colores según la fruta
        const colors = {
            apple: 0xff6666,
            orange: 0xffaa66,
            watermelon: 0x66ff66,
            banana: 0xffdd66,
            strawberry: 0xff66aa,
            pineapple: 0xffcc66,
            bomb: 0xff3300,
            star: 0xffaa44,
            fruit: 0xffaa44
        };
        
        const color = colors[fruitType] || 0xffaa44;
        
        // Para frutas normales, usar explosión de jugo
        if (fruitType !== 'bomb' && fruitType !== 'star') {
            this.createJuiceExplosion(position, color);
        }
        
        // Partículas del corte base
        const particleCount = fruitType === 'bomb' ? 30 : 12;
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshStandardMaterial({ color: color, emissive: color })
            );
            particle.position.copy(position);
            particle.userData = {
                life: 0.5,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    Math.random() * 3 + 1,
                    (Math.random() - 0.5) * 4
                ),
                scale: 1
            };
            this.scene.add(particle);
            this.particles.push(particle);
        }
        
        // Anillo de corte
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.3, 0.03, 8, 24),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color })
        );
        ring.position.copy(position);
        ring.userData = { life: 0.3, scale: 1 };
        this.scene.add(ring);
        this.particles.push(ring);
        
        // Efecto especial para bombas
        if (fruitType === 'bomb') {
            const explosion = new THREE.PointLight(0xff4400, 2, 4);
            explosion.position.copy(position);
            this.scene.add(explosion);
            explosion.userData = { life: 0.2 };
            this.particles.push(explosion);
            
            // Onda expansiva
            const shockwave = new THREE.Mesh(
                new THREE.RingGeometry(0.2, 0.8, 16),
                new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, side: THREE.DoubleSide, transparent: true })
            );
            shockwave.position.copy(position);
            shockwave.userData = { life: 0.4, scale: 1 };
            this.scene.add(shockwave);
            this.particles.push(shockwave);
        }
        
        // Efecto especial para power-ups
        if (fruitType === 'star') {
            for (let i = 0; i < 20; i++) {
                const starParticle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.06, 4, 4),
                    new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff6600 })
                );
                const angle = (i / 20) * Math.PI * 2;
                starParticle.position.copy(position);
                starParticle.userData = {
                    life: 0.6,
                    velocity: new THREE.Vector3(Math.cos(angle) * 2, Math.sin(angle) * 2 + 1, 0)
                };
                this.scene.add(starParticle);
                this.particles.push(starParticle);
            }
        }
    }
    
    // ========== EXPLOSIÓN DE JUGO (MEJORADA) ==========
    createJuiceExplosion(position, fruitColor) {
        // Trozos de fruta (cubos)
        for (let i = 0; i < 20; i++) {
            const piece = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.08, 0.08),
                new THREE.MeshStandardMaterial({ color: fruitColor, roughness: 0.3 })
            );
            piece.position.copy(position);
            piece.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 6,
                    Math.random() * 5 + 1,
                    (Math.random() - 0.5) * 6
                ),
                life: 0.8,
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5
                )
            };
            this.scene.add(piece);
            this.particles.push(piece);
        }
        
        // Gotas de jugo (esferas pequeñas)
        for (let i = 0; i < 40; i++) {
            const drop = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 6, 6),
                new THREE.MeshStandardMaterial({ color: fruitColor, emissive: fruitColor, emissiveIntensity: 0.5 })
            );
            drop.position.copy(position);
            drop.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    Math.random() * 6 + 1,
                    (Math.random() - 0.5) * 4
                ),
                life: 0.6
            };
            this.scene.add(drop);
            this.particles.push(drop);
        }
        
        // Chispeantes (puntas de luz)
        for (let i = 0; i < 15; i++) {
            const spark = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 4, 4),
                new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa44 })
            );
            spark.position.copy(position);
            spark.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 7,
                    Math.random() * 4,
                    (Math.random() - 0.5) * 7
                ),
                life: 0.4
            };
            this.scene.add(spark);
            this.particles.push(spark);
        }
    }
    
    // ========== EFECTO DE COMBO ==========
    createComboEffect(position, combo) {
        // Anillos múltiples según combo
        for (let i = 0; i < Math.min(combo, 5); i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.4 + i * 0.12, 0.04, 16, 32),
                new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xff33ff, transparent: true })
            );
            ring.position.copy(position);
            ring.userData = { 
                life: 0.6, 
                scale: 1, 
                delay: i * 0.05,
                ringType: 'combo'
            };
            this.scene.add(ring);
            this.particles.push(ring);
        }
        
        // Estrellas alrededor
        const starCount = 12 + combo * 2;
        for (let i = 0; i < starCount; i++) {
            const star = new THREE.Mesh(
                new THREE.SphereGeometry(0.07, 6, 6),
                new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff6600 })
            );
            const angle = (i / starCount) * Math.PI * 2;
            star.position.copy(position);
            star.userData = {
                life: 0.7,
                velocity: new THREE.Vector3(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5 + 1.5, 0),
                starType: 'combo'
            };
            this.scene.add(star);
            this.particles.push(star);
        }
        
        // Texto "COMBO!" flotante (simulado con partículas en forma de texto)
        const letterPositions = [
            [-0.4, 0.2], [-0.2, 0.2], [0, 0.2], [0.2, 0.2], [0.4, 0.2], // C O M B O
            [-0.3, 0], [-0.1, 0], [0.1, 0], [0.3, 0]  // !
        ];
        
        letterPositions.forEach((offset) => {
            const letterParticle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xff33ff })
            );
            letterParticle.position.set(position.x + offset[0], position.y + offset[1] + 0.5, position.z);
            letterParticle.userData = {
                life: 0.5,
                velocity: new THREE.Vector3(0, 1.5, 0)
            };
            this.scene.add(letterParticle);
            this.particles.push(letterParticle);
        });
    }
    
    // ========== ACTUALIZAR PARTÍCULAS ==========
    update(deltaTime) {
        this.particles = this.particles.filter(p => {
            p.userData.life -= deltaTime;
            
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                return false;
            }
            
            // Actualizar posición de partículas normales
            if (p.userData.velocity) {
                p.position.x += p.userData.velocity.x * deltaTime;
                p.position.y += p.userData.velocity.y * deltaTime;
                p.position.z += p.userData.velocity.z * deltaTime;
                p.scale.setScalar(p.userData.life);
            }
            
            // Rotación para trozos de fruta
            if (p.userData.rotationSpeed) {
                p.rotateX(p.userData.rotationSpeed.x * deltaTime);
                p.rotateY(p.userData.rotationSpeed.y * deltaTime);
                p.rotateZ(p.userData.rotationSpeed.z * deltaTime);
            }
            
            // Actualizar anillos (se agrandan con el tiempo)
            if (p.geometry && (p.geometry.type === 'TorusGeometry' || p.geometry.type === 'RingGeometry')) {
                const scale = 1 + (1 - p.userData.life) * 3;
                p.scale.setScalar(scale);
                if (p.material) {
                    p.material.opacity = p.userData.life;
                    p.material.transparent = true;
                }
            }
            
            // Actualizar luces
            if (p.isLight || (p.material && p.material.emissiveIntensity !== undefined && p.userData.starType === 'combo')) {
                if (p.material) p.material.emissiveIntensity = p.userData.life * 1.5;
            }
            
            return true;
        });
    }
    
    // ========== LIMPIAR TODAS LAS PARTÍCULAS ==========
    clearAll() {
        this.particles.forEach(p => this.scene.remove(p));
        this.particles = [];
    }
}
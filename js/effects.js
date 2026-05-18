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
            bomb: 0xff3300
        };
        
        const color = colors[fruitType] || 0xffaa44;
        const particleCount = fruitType === 'bomb' ? 30 : 12;
        
        // Partículas del corte
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
        }
    }
    
    createComboEffect(position, combo) {
        // Anillos múltiples según combo
        for (let i = 0; i < Math.min(combo, 5); i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.4 + i * 0.1, 0.04, 16, 32),
                new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xff33ff })
            );
            ring.position.copy(position);
            ring.userData = { life: 0.5, scale: 1, delay: i * 0.05 };
            this.scene.add(ring);
            this.particles.push(ring);
        }
        
        // Texto de combo (simulado con partículas)
        const starCount = 8 + combo * 2;
        for (let i = 0; i < starCount; i++) {
            const star = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 4, 4),
                new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff6600 })
            );
            const angle = (i / starCount) * Math.PI * 2;
            star.position.copy(position);
            star.userData = {
                life: 0.6,
                velocity: new THREE.Vector3(Math.cos(angle) * 2, Math.sin(angle) * 2 + 1, 0)
            };
            this.scene.add(star);
            this.particles.push(star);
        }
    }
    
    update(deltaTime) {
        this.particles = this.particles.filter(p => {
            p.userData.life -= deltaTime;
            
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                return false;
            }
            
            // Actualizar posición
            if (p.userData.velocity) {
                p.position.x += p.userData.velocity.x * deltaTime;
                p.position.y += p.userData.velocity.y * deltaTime;
                p.position.z += p.userData.velocity.z * deltaTime;
                p.scale.setScalar(p.userData.life);
            }
            
            // Actualizar anillos
            if (p.geometry && p.geometry.type === 'TorusGeometry') {
                const scale = 1 + (1 - p.userData.life) * 2;
                p.scale.setScalar(scale);
                if (p.material) p.material.opacity = p.userData.life;
            }
            
            // Actualizar luces
            if (p.isLight) {
                p.intensity = p.userData.life * 2;
            }
            
            return true;
        });
    }
    
    clearAll() {
        this.particles.forEach(p => this.scene.remove(p));
        this.particles = [];
    }
}


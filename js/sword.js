import * as THREE from 'three';

export class SwordManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.swordGroup = new THREE.Group();
        this.trailPoints = [];
        this.lastPositions = [];
        this.isSlashing = false;
        this.slashStartTime = 0;
        this.speedMultiplier = 1;
        
        // Variables para power-ups
        this.goldenMode = false;
        this.megaSwordActive = false;
        
        // Array para partículas orbitantes (DEBE estar definido)
        this.orbitingParticles = [];
        
        // Crear la espada
        this.createSword();
        
        // Crear el trail (estela láser)
        this.createTrail();
        
        scene.add(this.swordGroup);
    }
    
    // ========== MÉTODOS PARA POWER-UPS ==========
    
    setSpeedMultiplier(multiplier) {
        this.speedMultiplier = multiplier;
        console.log(`⚡ Velocidad de espada x${multiplier}`);
        
        if (this.swordGroup) {
            const blade = this.swordGroup.children[0];
            if (blade && blade.material) {
                if (multiplier > 1) {
                    blade.material.color.setHex(0xff66ff);
                    blade.material.emissiveIntensity = 1.2;
                    if (this.glowLight) this.glowLight.color.setHex(0xff66ff);
                } else if (!this.goldenMode) {
                    blade.material.color.setHex(0x44ffaa);
                    blade.material.emissiveIntensity = 0.5;
                    if (this.glowLight) this.glowLight.color.setHex(0x44ffaa);
                }
            }
        }
    }
    
    setGoldenMode(active) {
        this.goldenMode = active;
        const blade = this.swordGroup.children[0];
        
        if (active) {
            if (blade && blade.material) {
                blade.material.color.setHex(0xffdd00);
                blade.material.emissiveIntensity = 1.5;
            }
            if (this.glowLight) this.glowLight.color.setHex(0xffdd00);
            console.log('👑 ESPADA DORADA! Cortes más poderosos');
        } else {
            if (blade && blade.material && this.speedMultiplier === 1) {
                blade.material.color.setHex(0x44ffaa);
                blade.material.emissiveIntensity = 0.5;
            }
            if (this.glowLight && this.speedMultiplier === 1) this.glowLight.color.setHex(0x44ffaa);
        }
    }
    
    setMegaSword(active) {
        this.megaSwordActive = active;
        const blade = this.swordGroup.children[0];
        
        if (active) {
            if (blade) blade.scale.set(1.5, 1.5, 1.5);
            if (this.glowLight) this.glowLight.intensity = 1.2;
            console.log('🗡️ MEGA ESPADA! Rango aumentado');
        } else {
            if (blade) blade.scale.set(1, 1, 1);
            if (this.glowLight) this.glowLight.intensity = 0.5;
        }
    }
    
    // ========== CREAR ESPADA ==========
    
    createSword() {
    // Hoja - ahora apunta hacia adelante (eje Z)
    const bladeGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8);
    const bladeMat = new THREE.MeshStandardMaterial({ 
        color: 0xff44aa, 
        emissive: 0xff2288,
        emissiveIntensity: 1.0,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.x = Math.PI / 2; // Rotar para que apunte hacia adelante
    blade.position.z = 0.6;
    this.swordGroup.add(blade);
    
    // Punta
    const tipGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xff88cc, emissive: 0xff44aa });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.z = 1.2;
    this.swordGroup.add(tip);
    
    // Guardamanos
    const guardGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, metalness: 0.7 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.z = 0.1;
    this.swordGroup.add(guard);
    
    // Mango
    const handleGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.25, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x884422 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -0.2;
    this.swordGroup.add(handle);
    
    // Luz
    const glowLight = new THREE.PointLight(0xff44aa, 1.0, 4);
    this.swordGroup.add(glowLight);
    this.glowLight = glowLight;
    
    // Partículas orbitantes
    this.orbitingParticles = [];
    for (let i = 0; i < 8; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0xff88cc, emissive: 0xff44aa })
        );
        this.swordGroup.add(particle);
        this.orbitingParticles.push(particle);
    }
}
    // ========== CREAR ESTELA (TRAIL) ==========
    
    createTrail() {
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({ color: 0xff44aa });
        this.trailLine = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(this.trailLine);
    }
    
    updateTrail(currentPos) {
        this.lastPositions.unshift(currentPos.clone());
        if (this.lastPositions.length > 20) this.lastPositions.pop();
        
        const points = this.lastPositions.map(p => p.clone());
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        if (this.trailLine.geometry) this.trailLine.geometry.dispose();
        this.trailLine.geometry = geometry;
        
        if (this.trailLine.material) {
            this.trailLine.material.color.setHex(0xff44aa);
        }
    }
    
    // ========== ACTUALIZAR ESPADA ==========
    
    updateSword(position, rotation, isCutting) {
        this.swordGroup.position.copy(position);
        this.swordGroup.quaternion.copy(rotation);
        
        const now = Date.now();
        if (isCutting) {
            if (!this.isSlashing) {
                this.isSlashing = true;
                this.slashStartTime = now;
                this.glowLight.intensity = 1.5;
            }
            
            this.updateTrail(position);
            
            if (now - this.slashStartTime < 200) {
                this.glowLight.intensity = 1.2 + Math.sin(now * 0.02) * 0.5;
            }
        } else {
            this.isSlashing = false;
            this.glowLight.intensity = 0.4;
            
            if (this.lastPositions.length > 0) {
                this.lastPositions.pop();
                this.updateTrail(position);
            }
        }
        
        // Animar partículas orbitantes (AHORA this.orbitingParticles SÍ existe)
        if (this.orbitingParticles && this.orbitingParticles.length > 0) {
            const time = now * 0.008 * this.speedMultiplier;
            this.orbitingParticles.forEach((p, i) => {
                const angle = time + (i / this.orbitingParticles.length) * Math.PI * 2;
                p.position.set(Math.cos(angle) * 0.35, 0.4 + Math.sin(angle * 2) * 0.2, Math.sin(angle) * 0.35);
            });
        }
    }
    
    // ========== OBTENER POSICIÓN DE LA PUNTA ==========
    
  getSwordPosition() {
    const tipPos = this.swordGroup.position.clone();
    
    // La espada ahora apunta hacia ADELANTE (eje Z negativo local)
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.swordGroup.quaternion);
    
    const bladeLength = this.megaSwordActive ? 1.5 : 1.2;
    tipPos.add(direction.multiplyScalar(bladeLength));
    
    return tipPos;
}
    
    // ========== MÉTODOS DE ESTADO ==========
    
    isSlashingActive() {
        return this.isSlashing;
    }
    
    getSlashVelocity() {
        if (this.lastPositions.length < 2) return 0;
        const last = this.lastPositions[0];
        const prev = this.lastPositions[1];
        return last.distanceTo(prev) * 60 * this.speedMultiplier;
    }
    
    getMegaSwordActive() {
        return this.megaSwordActive;
    }
    
    getGoldenMode() {
        return this.goldenMode;
    }
    
    resetTrail() {
        this.lastPositions = [];
        if (this.trailLine.geometry) {
            this.trailLine.geometry.dispose();
            this.trailLine.geometry = new THREE.BufferGeometry();
        }
    }
}
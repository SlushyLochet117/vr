import * as THREE from 'three';

export class FruitManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.fruits = [];
        this.bombs = [];
        this.spawnTimer = 0;
        this.fruitCount = 0;
        
        // Variables para power-ups
        this.speedMultiplier = 1;      // Para freeze (0.3 = lento, 1 = normal)
        this.magnetActive = false;      // Para imán
        this.swordManager = null;       // Referencia a la espada para el imán
        this.rainbowMode = false;       // Para modo arcoíris
        
        // Tipos de frutas
        this.fruitTypes = [
            { name: 'apple', color: 0xff3333, scale: 0.22, points: 10 },
            { name: 'orange', color: 0xffaa33, scale: 0.22, points: 10 },
            { name: 'watermelon', color: 0x33ff33, scale: 0.3, points: 20 },
            { name: 'banana', color: 0xffdd44, scale: 0.25, points: 15 },
            { name: 'strawberry', color: 0xff44aa, scale: 0.2, points: 15 },
            { name: 'pineapple', color: 0xffcc66, scale: 0.28, points: 25 },
            { name: 'dragonfruit', color: 0xff44aa, scale: 0.28, points: 30, special: 'explosion' },
            { name: 'coconut', color: 0xaa8866, scale: 0.3, points: 5, bouncy: true },
            { name: 'kiwi', color: 0x88cc44, scale: 0.22, points: 12 },
            { name: 'peach', color: 0xffaa88, scale: 0.24, points: 15 }
        ];
    }
    
    // ========== MÉTODOS PARA POWER-UPS ==========
    
    setSpeedMultiplier(multiplier) {
        this.speedMultiplier = multiplier;
        console.log(`❄️ Velocidad de frutas x${multiplier}`);
    }
    
    setMagnetActive(active, swordManager) {
        this.magnetActive = active;
        if (swordManager) this.swordManager = swordManager;
        console.log(active ? '🧲 IMÁN activado! Las frutas vienen hacia ti' : '🧲 Imán desactivado');
    }
    
    setRainbowMode(active) {
        this.rainbowMode = active;
        console.log(active ? '🌈 Modo arcoíris activado!' : '🌈 Modo arcoíris terminado');
    }
    
    startFruitRain(duration) {
        console.log('🌧️ Lluvia de frutas!');
        const originalSpawnDelay = this.spawnTimer;
        this.spawnTimer = 0.15;
        
        setTimeout(() => {
            this.spawnTimer = 0.6;
        }, duration * 1000);
    }
    
    clearAllFruits() {
        this.fruits.forEach(f => this.scene.remove(f));
        this.bombs.forEach(b => this.scene.remove(b));
        this.fruits = [];
        this.bombs = [];
        this.fruitCount = 0;
        this.updateFruitCounter();
        console.log('💥 EXPLOSIÓN! Todas las frutas eliminadas');
    }
    
    // ========== CREAR FRUTAS ==========
    
    createFruit(type, x, z) {
        const fruitData = this.fruitTypes[type % this.fruitTypes.length];
        const group = new THREE.Group();
        
        // Color según modo arcoíris
        let color = fruitData.color;
        if (this.rainbowMode) {
            const hue = (Date.now() * 0.005 + type) % (Math.PI * 2);
            const r = Math.sin(hue) * 0.5 + 0.5;
            const g = Math.sin(hue + 2) * 0.5 + 0.5;
            const b = Math.sin(hue + 4) * 0.5 + 0.5;
            color = (Math.floor(r * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(b * 255);
        }
        
        // Cuerpo principal
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(fruitData.scale, 24, 24),
            new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.1 })
        );
        group.add(body);
        
        // Hoja (para la mayoría de frutas)
        if (fruitData.name !== 'banana' && fruitData.name !== 'coconut' && fruitData.name !== 'dragonfruit') {
            const leafGeo = new THREE.ConeGeometry(0.08, 0.15, 4);
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x44aa44 });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.y = fruitData.scale * 0.8;
            group.add(leaf);
        }
        
        // Detalles específicos por fruta
        if (fruitData.name === 'apple') {
            const seed = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), new THREE.MeshStandardMaterial({ color: 0x884422 }));
            seed.position.y = -0.05;
            group.add(seed);
        } else if (fruitData.name === 'strawberry') {
            for (let i = 0; i < 20; i++) {
                const seed = new THREE.Mesh(new THREE.SphereGeometry(0.01, 3, 3), new THREE.MeshStandardMaterial({ color: 0xffdd88 }));
                const angle = Math.random() * Math.PI * 2;
                const rad = fruitData.scale * 0.7;
                seed.position.set(Math.cos(angle) * rad, (Math.random() - 0.5) * rad, Math.sin(angle) * rad);
                group.add(seed);
            }
        } else if (fruitData.name === 'pineapple') {
            for (let i = 0; i < 30; i++) {
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(0.02, 0.08, 3),
                    new THREE.MeshStandardMaterial({ color: 0xaa8844 })
                );
                const angle = Math.random() * Math.PI * 2;
                const rad = fruitData.scale * 0.9;
                spike.position.set(Math.cos(angle) * rad, (Math.random() - 0.5) * rad * 1.5, Math.sin(angle) * rad);
                spike.lookAt(0, spike.position.y, 0);
                group.add(spike);
            }
        }
        
        // Trayectoria parabólica (con multiplicador de velocidad para freeze)
        const baseSpeed = 5;
        const velocityY = (baseSpeed + Math.random() * 4) * this.speedMultiplier;
        const velocityX = (Math.random() - 0.5) * 3 * this.speedMultiplier;
        const velocityZ = (Math.random() - 0.5) * 3 * this.speedMultiplier;
        
        group.position.set(x, -0.5, z);
        group.userData = {
            type: fruitData.name,
            points: fruitData.points,
            velocity: new THREE.Vector3(velocityX, velocityY, velocityZ),
            gravity: 12,
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5
            ),
            scale: fruitData.scale
        };
        
        this.scene.add(group);
        return group;
    }
    
    // ========== CREAR BOMBA ==========
    
    createBomb(x, z) {
        const group = new THREE.Group();
        
        // Cuerpo negro con textura de bomba
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 24, 24),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.2 })
        );
        group.add(body);
        
        // Línea roja alrededor (como bomba clásica)
        const redBand = new THREE.Mesh(
            new THREE.TorusGeometry(0.26, 0.04, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0xff3333 })
        );
        redBand.rotation.x = Math.PI / 2;
        group.add(redBand);
        
        // Mecha
        const fuse = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.05, 0.15, 4),
            new THREE.MeshStandardMaterial({ color: 0xaa6644 })
        );
        fuse.position.y = 0.28;
        group.add(fuse);
        
        // Chispa animada
        const spark = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 4, 4),
            new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300 })
        );
        spark.position.y = 0.36;
        group.add(spark);
        
        // Trayectoria
        const baseSpeed = 5;
        const velocityY = (baseSpeed + Math.random() * 3) * this.speedMultiplier;
        const velocityX = (Math.random() - 0.5) * 2.5 * this.speedMultiplier;
        const velocityZ = (Math.random() - 0.5) * 2.5 * this.speedMultiplier;
        
        group.position.set(x, -0.5, z);
        group.userData = {
            type: 'bomb',
            points: -50,
            velocity: new THREE.Vector3(velocityX, velocityY, velocityZ),
            gravity: 12,
            spark: spark
        };
        
        this.scene.add(group);
        return group;
    }
    
    // ========== SPAWN ==========
    
    spawnFruitOrBomb() {
    // 75% fruta, 25% bomba
    const isBomb = Math.random() < 0.25;
    
    // ========== NUEVO: Ángulo limitado a 180 grados (solo al frente) ==========
    // En lugar de ángulo completo (0 a 2PI), solo de -90 a +90 grados (frente)
    const angle = (Math.random() - 0.5) * Math.PI; // -90° a +90°
    
    const radius = 3 + Math.random() * 3;
    
    // Obtener dirección hacia donde mira la cámara
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    // Calcular perpendicular (derecha)
    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection);
    
    // Posición relativa a la cámara (solo al frente)
    const forwardOffset = cameraDirection.clone().multiplyScalar(Math.cos(angle) * radius);
    const rightOffset = right.clone().multiplyScalar(Math.sin(angle) * radius);
    
    const x = this.camera.position.x + forwardOffset.x + rightOffset.x;
    const z = this.camera.position.z + forwardOffset.z + rightOffset.z;
    
    if (isBomb && this.bombs.length < 4) {
        const bomb = this.createBomb(x, z);
        this.bombs.push(bomb);
    } else {
        const fruitType = Math.floor(Math.random() * this.fruitTypes.length);
        const fruit = this.createFruit(fruitType, x, z);
        this.fruits.push(fruit);
        this.fruitCount++;
        this.updateFruitCounter();
    }
}
    
    // ========== ACTUALIZAR FÍSICA ==========
    
    update(deltaTime) {
        // Aplicar multiplicador de velocidad por freeze
        const speedFactor = this.speedMultiplier;
        
        // Actualizar frutas
        this.fruits = this.fruits.filter(fruit => {
            // Aplicar velocidad con factor de freeze
            fruit.userData.velocity.y -= fruit.userData.gravity * deltaTime;
            fruit.position.x += fruit.userData.velocity.x * deltaTime * speedFactor;
            fruit.position.y += fruit.userData.velocity.y * deltaTime * speedFactor;
            fruit.position.z += fruit.userData.velocity.z * deltaTime * speedFactor;
            
            // Rotación
            fruit.rotateX(fruit.userData.rotationSpeed.x * deltaTime);
            fruit.rotateY(fruit.userData.rotationSpeed.y * deltaTime);
            fruit.rotateZ(fruit.userData.rotationSpeed.z * deltaTime);
            
            // EFECTO IMÁN: atraer frutas hacia la espada
            if (this.magnetActive && this.swordManager) {
                const swordPos = this.swordManager.getSwordPosition();
                const direction = new THREE.Vector3().subVectors(swordPos, fruit.position).normalize();
                const magnetStrength = 5 * deltaTime;
                fruit.userData.velocity.x += direction.x * magnetStrength;
                fruit.userData.velocity.z += direction.z * magnetStrength;
            }
            
            // Eliminar si cae al suelo o sale de rango
            const shouldRemove = fruit.position.y < -1.2 || 
                                 Math.abs(fruit.position.x - this.camera.position.x) > 14 ||
                                 Math.abs(fruit.position.z - this.camera.position.z) > 14;
            
            if (shouldRemove) {
                this.scene.remove(fruit);
                this.fruitCount--;
                this.updateFruitCounter();
                return false;
            }
            return true;
        });
        
        // Actualizar bombas
        this.bombs = this.bombs.filter(bomb => {
            bomb.userData.velocity.y -= bomb.userData.gravity * deltaTime;
            bomb.position.x += bomb.userData.velocity.x * deltaTime * speedFactor;
            bomb.position.y += bomb.userData.velocity.y * deltaTime * speedFactor;
            bomb.position.z += bomb.userData.velocity.z * deltaTime * speedFactor;
            
            // Animar chispa (parpadeo)
            if (bomb.userData.spark) {
                const intensity = 0.3 + Math.random() * 0.8;
                bomb.userData.spark.material.emissiveIntensity = intensity;
                const scale = 0.8 + Math.random() * 0.4;
                bomb.userData.spark.scale.set(scale, scale, scale);
            }
            
            // Efecto imán también en bombas
            if (this.magnetActive && this.swordManager) {
                const swordPos = this.swordManager.getSwordPosition();
                const direction = new THREE.Vector3().subVectors(swordPos, bomb.position).normalize();
                const magnetStrength = 5 * deltaTime;
                bomb.userData.velocity.x += direction.x * magnetStrength;
                bomb.userData.velocity.z += direction.z * magnetStrength;
            }
            
            const shouldRemove = bomb.position.y < -1.2 ||
                                 Math.abs(bomb.position.x - this.camera.position.x) > 14 ||
                                 Math.abs(bomb.position.z - this.camera.position.z) > 14;
            
            if (shouldRemove) {
                this.scene.remove(bomb);
                return false;
            }
            return true;
        });
        
        // Spawnear nuevos objetos
        const targetCount = 12;
        const currentCount = this.fruits.length + this.bombs.length;
        const spawnDelay = currentCount < targetCount ? 0.4 : 0.7;
        
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > spawnDelay && currentCount < targetCount + 3) {
            this.spawnFruitOrBomb();
            this.spawnTimer = 0;
        }
    }
    
    // ========== DETECTAR CORTES ==========
    
    checkSlice(swordPos, slashRadius) {
        let sliced = [];
        let pointsEarned = 0;
        
        // Revisar frutas
        this.fruits.forEach(fruit => {
            const dist = swordPos.distanceTo(fruit.position);
            if (dist < slashRadius) {
                sliced.push(fruit);
                pointsEarned += fruit.userData.points;
            }
        });
        
        // Revisar bombas
        this.bombs.forEach(bomb => {
            const dist = swordPos.distanceTo(bomb.position);
            if (dist < slashRadius) {
                sliced.push(bomb);
                pointsEarned += bomb.userData.points;
            }
        });
        
        // Eliminar los cortados
        sliced.forEach(obj => {
            this.scene.remove(obj);
            this.fruits = this.fruits.filter(f => f !== obj);
            this.bombs = this.bombs.filter(b => b !== obj);
            if (obj.userData.type !== 'bomb') {
                this.fruitCount--;
                this.updateFruitCounter();
            }
        });
        
        return { count: sliced.length, points: pointsEarned };
    }
    
    // ========== UTILIDADES ==========
    
    updateFruitCounter() {
        const counter = document.getElementById('fruit-count');
        if (counter) counter.textContent = this.fruitCount;
    }
    
    getFruits() { 
        return { fruits: this.fruits, bombs: this.bombs }; 
    }
    
    reset() {
        this.fruits.forEach(f => this.scene.remove(f));
        this.bombs.forEach(b => this.scene.remove(b));
        this.fruits = [];
        this.bombs = [];
        this.fruitCount = 0;
        this.spawnTimer = 0;
        this.updateFruitCounter();
    }
}
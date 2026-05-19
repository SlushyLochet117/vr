import * as THREE from 'three';

// ========== SISTEMA DE ARMAS ==========

let currentWeapon = 'sword';
let gunCooldown = 0;
let bowCharge = 0;
let isCharging = false;
let lastShootTime = 0;

// Array para proyectiles activos
let activeProjectiles = [];

// Modelos 3D de armas
let gunModel = null;
let bowModel = null;

// ========== CREAR MODELOS 3D DE ARMAS ==========
export function createWeaponModels(scene) {
    // ===== PISTOLA =====
    gunModel = new THREE.Group();
    
    const gunBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 })
    );
    gunBody.position.z = 0;
    gunModel.add(gunBody);
    
    const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.22;
    gunModel.add(barrel);
    
    const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.16, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.5 })
    );
    grip.position.z = -0.12;
    grip.position.y = -0.06;
    gunModel.add(grip);
    
    const sight = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xffaa44, metalness: 0.9 })
    );
    sight.position.y = 0.08;
    sight.position.z = 0.12;
    gunModel.add(sight);
    
    const laserLight = new THREE.PointLight(0xff0000, 0.6, 4);
    laserLight.position.z = 0.38;
    gunModel.add(laserLight);
    
    gunModel.userData.laserLight = laserLight;
    
    // ===== ARCO =====
    bowModel = new THREE.Group();
    
    const bowCurve = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.045, 16, 32, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xccaa66, metalness: 0.4, roughness: 0.6 })
    );
    bowCurve.rotation.x = Math.PI / 2;
    bowCurve.rotation.z = Math.PI;
    bowModel.add(bowCurve);
    
    const bowOuter = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.03, 16, 32, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xaa8844, metalness: 0.3 })
    );
    bowOuter.rotation.x = Math.PI / 2;
    bowOuter.rotation.z = Math.PI;
    bowModel.add(bowOuter);
    
    const stringGeo = new THREE.BufferGeometry();
    const stringPoints = [
        new THREE.Vector3(0, 0.22, 0.05),
        new THREE.Vector3(0, -0.22, 0.05)
    ];
    stringGeo.setFromPoints(stringPoints);
    const stringLine = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0xddccaa }));
    bowModel.add(stringLine);
    
    const bowGlow = new THREE.PointLight(0xffaa44, 0.5, 3);
    bowModel.add(bowGlow);
    
    bowModel.userData.bowGlow = bowGlow;
    
    scene.add(gunModel);
    scene.add(bowModel);
    
    gunModel.visible = false;
    bowModel.visible = false;
    
    console.log('🔫 Modelo de pistola creado');
    console.log('🏹 Modelo de arco creado');
}

// ========== CREAR PROYECTIL (BALA) ==========
function createBullet(origin, direction, scene, isBow = false) {
    const group = new THREE.Group();
    
    if (isBow) {
        // Flecha del arco
        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.25, 4),
            new THREE.MeshStandardMaterial({ color: 0xccaa66, metalness: 0.3 })
        );
        shaft.rotation.x = Math.PI / 2;
        group.add(shaft);
        
        const tip = new THREE.Mesh(
            new THREE.ConeGeometry(0.05, 0.1, 4),
            new THREE.MeshStandardMaterial({ color: 0xffdd88, metalness: 0.8 })
        );
        tip.position.z = 0.14;
        group.add(tip);
        
        const feathers = new THREE.Mesh(
            new THREE.ConeGeometry(0.04, 0.08, 3),
            new THREE.MeshStandardMaterial({ color: 0xaa8866 })
        );
        feathers.position.z = -0.12;
        group.add(feathers);
        
        // Luz de la flecha
        const arrowLight = new THREE.PointLight(0xffaa44, 0.5, 3);
        group.add(arrowLight);
        
        group.userData = { type: 'arrow', light: arrowLight };
    } else {
        // Bala de pistola
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff4400, emissiveIntensity: 0.8 })
        );
        group.add(bullet);
        
        // Estela de la bala
        const trail = new THREE.Mesh(
            new THREE.ConeGeometry(0.05, 0.12, 6),
            new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300 })
        );
        trail.position.z = -0.1;
        group.add(trail);
        
        group.userData = { type: 'bullet' };
    }
    
    group.position.copy(origin);
    group.userData.direction = direction.clone().normalize();
    group.userData.speed = isBow ? 15 : 25;
    group.userData.life = 2.0;
    group.userData.isBow = isBow;
    
    scene.add(group);
    activeProjectiles.push(group);
    
    return group;
}

// ========== ACTUALIZAR PROYECTILES ==========
export function updateProjectiles(deltaTime, fruitManager, effectManager, soundManager, gameManager, scene) {
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const p = activeProjectiles[i];
        
        p.userData.life -= deltaTime;
        
        const move = p.userData.direction.clone().multiplyScalar(p.userData.speed * deltaTime);
        p.position.add(move);
        
        if (p.userData.light) {
            p.userData.light.intensity = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
        }
        
        let hit = false;
        if (fruitManager.fruits) {
            for (let j = 0; j < fruitManager.fruits.length; j++) {
                const fruit = fruitManager.fruits[j];
                const dist = p.position.distanceTo(fruit.position);
                if (dist < 0.35) {
                    const fruitPos = fruit.position.clone();
                    fruitManager.fruits.splice(j, 1);
                    fruitManager.fruitCount--;
                    fruitManager.updateFruitCounter();
                    scene.remove(fruit);
                    
                    const points = p.userData.isBow ? 15 : 10;
                    gameManager.addPoints(points, effectManager, fruitPos, p.userData.isBow ? 'bow' : 'gun');
                    effectManager.createSliceEffect(fruitPos, 'fruit');
                    soundManager.playSlice(p.userData.isBow ? 'watermelon' : 'apple');
                    
                    createImpactEffect(fruitPos, scene);
                    
                    hit = true;
                    break;
                }
            }
        }
        
        if (hit || p.userData.life <= 0 || p.position.length() > 20) {
            scene.remove(p);
            activeProjectiles.splice(i, 1);
        }
    }
}

function createImpactEffect(position, scene) {
    for (let i = 0; i < 10; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 4, 4),
            new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff4400 })
        );
        particle.position.copy(position);
        particle.userData = {
            life: 0.3,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 2,
                (Math.random() - 0.5) * 3
            )
        };
        scene.add(particle);
        setTimeout(() => scene.remove(particle), 300);
    }
}

// ========== DISPARAR PISTOLA ==========
export function shootGun(fruitManager, effectManager, soundManager, gameManager, camera, scene) {
    if (currentWeapon !== 'gun') return false;
    if (gunCooldown > 0) return false;
    
    gunCooldown = 0.1;
    
    const shootDir = new THREE.Vector3();
    camera.getWorldDirection(shootDir);
    const shootOrigin = camera.position.clone().add(shootDir.multiplyScalar(0.8));
    
    createBullet(shootOrigin, shootDir, scene, false);
    
    const muzzleFlash = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff6600, emissiveIntensity: 1 })
    );
    muzzleFlash.position.copy(shootOrigin);
    scene.add(muzzleFlash);
    setTimeout(() => scene.remove(muzzleFlash), 50);
    
    soundManager.playSlice('apple');
    console.log('🔫 ¡BANG! Proyectil lanzado');
    
    return true;
}

// ========== ARCO ==========
export function startBowCharge() {
    if (currentWeapon !== 'bow') return;
    isCharging = true;
    bowCharge = 0;
    console.log('🏹 Cargando arco...');
}

export function releaseBow(fruitManager, effectManager, soundManager, gameManager, camera, scene) {
    if (currentWeapon !== 'bow' || !isCharging) return false;
    isCharging = false;
    
    const power = Math.min(bowCharge / 2, 1);
    const shootDir = new THREE.Vector3();
    camera.getWorldDirection(shootDir);
    const shootOrigin = camera.position.clone().add(shootDir.multiplyScalar(0.8));
    
    const arrow = createBullet(shootOrigin, shootDir, scene, true);
    arrow.userData.speed = 12 + power * 10;
    
    const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa44 })
    );
    flash.position.copy(shootOrigin);
    scene.add(flash);
    setTimeout(() => scene.remove(flash), 50);
    
    soundManager.playSlice('watermelon');
    console.log(`🏹 Flecha lanzada! Potencia: ${Math.floor(power*100)}%`);
    
    bowCharge = 0;
    return true;
}

// ========== ACTUALIZAR MODELO DE ARMA ==========
export function updateWeaponModel(weapon, position, rotation, isCharging = false, bowChargeValue = 0) {
    if (gunModel) gunModel.visible = false;
    if (bowModel) bowModel.visible = false;
    
    switch(weapon) {
        case 'gun':
            if (gunModel) {
                gunModel.visible = true;
                gunModel.position.copy(position);
                gunModel.quaternion.copy(rotation);
                if (gunModel.userData.laserLight) {
                    gunModel.userData.laserLight.intensity = 0.4 + Math.sin(Date.now() * 0.015) * 0.3;
                }
            }
            break;
        case 'bow':
            if (bowModel) {
                bowModel.visible = true;
                bowModel.position.copy(position);
                bowModel.quaternion.copy(rotation);
                if (isCharging && bowModel.userData.bowGlow) {
                    const chargePercent = Math.min(bowChargeValue / 2, 1);
                    bowModel.userData.bowGlow.intensity = 0.5 + chargePercent * 1.5;
                } else if (bowModel.userData.bowGlow) {
                    bowModel.userData.bowGlow.intensity = 0.3;
                }
            }
            break;
    }
}

// ========== UI Y CONTROLES ==========
export function createWeaponUI() {
    const weaponDiv = document.createElement('div');
    weaponDiv.id = 'weaponUI';
    weaponDiv.style.cssText = `
        position: absolute;
        bottom: 100px;
        right: 20px;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(10px);
        padding: 10px 20px;
        border-radius: 20px;
        color: white;
        font-family: monospace;
        z-index: 100;
        pointer-events: none;
        text-align: center;
        border: 1px solid #ffaa44;
    `;
    weaponDiv.innerHTML = `
        <div>⚔️ ARMA ACTUAL</div>
        <div id="weaponIcon" style="font-size: 32px; margin: 5px 0;">🗡️</div>
        <div id="weaponName" style="font-size: 14px; color: #ffaa44;">ESPADA</div>
        <div id="weaponAmmo" style="font-size: 10px; color: #888;"></div>
    `;
    document.body.appendChild(weaponDiv);
    
    const weaponControls = document.createElement('div');
    weaponControls.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        gap: 10px;
        z-index: 100;
    `;
    weaponControls.innerHTML = `
        <button id="swordBtn" style="padding:10px 15px;background:#ff4444;color:white;border:none;border-radius:10px;cursor:pointer;font-size:20px;">🗡️</button>
        <button id="gunBtn" style="padding:10px 15px;background:#444;color:white;border:none;border-radius:10px;cursor:pointer;font-size:20px;">🔫</button>
        <button id="bowBtn" style="padding:10px 15px;background:#444;color:white;border:none;border-radius:10px;cursor:pointer;font-size:20px;">🏹</button>
    `;
    document.body.appendChild(weaponControls);
    
    document.getElementById('swordBtn').onclick = () => switchWeapon('sword');
    document.getElementById('gunBtn').onclick = () => switchWeapon('gun');
    document.getElementById('bowBtn').onclick = () => switchWeapon('bow');
}

// ✅ ESTA ES LA FUNCIÓN QUE FALTABA EXPORTAR
export function switchWeapon(weapon) {
    currentWeapon = weapon;
    const weaponIcon = document.getElementById('weaponIcon');
    const weaponName = document.getElementById('weaponName');
    const weaponAmmo = document.getElementById('weaponAmmo');
    
    switch(weapon) {
        case 'sword':
            weaponIcon.innerHTML = '🗡️';
            weaponName.innerHTML = 'ESPADA';
            weaponName.style.color = '#ffaa44';
            document.getElementById('swordBtn').style.background = '#ff4444';
            document.getElementById('gunBtn').style.background = '#444';
            document.getElementById('bowBtn').style.background = '#444';
            weaponAmmo.innerHTML = '';
            break;
        case 'gun':
            weaponIcon.innerHTML = '🔫';
            weaponName.innerHTML = 'PISTOLA';
            weaponName.style.color = '#44ffaa';
            document.getElementById('swordBtn').style.background = '#444';
            document.getElementById('gunBtn').style.background = '#44ffaa';
            document.getElementById('bowBtn').style.background = '#444';
            weaponAmmo.innerHTML = '🔫 Disparo instantáneo - BALA VISIBLE';
            break;
        case 'bow':
            weaponIcon.innerHTML = '🏹';
            weaponName.innerHTML = 'ARCO';
            weaponName.style.color = '#ffaa44';
            document.getElementById('swordBtn').style.background = '#444';
            document.getElementById('gunBtn').style.background = '#444';
            document.getElementById('bowBtn').style.background = '#ffaa44';
            weaponAmmo.innerHTML = '💪 Mantén presionado - FLECHA VISIBLE';
            break;
    }
    console.log(`⚔️ Arma cambiada a: ${weapon}`);
}

// ========== ACTUALIZACIONES ==========
export function updateBowChargeUI(deltaTime) {
    if (isCharging && currentWeapon === 'bow') {
        bowCharge += deltaTime;
        const chargePercent = Math.min(bowCharge / 2, 1);
        const weaponAmmo = document.getElementById('weaponAmmo');
        if (weaponAmmo) {
            const bars = '█'.repeat(Math.floor(chargePercent * 10)) + '░'.repeat(10 - Math.floor(chargePercent * 10));
            weaponAmmo.innerHTML = `🏹 Cargando: [${bars}] ${Math.floor(chargePercent * 100)}%`;
        }
    }
}

export function updateGunCooldown(deltaTime) {
    if (gunCooldown > 0) gunCooldown -= deltaTime;
}

// ========== CONFIGURAR CONTROLES PC ==========
export function setupWeaponControls(fruitManager, effectManager, soundManager, gameManager, camera, scene) {
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (currentWeapon === 'gun') {
            shootGun(fruitManager, effectManager, soundManager, gameManager, camera, scene);
        }
    });
    
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && currentWeapon === 'bow') {
            startBowCharge();
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0 && currentWeapon === 'bow') {
            releaseBow(fruitManager, effectManager, soundManager, gameManager, camera, scene);
        }
    });
}

// ========== MANEJAR ARMAS EN VR ==========
export function handleVRWeapons(fruitManager, effectManager, soundManager, gameManager, camera, scene, isSwinging, isInVR, renderer) {
    if (!isInVR) return;
    
    const now = Date.now();
    if (isSwinging) {
        if (currentWeapon === 'gun' && now - lastShootTime > 300) {
            lastShootTime = now;
            shootGun(fruitManager, effectManager, soundManager, gameManager, camera, scene);
        }
        if (currentWeapon === 'bow' && !isCharging) {
            startBowCharge();
        }
    } else {
        if (currentWeapon === 'bow' && isCharging) {
            releaseBow(fruitManager, effectManager, soundManager, gameManager, camera, scene);
        }
    }
}

// ========== GETTERS ==========
export function getCurrentWeapon() {
    return currentWeapon;
}

export function getIsCharging() {
    return isCharging;
}

export function getBowCharge() {
    return bowCharge;
}
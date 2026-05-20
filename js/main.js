import * as THREE from 'three';
import { createFruitScene } from './scene.js';
import { SwordManager } from './sword.js';
import { FruitManager } from './fruits.js';
import { EffectManager } from './effects.js';
import { GameManager } from './gameplay.js';
import { PowerUpManager } from './powerups.js';
import { SoundManager } from './soundManager.js';
import { createWeaponUI, setupWeaponControls, updateBowChargeUI, 
    updateGunCooldown, handleVRWeapons, createWeaponModels, 
    updateWeaponModel, getCurrentWeapon, shootGun, startBowCharge, 
    releaseBow, getIsCharging, getBowCharge, updateProjectiles, switchWeapon } from './weapons.js';

// ========== RENDERER ==========
const renderer = new THREE.WebGLRenderer({ antialias: true , xrCompatible: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// ========== ESCENA ==========
const { scene, floor, particles } = createFruitScene();

// ========== CÁMARA ==========
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 2);

// ========== MANAGERS ==========
const swordManager = new SwordManager(scene, renderer);
const fruitManager = new FruitManager(scene, camera);
const effectManager = new EffectManager(scene);
const gameManager = new GameManager();
const powerUpManager = new PowerUpManager(scene, camera);
const soundManager = new SoundManager();

// ========== CREAR MODELOS DE ARMAS ==========
createWeaponModels(scene);

// ========== VARIABLES DEL JUEGO ==========
let rightHand = null;
let leftHand = null;
let isSwinging = false;
let isInVR = false;
let handTrackingAvailable = false;
let lastCombo = 1;
let swordObject = null;
let debugSphere = null;
let aimDot = null;

// Variables para el menú
let gameStarted = false;
let gameMode = null;
let gameRunning = false;

// ========== VARIABLES PARA JOYSTICK ==========
let leftStickX = 0, leftStickY = 0;

// ========== UI DEL JUEGO ==========
function updateUI(score, lastPoints) {
    const scoreEl = document.getElementById('score');
    if (scoreEl) {
        scoreEl.innerHTML = Math.floor(score);
        if (lastPoints > 0) {
            scoreEl.style.transform = 'scale(1.2)';
            setTimeout(() => { if(scoreEl) scoreEl.style.transform = 'scale(1)'; }, 150);
        }
    }
}

function updateCombo(combo) {
    const comboEl = document.getElementById('combo');
    if (comboEl) {
        comboEl.innerHTML = `🔥 x${combo.toFixed(1)}`;
        comboEl.style.color = combo >= 3 ? '#ff66ff' : '#ffaa44';
        
        if (combo >= 3 && Math.floor(combo) > Math.floor(lastCombo)) {
            soundManager.playCombo(Math.floor(combo));
        }
        lastCombo = combo;
    }
    const comboFill = document.getElementById('combo-fill');
    if (comboFill) {
        comboFill.style.width = `${(combo / 5) * 100}%`;
    }
}

function updateFruitCounter(count) {
    const fruitCountSpan = document.getElementById('fruit-count');
    if (fruitCountSpan) fruitCountSpan.textContent = count;
}

const originalUpdateFruitCounter = fruitManager.updateFruitCounter;
fruitManager.updateFruitCounter = function() {
    if (originalUpdateFruitCounter) originalUpdateFruitCounter.call(fruitManager);
    updateFruitCounter(fruitManager.fruitCount);
};

gameManager.setCallbacks(updateUI, updateCombo);

function hideDesktopUI() {
    const instructions = document.getElementById('instructions');
    if (instructions) instructions.style.display = 'none';
}

function showDesktopUI() {
    const instructions = document.getElementById('instructions');
    if (instructions) instructions.style.display = 'block';
}

// ========== FUNCIONES DEL MENÚ ==========
function hideMenu() {
    const menu = document.getElementById('startMenu');
    const gameUI = document.getElementById('gameUI');
    
    if (menu) {
        menu.style.opacity = '0';
        setTimeout(() => {
            menu.style.display = 'none';
        }, 500);
    }
    if (gameUI) {
        gameUI.style.display = 'block';
    }
}

function showMenu() {
    const menu = document.getElementById('startMenu');
    const gameUI = document.getElementById('gameUI');
    
    if (menu) {
        menu.style.display = 'flex';
        menu.style.opacity = '1';
    }
    if (gameUI) {
        gameUI.style.display = 'none';
    }
    
    gameStarted = false;
    gameRunning = false;
}

function startGame() {
    gameRunning = true;
    gameStarted = true;
    lastTime = performance.now();
    
    soundManager.init();
    soundManager.startBackgroundMusic();
    
    for (let i = 0; i < 8; i++) {
        fruitManager.spawnFruitOrBomb();
    }
    
    console.log('🎮 Juego iniciado!');
}

function startVRMode() {
    gameMode = 'vr';
    hideMenu();
    startGame();
    
    setTimeout(() => {
        try {
            checkWeaponChangeFromStick();
        } catch (err) {
            console.warn('Stick weapon change no disponible:', err);
        }
    }, 1000);
    
    setTimeout(() => {
        const vrBtn = document.getElementById('vrButton');
        if (vrBtn && !renderer.xr.isPresenting) {
            vrBtn.click();
        }
    }, 500);
    
    console.log('🎮 Iniciando modo VR...');
}

function startPCMode() {
    gameMode = 'pc';
    hideMenu();
    startGame();
    
    setTimeout(() => {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.innerHTML = '🖱️ HAZ CLICK para activar | W/A/S/D mover | 🔫 Click derecho dispara | 🏹 Mantener izquierdo carga';
        }
    }, 1000);
    
    console.log('🖥️ Iniciando modo PC...');
}

function setupMenu() {
    const playVRBtn = document.getElementById('playVRBtn');
    const playPCBtn = document.getElementById('playPCBtn');
    const instructionsBtn = document.getElementById('instructionsBtn');
    const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
    const instructionsPanel = document.getElementById('instructionsPanel');
    
    if (playVRBtn) {
        playVRBtn.addEventListener('click', startVRMode);
    }
    
    if (playPCBtn) {
        playPCBtn.addEventListener('click', startPCMode);
    }
    
    if (instructionsBtn && instructionsPanel) {
        instructionsBtn.addEventListener('click', () => {
            instructionsPanel.classList.toggle('show');
        });
    }
    
    if (closeInstructionsBtn && instructionsPanel) {
        closeInstructionsBtn.addEventListener('click', () => {
            instructionsPanel.classList.remove('show');
        });
    }
}

// ========== DEBUG ==========
function showDebugSlice(position) {
    if (!debugSphere) {
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
        debugSphere = new THREE.Mesh(geometry, material);
        scene.add(debugSphere);
    }
    debugSphere.position.copy(position);
    debugSphere.material.emissiveIntensity = 0.8;
    setTimeout(() => {
        if (debugSphere) debugSphere.material.emissiveIntensity = 0;
    }, 50);
}

function ensureSwordIsVisible() {
    if (swordManager && swordManager.swordGroup) {
        swordObject = swordManager.swordGroup;
        if (getCurrentWeapon() === 'sword') {
            swordObject.visible = true;
        }
        console.log('🗡️ Espada visible');
    }
}

// ========== CONTROLADOR VR (CON LOGS DE DEPURACIÓN) ==========
function setupController() {
    const controller = renderer.xr.getController(0);
    if (controller) {
        console.log('✅ Controlador VR detectado');
        
        controller.addEventListener('selectstart', () => {
            console.log('🎮 GATILLO PRESIONADO EN VR');
            const currentWeapon = getCurrentWeapon();
            console.log('Arma actual:', currentWeapon);
            
            if (currentWeapon === 'gun') {
                shootGun(fruitManager, effectManager, soundManager, gameManager, camera, scene);
                console.log('🔫 Disparo en VR!');
            } else if (currentWeapon === 'bow') {
                startBowCharge();
                console.log('🏹 Cargando arco...');
            } else {
                isSwinging = true;
                soundManager.playSlice('powerup');
                if (swordManager && swordManager.glowLight) {
                    swordManager.glowLight.intensity = 1.5;
                }
            }
        });
        
        controller.addEventListener('selectend', () => {
            console.log('🎮 GATILLO LIBERADO EN VR');
            const currentWeapon = getCurrentWeapon();
            
            if (currentWeapon === 'bow') {
                releaseBow(fruitManager, effectManager, soundManager, gameManager, camera, scene);
            } else {
                isSwinging = false;
                if (swordManager && swordManager.glowLight) {
                    setTimeout(() => {
                        if (swordManager && swordManager.glowLight) swordManager.glowLight.intensity = 0.5;
                    }, 100);
                }
            }
        });
        
        scene.add(controller);
        console.log('🎮 Controlador VR configurado correctamente');
    } else {
        console.warn('⏳ Esperando controlador VR...');
        setTimeout(setupController, 500);
    }
}

// ========== CAMBIAR ARMA CON STICK IZQUIERDO (VR) ==========
let lastWeaponChange = 0;
const weaponChangeCooldown = 300;
let stickCheckRunning = false;

function checkWeaponChangeFromStick() {
    if (stickCheckRunning) return;
    stickCheckRunning = true;
    
    function updateStick() {
        if (!isInVR) {
            stickCheckRunning = false;
            return;
        }
        
        try {
            const session = renderer.xr.getSession();
            if (!session) {
                requestAnimationFrame(updateStick);
                return;
            }
            
            for (let source of session.inputSources) {
                if (source.handedness === 'left' && source.gamepad) {
                    const axes = source.gamepad.axes;
                    const stickY = axes[1] || 0;
                    const now = Date.now();
                    
                    if (stickY > 0.7 && now - lastWeaponChange > weaponChangeCooldown) {
                        lastWeaponChange = now;
                        const weapons = ['sword', 'gun', 'bow'];
                        const currentIndex = weapons.indexOf(getCurrentWeapon());
                        const nextWeapon = weapons[(currentIndex + 1) % weapons.length];
                        switchWeapon(nextWeapon);
                        showVRWeaponChange(nextWeapon);
                        console.log(`🔄 Stick: Arma cambiada a: ${nextWeapon}`);
                    } else if (stickY < -0.7 && now - lastWeaponChange > weaponChangeCooldown) {
                        lastWeaponChange = now;
                        const weapons = ['sword', 'gun', 'bow'];
                        const currentIndex = weapons.indexOf(getCurrentWeapon());
                        const prevWeapon = weapons[(currentIndex - 1 + weapons.length) % weapons.length];
                        switchWeapon(prevWeapon);
                        showVRWeaponChange(prevWeapon);
                        console.log(`🔄 Stick: Arma cambiada a: ${prevWeapon}`);
                    }
                    break;
                }
            }
        } catch (err) {
            console.warn('Error en cambio de arma:', err);
        }
        
        requestAnimationFrame(updateStick);
    }
    
    updateStick();
}

// ========== NOTIFICACIÓN VISUAL DE CAMBIO DE ARMA (VR) ==========
function showVRWeaponChange(weapon) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffaa44';
    ctx.font = 'Bold 24px Arial';
    ctx.textAlign = 'center';
    
    let icon = '';
    let name = '';
    switch(weapon) {
        case 'sword': icon = '🗡️'; name = 'ESPADA'; break;
        case 'gun': icon = '🔫'; name = 'PISTOLA'; break;
        case 'bow': icon = '🏹'; name = 'ARCO'; break;
    }
    ctx.fillText(icon, canvas.width/2, 40);
    ctx.font = '20px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(name, canvas.width/2, 85);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.8, 0.4, 1);
    sprite.position.set(0, 1.5, -1);
    scene.add(sprite);
    setTimeout(() => scene.remove(sprite), 1500);
}

// ========== MOVIMIENTO VR ==========
let movementCheckRunning = false;

function setupVRMovement() {
    if (movementCheckRunning) return;
    movementCheckRunning = true;
    
    function updateMovementFromGamepad() {
        if (!isInVR) {
            movementCheckRunning = false;
            return;
        }
        
        try {
            const session = renderer.xr.getSession();
            if (!session) {
                requestAnimationFrame(updateMovementFromGamepad);
                return;
            }
            
            for (let source of session.inputSources) {
                if (source.handedness === 'left' && source.gamepad) {
                    const axes = source.gamepad.axes;
                    leftStickX = Math.abs(axes[0]) > 0.2 ? axes[0] : 0;
                    leftStickY = Math.abs(axes[1]) > 0.2 ? axes[1] : 0;
                    break;
                }
            }
        } catch (err) {
            console.warn('Error en gamepad:', err);
        }
        
        requestAnimationFrame(updateMovementFromGamepad);
    }
    updateMovementFromGamepad();
}

function applyVRMovement(deltaTime) {
    if (!isInVR) return;
    if (leftStickX === 0 && leftStickY === 0) return;
    
    const speed = 5 * deltaTime;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward);
    
    camera.position.x += (right.x * leftStickX + forward.x * leftStickY) * speed;
    camera.position.z += (right.z * leftStickX + forward.z * leftStickY) * speed;
    camera.position.x = Math.max(-15, Math.min(15, camera.position.x));
    camera.position.z = Math.max(-15, Math.min(15, camera.position.z));
}

function setupHandTracking() {
    const session = renderer.xr.getSession();
    if (!session) return;
    
    const handRight = renderer.xr.getHand(0);
    if (handRight) {
        rightHand = handRight;
        rightHand.addEventListener('pinchstart', () => {
            isSwinging = true;
            soundManager.playSlice('powerup');
            if (swordManager && swordManager.glowLight) {
                swordManager.glowLight.intensity = 1.5;
            }
        });
        rightHand.addEventListener('pinchend', () => {
            isSwinging = false;
            if (swordManager && swordManager.glowLight) {
                setTimeout(() => {
                    if (swordManager && swordManager.glowLight) swordManager.glowLight.intensity = 0.5;
                }, 100);
            }
        });
        scene.add(rightHand);
        console.log('🖐️ Mano derecha detectada');
    }
}

// ========== ACTUALIZAR ESPADA ==========
function updateSwordWithHand() {
    if (!gameRunning) return;
    
    let swordPos, swordRot;
    let swinging = false;
    const controller = renderer.xr.getController(0);
    
    if (isInVR && controller && controller.position && controller.position.length() > 0.1) {
        // Log para depuración (solo cada 60 frames para no saturar)
        if (Math.random() < 0.02) {
            console.log('📍 Posición controlador:', controller.position);
        }
        
        swordPos = controller.position.clone();
        const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion);
        const upDir = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(upDir, forwardDir);
        swordRot = quat;
        const offset = forwardDir.clone().multiplyScalar(0.2);
        swordPos.add(offset);
        swinging = isSwinging;
        
        if (swordManager && swordManager.swordGroup) {
            swordManager.swordGroup.visible = (getCurrentWeapon() === 'sword');
        }
        
        updateWeaponModel(getCurrentWeapon(), swordPos, swordRot, getIsCharging(), getBowCharge());
        
    } else if (gameMode === 'pc') {
        if (!mouseLocked) return;
        const forwardDir = new THREE.Vector3();
        camera.getWorldDirection(forwardDir);
        const rightDir = new THREE.Vector3();
        rightDir.crossVectors(new THREE.Vector3(0, 1, 0), forwardDir);
        swordPos = camera.position.clone();
        swordPos.add(forwardDir.clone().multiplyScalar(0.8));
        swordPos.add(rightDir.clone().multiplyScalar(0.2));
        swordPos.y -= 0.2;
        const quat = new THREE.Quaternion();
        const euler = new THREE.Euler(-0.2, mouseX, 0);
        quat.setFromEuler(euler);
        swordRot = quat;
        swinging = desktopSwinging;
        
        updateWeaponModel(getCurrentWeapon(), swordPos, swordRot, getIsCharging(), getBowCharge());
    } else {
        return;
    }
    
    swordManager.updateSword(swordPos, swordRot, swinging);
    const swordTip = swordManager.getSwordPosition();
    showDebugSlice(swordTip);
    
    if (!aimDot) {
        aimDot = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200 })
        );
        scene.add(aimDot);
    }
    aimDot.position.copy(swordTip);
    
    const result = fruitManager.checkSlice(swordTip, 1.5);
    if (result.count > 0) {
        const points = gameManager.addPoints(result.points, effectManager, swordTip, 'auto');
        if (result.points > 0) {
            effectManager.createSliceEffect(swordTip, 'fruit');
            soundManager.playSlice('fruit');
            if (aimDot) aimDot.material.color.setHex(0x00ff00);
            setTimeout(() => { if (aimDot) aimDot.material.color.setHex(0xff3300); }, 100);
        } else if (result.points < 0) {
            effectManager.createSliceEffect(swordTip, 'bomb');
            soundManager.playSlice('bomb');
            if (aimDot) aimDot.material.color.setHex(0x0000ff);
            setTimeout(() => { if (aimDot) aimDot.material.color.setHex(0xff3300); }, 100);
        }
    }
    
    const collected = powerUpManager.checkCollection(swordTip, 1.2);
    if (collected.length > 0) {
        collected.forEach(p => {
            const effect = powerUpManager.activateEffect(p, gameManager, fruitManager, swordManager);
            soundManager.playPowerUp();
            effectManager.createSliceEffect(swordTip, 'star');
            showPowerUpNotification(effect);
        });
    }
}

function showPowerUpNotification(effect) {
    const notification = document.createElement('div');
    notification.textContent = `${effect.icon} ${effect.effect} x${effect.duration}s!`;
    notification.style.cssText = 'position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);color:#ffaa44;padding:15px 30px;border-radius:30px;font-size:24px;font-weight:bold;z-index:1000;pointer-events:none;font-family:monospace;border:2px solid ' + effect.color + ';box-shadow:0 0 20px ' + effect.color;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// ========== MODO PC ==========
let desktopSwinging = false;
let mouseLocked = false;
let mouseX = 0, mouseY = 0;
const keyState = {};

function setupDesktopControls() {
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    document.addEventListener('click', () => {
        if (!isInVR && gameMode === 'pc' && !mouseLocked) {
            try {
                renderer.domElement.requestPointerLock();
            } catch (err) {
                console.log('Error al bloquear mouse:', err);
            }
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        mouseLocked = document.pointerLockElement === renderer.domElement;
        console.log('Mouse locked:', mouseLocked);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (mouseLocked && gameMode === 'pc') {
            mouseX += e.movementX * 0.002;
            mouseY += e.movementY * 0.002;
            camera.rotation.order = 'YXZ';
            camera.rotation.y = mouseX;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
        }
    });
    
    document.addEventListener('mousedown', (e) => {
        if (gameMode !== 'pc') return;
        
        if (e.button === 2) {
            e.preventDefault();
            if (getCurrentWeapon() === 'gun') {
                shootGun(fruitManager, effectManager, soundManager, gameManager, camera, scene);
            }
            return false;
        }
        
        if (e.button === 0) {
            if (getCurrentWeapon() === 'sword') {
                desktopSwinging = true;
            } else if (getCurrentWeapon() === 'bow') {
                startBowCharge();
            }
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (gameMode !== 'pc') return;
        
        if (e.button === 0) {
            if (getCurrentWeapon() === 'sword') {
                desktopSwinging = false;
            } else if (getCurrentWeapon() === 'bow') {
                releaseBow(fruitManager, effectManager, soundManager, gameManager, camera, scene);
            }
        }
    });
    
    window.addEventListener('keydown', (e) => keyState[e.key] = true);
    window.addEventListener('keyup', (e) => keyState[e.key] = false);
}

function updateMovement(deltaTime) {
    if (gameMode !== 'pc') return;
    if (!mouseLocked) return;
    
    const speed = 5 * deltaTime;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward);
    
    if (keyState['w'] || keyState['W']) camera.position.addScaledVector(forward, speed);
    if (keyState['s'] || keyState['S']) camera.position.addScaledVector(forward, -speed);
    if (keyState['a'] || keyState['A']) camera.position.addScaledVector(right, speed);
    if (keyState['d'] || keyState['D']) camera.position.addScaledVector(right, -speed);
}

function updateInstructions() {
    const instructionsEl = document.getElementById('instructions');
    if (!instructionsEl) return;
    
    if (gameMode === 'vr' && isInVR) {
        instructionsEl.innerHTML = '⚔️ STICK ARRIBA/ABAJO cambia arma | 🗡️ Espada (corte auto) | 🔫 Pistola (gatillo) | 🏹 Arco (mantener gatillo)';
        instructionsEl.style.background = 'rgba(0,0,0,0.8)';
        instructionsEl.style.color = '#ffaa44';
    } else if (gameMode === 'pc') {
        instructionsEl.innerHTML = '🗡️ ESPADA: click izq + mover | 🔫 PISTOLA: click derecho | 🏹 ARCO: mantener click izq | 🔄 Cambia arma abajo derecha';
        instructionsEl.style.background = 'rgba(0,0,0,0.5)';
        instructionsEl.style.color = '#aaa';
    }
}

// ========== BOTONES ==========
const volumeButton = document.createElement('button');
volumeButton.textContent = '🔊 SONIDO ON';
volumeButton.style.cssText = 'position:absolute;bottom:20px;left:20px;padding:10px 20px;background:#333;color:white;border:none;border-radius:8px;cursor:pointer;z-index:100;font-size:14px;font-weight:bold';
volumeButton.onclick = () => {
    const enabled = soundManager.toggle();
    volumeButton.textContent = enabled ? '🔊 SONIDO ON' : '🔇 SONIDO OFF';
    volumeButton.style.background = enabled ? '#333' : '#633';
};
document.body.appendChild(volumeButton);

const voiceButton = document.createElement('button');
voiceButton.textContent = '🗣️ VOZ ON';
voiceButton.style.cssText = 'position:absolute;bottom:80px;left:20px;padding:10px 20px;background:#333;color:white;border:none;border-radius:8px;cursor:pointer;z-index:100;font-size:14px;font-weight:bold';
voiceButton.onclick = () => {
    const enabled = soundManager.toggleVoice();
    voiceButton.textContent = enabled ? '🗣️ VOZ ON' : '🔇 VOZ OFF';
    voiceButton.style.background = enabled ? '#333' : '#633';
};
document.body.appendChild(voiceButton);

const vrButton = document.createElement('button');
vrButton.id = 'vrButton';
vrButton.textContent = '🔮 ENTER VR';
vrButton.style.cssText = 'position:absolute;bottom:20px;right:20px;padding:15px 30px;background:#ff4400;color:white;border:none;border-radius:8px;cursor:pointer;z-index:100;font-size:18px;font-weight:bold;display:none';
document.body.appendChild(vrButton);

vrButton.onclick = async () => {
    try {
        if (renderer.xr.isPresenting) {
            await renderer.xr.getSession()?.end();
            vrButton.textContent = '🔮 ENTER VR';
            vrButton.style.background = '#ff4400';
            isInVR = false;
            handTrackingAvailable = false;
            updateInstructions();
        } else {
            const session = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor']
            });
            
            await renderer.xr.setSession(session);
            vrButton.textContent = '⬅️ SALIR VR';
            vrButton.style.background = '#ff6688';
            isInVR = true;
            soundManager.resume();
            
            setTimeout(() => {
                setupController();
                setupVRMovement();
                setupHandTracking();
                ensureSwordIsVisible();
                updateInstructions();
            }, 500);
            
            hideDesktopUI();
            console.log('🥽 Modo VR activado');
        }
    } catch (err) {
        console.error('Error VR:', err);
        
        let errorMsg = 'Error al entrar a VR.\n\n';
        if (err.message.includes('reference space')) {
            errorMsg += 'SOLUCIÓN:\n1. Cierra el navegador en las gafas\n2. Borra caché\n3. Reinicia las gafas';
        } else {
            errorMsg += err.message;
        }
        alert(errorMsg);
    }
};

// ========== UI VR ==========
let vrUI = null;
function createVRUI() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.scale.set(1.5, 0.75, 1);
    sprite.position.set(0, 1.8, -1.2);
    scene.add(sprite);
    function updateVRUI(score, combo) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'Bold 48px Arial';
        ctx.fillStyle = '#ffaa44';
        ctx.textAlign = 'center';
        ctx.fillText(`🍎 ${Math.floor(score)}`, canvas.width/2, 70);
        ctx.font = '32px Arial';
        ctx.fillStyle = combo >= 3 ? '#ff66ff' : '#ffaa44';
        ctx.fillText(`🔥 x${combo.toFixed(1)}`, canvas.width/2, 140);
        texture.needsUpdate = true;
    }
    return { updateVRUI, sprite };
}

renderer.xr.addEventListener('sessionstart', () => {
    isInVR = true;
    hideDesktopUI();
    ensureSwordIsVisible();
    soundManager.resume();
    vrUI = createVRUI();
    soundManager.startBackgroundMusic();
    console.log('🥽 Sesión VR iniciada - Busca el PUNTO ROJO en la espada');
});

renderer.xr.addEventListener('sessionend', () => {
    isInVR = false;
    handTrackingAvailable = false;
    rightHand = null;
    leftHand = null;
    if (vrUI) scene.remove(vrUI.sprite);
    vrUI = null;
    showDesktopUI();
    updateInstructions();
    console.log('🖥️ Sesión VR terminada');
});

const originalUpdateUI = updateUI;
updateUI = function(score, lastPoints) {
    originalUpdateUI(score, lastPoints);
    if (vrUI) vrUI.updateVRUI(score, gameManager.combo);
};

const originalUpdateCombo = updateCombo;
updateCombo = function(combo) {
    originalUpdateCombo(combo);
    if (vrUI && gameManager) vrUI.updateVRUI(gameManager.score, combo);
};

// ========== INICIALIZAR ==========
setupDesktopControls();
ensureSwordIsVisible();
setupMenu();
createWeaponUI();
setupWeaponControls(fruitManager, effectManager, soundManager, gameManager, camera, scene);

// ========== LOOP PRINCIPAL ==========
let lastTime = 0;

function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    if (gameRunning) {
        if (gameMode === 'pc') updateMovement(delta);
        applyVRMovement(delta);
        updateSwordWithHand();

        updateProjectiles(delta, fruitManager, effectManager, soundManager, gameManager, scene);
        updateBowChargeUI(delta);
        updateGunCooldown(delta);
        handleVRWeapons(fruitManager, effectManager, soundManager, gameManager, camera, scene, isSwinging, isInVR, renderer);
        
        fruitManager.update(delta);
        effectManager.update(delta);
        gameManager.updateTimer(delta);
        powerUpManager.update(delta);
        
        if (particles) particles.rotation.y += 0.002;
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

console.log('⚔️ SLICE MASTER VR - Con ARMAS!');
console.log('🗡️ ESPADA | 🔫 PISTOLA | 🏹 ARCO');
console.log('🎮 En VR: Stick arriba/abajo cambia de arma');
console.log('🔍 Depuración: Mira la consola (chrome://inspect) para ver logs');
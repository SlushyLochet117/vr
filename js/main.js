import * as THREE from 'three';
import { createFruitScene } from './scene.js';
import { SwordManager } from './sword.js';
import { FruitManager } from './fruits.js';
import { EffectManager } from './effects.js';
import { GameManager } from './gameplay.js';
import { PowerUpManager } from './powerups.js';
import { SoundManager } from './soundManager.js';

// ========== RENDERER ==========
const renderer = new THREE.WebGLRenderer({ antialias: true, xrCompatible: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // DESACTIVADO para mejor rendimiento
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

// ========== VARIABLES ==========
let isSwinging = false;
let isInVR = false;
let gameMode = null;
let gameRunning = false;
let lastCombo = 1;

// Variables para PC
let desktopSwinging = false;
let mouseLocked = false;
let mouseX = 0, mouseY = 0;
const keyState = {};

// ========== UI ==========
function updateUI(score, lastPoints) {
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.innerHTML = Math.floor(score);
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
    if (comboFill) comboFill.style.width = `${(combo / 5) * 100}%`;
}

function updateFruitCounter(count) {
    const fruitCountSpan = document.getElementById('fruit-count');
    if (fruitCountSpan) fruitCountSpan.textContent = count;
}

const originalUpdateFruitCounter = fruitManager.updateFruitCounter;
fruitManager.updateFruitCounter = function() {
    originalUpdateFruitCounter.call(fruitManager);
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

// ========== MENÚ ==========
function hideMenu() {
    const menu = document.getElementById('startMenu');
    const gameUI = document.getElementById('gameUI');
    if (menu) {
        menu.style.opacity = '0';
        setTimeout(() => { menu.style.display = 'none'; }, 500);
    }
    if (gameUI) gameUI.style.display = 'block';
}

function startGame() {
    gameRunning = true;
    soundManager.init();
    soundManager.startBackgroundMusic();
    for (let i = 0; i < 8; i++) fruitManager.spawnFruitOrBomb();
    console.log('🎮 Juego iniciado');
}

function startVRMode() {
    gameMode = 'vr';
    hideMenu();
    startGame();
    setTimeout(() => {
        const vrBtn = document.getElementById('vrButton');
        if (vrBtn && !renderer.xr.isPresenting) vrBtn.click();
    }, 500);
    console.log('🎮 Modo VR');
}

function startPCMode() {
    gameMode = 'pc';
    hideMenu();
    startGame();
    setTimeout(() => {
        const instructions = document.getElementById('instructions');
        if (instructions) instructions.innerHTML = '🖱️ CLICK para activar | W/A/S/D mover';
    }, 1000);
    console.log('🖥️ Modo PC');
}

function setupMenu() {
    const playVRBtn = document.getElementById('playVRBtn');
    const playPCBtn = document.getElementById('playPCBtn');
    const instructionsBtn = document.getElementById('instructionsBtn');
    const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
    const instructionsPanel = document.getElementById('instructionsPanel');
    
    if (playVRBtn) playVRBtn.addEventListener('click', startVRMode);
    if (playPCBtn) playPCBtn.addEventListener('click', startPCMode);
    if (instructionsBtn && instructionsPanel) {
        instructionsBtn.addEventListener('click', () => instructionsPanel.classList.toggle('show'));
    }
    if (closeInstructionsBtn && instructionsPanel) {
        closeInstructionsBtn.addEventListener('click', () => instructionsPanel.classList.remove('show'));
    }
}

// ========== CONTROLADOR VR (SIMPLIFICADO) ==========
function setupController() {
    const controller = renderer.xr.getController(0);
    if (controller) {
        console.log('✅ Controlador VR listo');
        controller.addEventListener('selectstart', () => {
            console.log('🎮 GATILLO');
            isSwinging = true;
        });
        controller.addEventListener('selectend', () => {
            isSwinging = false;
        });
        scene.add(controller);
    } else {
        setTimeout(setupController, 500);
    }
}

// ========== MOVIMIENTO VR ==========
let leftStickX = 0, leftStickY = 0;

function setupVRMovement() {
    function updateGamepad() {
        if (!isInVR) return;
        const session = renderer.xr.getSession();
        if (!session) return;
        for (let source of session.inputSources) {
            if (source.handedness === 'left' && source.gamepad) {
                const axes = source.gamepad.axes;
                leftStickX = Math.abs(axes[0]) > 0.2 ? axes[0] : 0;
                leftStickY = Math.abs(axes[1]) > 0.2 ? axes[1] : 0;
                break;
            }
        }
        requestAnimationFrame(updateGamepad);
    }
    updateGamepad();
}

function applyVRMovement(deltaTime) {
    if (!isInVR || (leftStickX === 0 && leftStickY === 0)) return;
    const speed = 5 * deltaTime;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward);
    camera.position.x += (right.x * leftStickX + forward.x * leftStickY) * speed;
    camera.position.z += (right.z * leftStickX + forward.z * leftStickY) * speed;
}

// ========== ACTUALIZAR ESPADA ==========
let aimDot = null;
let debugSphere = null;

function showDebugSlice(position) {
    if (!debugSphere) {
        debugSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 })
        );
        scene.add(debugSphere);
    }
    debugSphere.position.copy(position);
}

function updateSword() {
    if (!gameRunning) return;
    
    const controller = renderer.xr.getController(0);
    let swordPos, swordRot;
    let swinging = false;
    
    if (isInVR && controller && controller.position) {
        swordPos = controller.position.clone();
        const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(controller.quaternion);
        const upDir = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(upDir, forwardDir);
        swordRot = quat;
        const offset = forwardDir.clone().multiplyScalar(0.2);
        swordPos.add(offset);
        swinging = isSwinging;
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
        const euler = new THREE.Euler(-0.2, mouseX, 0);
        swordRot = new THREE.Quaternion().setFromEuler(euler);
        swinging = desktopSwinging;
    } else {
        return;
    }
    
    swordManager.updateSword(swordPos, swordRot, swinging);
    const swordTip = swordManager.getSwordPosition();
    showDebugSlice(swordTip);
    
    if (!aimDot) {
        aimDot = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200 })
        );
        scene.add(aimDot);
    }
    aimDot.position.copy(swordTip);
    
    // Corte automático
    const result = fruitManager.checkSlice(swordTip, 1.2);
    if (result.count > 0) {
        const points = gameManager.addPoints(result.points, effectManager, swordTip, 'auto');
        if (result.points > 0) {
            effectManager.createSliceEffect(swordTip, 'fruit');
            soundManager.playSlice('fruit');
            aimDot.material.color.setHex(0x00ff00);
            setTimeout(() => { if (aimDot) aimDot.material.color.setHex(0xff3300); }, 100);
        } else if (result.points < 0) {
            effectManager.createSliceEffect(swordTip, 'bomb');
            soundManager.playSlice('bomb');
            aimDot.material.color.setHex(0x0000ff);
            setTimeout(() => { if (aimDot) aimDot.material.color.setHex(0xff3300); }, 100);
        }
    }
    
    // Power-ups
    const collected = powerUpManager.checkCollection(swordTip, 1.0);
    if (collected.length > 0) {
        collected.forEach(p => {
            const effect = powerUpManager.activateEffect(p, gameManager, fruitManager, swordManager);
            soundManager.playPowerUp();
            effectManager.createSliceEffect(swordTip, 'star');
        });
    }
}

// ========== CONTROLES PC ==========
function setupDesktopControls() {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('click', () => {
        if (!isInVR && gameMode === 'pc' && !mouseLocked) {
            renderer.domElement.requestPointerLock();
        }
    });
    document.addEventListener('pointerlockchange', () => {
        mouseLocked = document.pointerLockElement === renderer.domElement;
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
        if (gameMode === 'pc' && e.button === 0) desktopSwinging = true;
    });
    document.addEventListener('mouseup', (e) => {
        if (gameMode === 'pc' && e.button === 0) desktopSwinging = false;
    });
    window.addEventListener('keydown', (e) => keyState[e.key] = true);
    window.addEventListener('keyup', (e) => keyState[e.key] = false);
}

function updateMovement(deltaTime) {
    if (gameMode !== 'pc' || !mouseLocked) return;
    const speed = 5 * deltaTime;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward);
    if (keyState['w']) camera.position.addScaledVector(forward, speed);
    if (keyState['s']) camera.position.addScaledVector(forward, -speed);
    if (keyState['a']) camera.position.addScaledVector(right, speed);
    if (keyState['d']) camera.position.addScaledVector(right, -speed);
}

function updateInstructions() {
    const el = document.getElementById('instructions');
    if (!el) return;
    if (gameMode === 'vr' && isInVR) {
        el.innerHTML = '🗡️ ESPADA: acerca el punto ROJO a las frutas | 🎮 Gatillo opcional';
        el.style.background = 'rgba(0,0,0,0.8)';
        el.style.color = '#ffaa44';
    } else if (gameMode === 'pc') {
        el.innerHTML = '🗡️ CLICK + mover mouse = cortar | W/A/S/D mover';
        el.style.background = 'rgba(0,0,0,0.5)';
        el.style.color = '#aaa';
    }
}

// ========== BOTONES ==========
const volumeBtn = document.createElement('button');
volumeBtn.textContent = '🔊 SONIDO ON';
volumeBtn.style.cssText = 'position:absolute;bottom:20px;left:20px;padding:10px 20px;background:#333;color:white;border:none;border-radius:8px;cursor:pointer;z-index:100';
volumeBtn.onclick = () => {
    const enabled = soundManager.toggle();
    volumeBtn.textContent = enabled ? '🔊 SONIDO ON' : '🔇 SONIDO OFF';
    volumeBtn.style.background = enabled ? '#333' : '#633';
};
document.body.appendChild(volumeBtn);

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
                updateInstructions();
            }, 500);
            hideDesktopUI();
            console.log('🥽 VR activado');
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Error: ' + err.message);
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
    soundManager.resume();
    vrUI = createVRUI();
    soundManager.startBackgroundMusic();
    console.log('🥽 VR iniciada');
});

renderer.xr.addEventListener('sessionend', () => {
    isInVR = false;
    if (vrUI) scene.remove(vrUI.sprite);
    vrUI = null;
    showDesktopUI();
    updateInstructions();
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
setupMenu();

// ========== LOOP PRINCIPAL ==========
let lastTime = 0;

function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    if (gameRunning) {
        if (gameMode === 'pc') updateMovement(delta);
        applyVRMovement(delta);
        updateSword();
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

console.log('⚔️ SLICE MASTER VR - Versión simplificada');
console.log('🎯 Busca el PUNTO ROJO, acércalo a las frutas para cortar');
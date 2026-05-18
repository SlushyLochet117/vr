import * as THREE from 'three';
import { createFruitScene } from './scene.js';
import { SwordManager } from './sword.js';
import { FruitManager } from './fruits.js';
import { EffectManager } from './effects.js';
import { GameManager } from './gameplay.js';
import { PowerUpManager } from './powerups.js';
import { SoundManager } from './soundManager.js';

// ========== RENDERER ==========
const renderer = new THREE.WebGLRenderer({ antialias: true });
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

// Inicializar sonidos
soundManager.init();

// ========== VARIABLES ==========
let rightHand = null;
let leftHand = null;
let isSwinging = false;
let isInVR = false;
let handTrackingAvailable = false;
let lastCombo = 1;
let swordObject = null;
let debugSphere = null;
let aimDot = null;

// ========== VARIABLES PARA JOYSTICK ==========
let leftStickX = 0, leftStickY = 0;

// ========== UI ==========
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

// ========== DEBUG: Mostrar zona de corte ==========
function showDebugSlice(position) {
    if (!debugSphere) {
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
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

// ========== CREAR ESPADA VISIBLE ==========
function ensureSwordIsVisible() {
    if (swordManager && swordManager.swordGroup) {
        swordObject = swordManager.swordGroup;
        swordObject.visible = true;
        console.log('🗡️ Espada visible y lista para usar');
    }
}

// ========== CONFIGURAR CONTROLADOR ==========
function setupController() {
    const controller = renderer.xr.getController(0);
    if (controller) {
        controller.removeAllListeners();
        controller.addEventListener('selectstart', () => {
            isSwinging = true;
            console.log('🎮 GATILLO - Espada activada!');
            soundManager.playSlice('powerup');
            if (swordManager && swordManager.glowLight) {
                swordManager.glowLight.intensity = 1.5;
            }
        });
        controller.addEventListener('selectend', () => {
            isSwinging = false;
            console.log('🎮 GATILLO liberado');
            if (swordManager && swordManager.glowLight) {
                setTimeout(() => {
                    if (swordManager && swordManager.glowLight) swordManager.glowLight.intensity = 0.5;
                }, 100);
            }
        });
        scene.add(controller);
        console.log('🎮 Controlador derecho configurado');
    } else {
        console.warn('No se encontró controlador');
    }
}

// ========== MOVIMIENTO CON JOYSTICK ==========
function setupVRMovement() {
    function updateMovementFromGamepad() {
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
        
        requestAnimationFrame(updateMovementFromGamepad);
    }
    
    updateMovementFromGamepad();
    console.log('🎮 Joystick izquierdo configurado - Úsalo para moverte');
}

function applyVRMovement(deltaTime) {
    if (!isInVR) return;
    if (leftStickX === 0 && leftStickY === 0) return;
    
    const speed = 4 * deltaTime;
    
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward);
    
    camera.position.x += (right.x * leftStickX + forward.x * leftStickY) * speed;
    camera.position.z += (right.z * leftStickX + forward.z * leftStickY) * speed;
    
    // Limitar movimiento dentro del escenario
    camera.position.x = Math.max(-12, Math.min(12, camera.position.x));
    camera.position.z = Math.max(-12, Math.min(12, camera.position.z));
}

// ========== CONFIGURAR HAND TRACKING ==========
function setupHandTracking() {
    const session = renderer.xr.getSession();
    if (!session) return;
    
    const handRight = renderer.xr.getHand(0);
    const handLeft = renderer.xr.getHand(1);
    
    if (handRight) {
        rightHand = handRight;
        rightHand.addEventListener('pinchstart', () => {
            isSwinging = true;
            console.log('🤏 PINCH - Espada activada!');
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
    
    if (handLeft) {
        leftHand = handLeft;
        scene.add(leftHand);
        console.log('🖐️ Mano izquierda detectada');
    }
}

// ========== ACTUALIZAR ESPADA ==========
function updateSwordWithHand() {
    let swordPos, swordRot;
    let swinging = false;
    
    const controller = renderer.xr.getController(0);
    
    if (isInVR && controller && controller.position && controller.position.length() > 0.1) {
        // MODO CONTROLADOR
        swordPos = controller.position.clone();
        swordRot = controller.quaternion.clone();
        swinging = isSwinging;
        
        // Espada MÁS LARGA (Z = 0.8)
        const forward = new THREE.Vector3(0, 0.1, 0.8).applyQuaternion(swordRot);
        swordPos.add(forward);
        
        if (swordManager && swordManager.swordGroup) {
            swordManager.swordGroup.visible = true;
        }
    } 
    else if (isInVR && rightHand) {
        // MODO MANOS
        const wristJoint = rightHand.joints['wrist'];
        if (wristJoint && wristJoint.position) {
            swordPos = wristJoint.position.clone();
            swordRot = wristJoint.quaternion.clone();
            swinging = isSwinging;
            const forward = new THREE.Vector3(0, 0.15, 0.4).applyQuaternion(swordRot);
            swordPos.add(forward);
        } else {
            swordPos = rightHand.position.clone();
            swordRot = rightHand.quaternion.clone();
            swinging = isSwinging;
        }
        if (swordManager && swordManager.swordGroup) {
            swordManager.swordGroup.visible = true;
        }
    } 
    else if (!isInVR) {
        // MODO PC
        if (typeof mouseX === 'undefined') return;
        const forwardDir = new THREE.Vector3();
        camera.getWorldDirection(forwardDir);
        swordPos = camera.position.clone().add(forwardDir.multiplyScalar(0.6));
        swordPos.y -= 0.2;
        const quat = new THREE.Quaternion();
        const euler = new THREE.Euler(-mouseY + 0.5, mouseX, 0, 'YXZ');
        quat.setFromEuler(euler);
        swordRot = quat;
        swinging = desktopSwinging;
    } else {
        return;
    }
    
    swordManager.updateSword(swordPos, swordRot, swinging);
    
    // PUNTA de la espada
    const swordTip = swordManager.getSwordPosition();
    
    // DEBUG: Mostrar punta
    showDebugSlice(swordTip);
    
    // PUNTO DE MIRA
    if (!aimDot) {
        const dotGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const dotMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200 });
        aimDot = new THREE.Mesh(dotGeo, dotMat);
        scene.add(aimDot);
    }
    aimDot.position.copy(swordTip);
    
    if (swinging) {
        if (swordManager && swordManager.glowLight) {
            swordManager.glowLight.intensity = 1.2;
        }
        
        // RADIO DE CORTE AUMENTADO (1.2)
        const result = fruitManager.checkSlice(swordTip, 1.2);
        
        if (result.count > 0) {
            console.log(`🎯 Corte! +${result.points} pts`);
            
            const points = gameManager.addPoints(result.points, effectManager, swordTip, 'slice');
            
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
        
        // POWER-UPS
        const collectedPowerups = powerUpManager.checkCollection(swordTip, 0.9);
        if (collectedPowerups.length > 0) {
            collectedPowerups.forEach(powerup => {
                const effect = powerUpManager.activateEffect(powerup, gameManager, fruitManager, swordManager);
                console.log(`⚡ Power-up: ${effect.icon}`);
                soundManager.playPowerUp();
                effectManager.createSliceEffect(swordTip, 'star');
                showPowerUpNotification(effect);
            });
        }
    }
}

// ========== NOTIFICACIÓN DE POWER-UP ==========
function showPowerUpNotification(effect) {
    const notification = document.createElement('div');
    notification.textContent = `${effect.icon} ${effect.effect} x${effect.duration}s!`;
    notification.style.position = 'absolute';
    notification.style.left = '50%';
    notification.style.top = '30%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.background = 'rgba(0,0,0,0.85)';
    notification.style.color = '#ffaa44';
    notification.style.padding = '15px 30px';
    notification.style.borderRadius = '30px';
    notification.style.fontSize = '24px';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '1000';
    notification.style.pointerEvents = 'none';
    notification.style.fontFamily = 'monospace';
    notification.style.border = `2px solid ${effect.color}`;
    notification.style.boxShadow = `0 0 20px ${effect.color}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// ========== MODO PC ==========
let desktopSwinging = false;
let mouseLocked = false;
let mouseX = 0, mouseY = 0;
const keyState = {};

function setupDesktopControls() {
    document.addEventListener('click', () => {
        if (!isInVR) {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        mouseLocked = document.pointerLockElement === renderer.domElement;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (mouseLocked && !isInVR) {
            mouseX += e.movementX * 0.002;
            mouseY += e.movementY * 0.002;
            camera.rotation.order = 'YXZ';
            camera.rotation.y = mouseX;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY));
        }
    });
    
    document.addEventListener('mousedown', (e) => {
        if (!isInVR && e.button === 0) desktopSwinging = true;
    });
    document.addEventListener('mouseup', (e) => {
        if (!isInVR && e.button === 0) desktopSwinging = false;
    });
    
    window.addEventListener('keydown', (e) => keyState[e.key] = true);
    window.addEventListener('keyup', (e) => keyState[e.key] = false);
}

function updateMovement(deltaTime) {
    if (isInVR) return;
    if (!mouseLocked) return;
    
    const speed = 4 * deltaTime;
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

// ========== ACTUALIZAR INSTRUCCIONES ==========
function updateInstructions() {
    const instructionsEl = document.getElementById('instructions');
    if (!instructionsEl) return;
    
    if (isInVR) {
        instructionsEl.innerHTML = '🗡️ ESPADA EN CONTROLADOR | 🎮 GATILLO para cortar | 🕹️ JOYSTICK IZQUIERDO para moverte | 🎯 Apunta con el PUNTO ROJO';
        instructionsEl.style.background = 'rgba(0,0,0,0.8)';
        instructionsEl.style.color = '#ffaa44';
    } else {
        instructionsEl.innerHTML = '🗡️ MODO PC | 🖱️ CLICK + arrastrar = cortar | W/A/S/D = moverte | 🎯 Apunta con el punto rojo';
        instructionsEl.style.background = 'rgba(0,0,0,0.5)';
        instructionsEl.style.color = '#aaa';
    }
}

// ========== BOTÓN DE VOLUMEN ==========
const volumeButton = document.createElement('button');
volumeButton.textContent = '🔊 SONIDO ON';
volumeButton.style.position = 'absolute';
volumeButton.style.bottom = '20px';
volumeButton.style.left = '20px';
volumeButton.style.padding = '10px 20px';
volumeButton.style.background = '#333';
volumeButton.style.color = 'white';
volumeButton.style.border = 'none';
volumeButton.style.borderRadius = '8px';
volumeButton.style.cursor = 'pointer';
volumeButton.style.zIndex = '100';
volumeButton.style.fontSize = '14px';
volumeButton.style.fontWeight = 'bold';
document.body.appendChild(volumeButton);

let soundEnabled = true;
volumeButton.onclick = () => {
    soundEnabled = soundManager.toggle();
    volumeButton.textContent = soundEnabled ? '🔊 SONIDO ON' : '🔇 SONIDO OFF';
    volumeButton.style.background = soundEnabled ? '#333' : '#633';
};

// ========== BOTÓN VR ==========
const vrButton = document.createElement('button');
vrButton.textContent = '🔮 ENTER VR';
vrButton.style.position = 'absolute';
vrButton.style.bottom = '20px';
vrButton.style.right = '20px';
vrButton.style.padding = '15px 30px';
vrButton.style.background = '#ff4400';
vrButton.style.color = 'white';
vrButton.style.border = 'none';
vrButton.style.borderRadius = '8px';
vrButton.style.cursor = 'pointer';
vrButton.style.zIndex = '100';
vrButton.style.fontSize = '18px';
vrButton.style.fontWeight = 'bold';
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
                optionalFeatures: ['local-floor']
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
            console.log('🥽 Modo VR - Espada larga + Joystick para moverte');
        }
    } catch (err) {
        console.error('Error VR:', err);
        alert('Error al entrar a VR');
    }
};

// ========== UI EN 3D PARA VR ==========
let vrUI = null;

function createVRUI() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
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

// ========== EVENTOS DE SESIÓN VR ==========
renderer.xr.addEventListener('sessionstart', () => {
    isInVR = true;
    hideDesktopUI();
    ensureSwordIsVisible();
    soundManager.resume();
    vrUI = createVRUI();
    console.log('🥽 Sesión VR iniciada');
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

// Actualizar UI VR
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

// ========== LOOP PRINCIPAL ==========
let lastTime = 0;

function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    updateMovement(delta);
    applyVRMovement(delta);
    updateSwordWithHand();
    fruitManager.update(delta);
    effectManager.update(delta);
    gameManager.updateTimer(delta);
    powerUpManager.update(delta);
    
    if (Math.floor(now / 1000) !== Math.floor(lastTime / 1000)) {
        updateInstructions();
    }
    
    if (particles) {
        particles.rotation.y += 0.002;
    }
    
    renderer.render(scene, camera);
    renderer.setAnimationLoop(animate);
}

animate();

console.log('⚔️ SLICE MASTER VR - CORREGIDO!');
console.log('🗡️ Espada larga + Radio de corte aumentado');
console.log('🎮 Joystick izquierdo para moverte');
console.log('🎯 Apunta con el PUNTO ROJO y presiona GATILLO');
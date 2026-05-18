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

// ========== VARIABLES DE MANOS ==========
let rightHand = null;
let leftHand = null;
let isSwinging = false;
let isInVR = false;
let handTrackingAvailable = false;
let lastCombo = 1;

// Referencia al objeto espada para poder verla
let swordObject = null;

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
        
        // Reproducir sonido de combo cuando aumenta
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

// ========== CREAR ESPADA VISIBLE ==========
function ensureSwordIsVisible() {
    if (swordManager && swordManager.swordGroup) {
        swordObject = swordManager.swordGroup;
        swordObject.visible = true;
        console.log('🗡️ Espada visible y lista para usar');
    }
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
                setTimeout(() => {
                    if (swordManager && swordManager.glowLight) swordManager.glowLight.intensity = 0.5;
                }, 200);
            }
            
            if (rightHand.hapticActuators && rightHand.hapticActuators[0]) {
                rightHand.hapticActuators[0].playEffect('dual-rumble', {
                    duration: 50,
                    strongMagnitude: 0.3,
                    weakMagnitude: 0.2
                }).catch(() => {});
            }
        });
        
        rightHand.addEventListener('pinchend', () => {
            isSwinging = false;
        });
        
        scene.add(rightHand);
        console.log('🖐️ Mano DERECHA detectada - La espada está en tu mano!');
    } else {
        console.warn('No se detectó mano derecha - Usando controlador normal');
        setupControllerFallback();
    }
    
    if (handLeft) {
        leftHand = handLeft;
        scene.add(leftHand);
        console.log('🖐️ Mano IZQUIERDA detectada');
    }
    
    ensureSwordIsVisible();
}

function setupControllerFallback() {
    const controller = renderer.xr.getController(0);
    if (controller) {
        controller.addEventListener('selectstart', () => {
            isSwinging = true;
            soundManager.playSlice('powerup');
            if (swordManager && swordManager.glowLight) {
                swordManager.glowLight.intensity = 1.5;
                setTimeout(() => {
                    if (swordManager && swordManager.glowLight) swordManager.glowLight.intensity = 0.5;
                }, 200);
            }
        });
        controller.addEventListener('selectend', () => {
            isSwinging = false;
        });
        scene.add(controller);
        console.log('🎮 Fallback: Usando controlador normal');
    }
}

// ========== ACTUALIZAR ESPADA ==========
function updateSwordWithHand() {
    let swordPos, swordRot;
    let swinging = false;
    
    if (isInVR && rightHand) {
        const wristJoint = rightHand.joints['wrist'];
        
        if (wristJoint && wristJoint.position) {
            swordPos = wristJoint.position.clone();
            swordRot = wristJoint.quaternion.clone();
            swinging = isSwinging;
            
            const forward = new THREE.Vector3(0, 0.15, 0.12).applyQuaternion(swordRot);
            swordPos.add(forward);
        } else {
            swordPos = rightHand.position.clone();
            swordRot = rightHand.quaternion.clone();
            swinging = isSwinging;
        }
        
        if (swordManager && swordManager.swordGroup) {
            swordManager.swordGroup.visible = true;
        }
        
    } else if (isInVR && !rightHand) {
        const controller = renderer.xr.getController(0);
        if (controller && controller.position) {
            swordPos = controller.position.clone();
            swordRot = controller.quaternion.clone();
            swinging = isSwinging;
        } else {
            return;
        }
    } else {
        if (typeof mouseX === 'undefined') return;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        swordPos = camera.position.clone().add(forward.multiplyScalar(0.6));
        swordPos.y -= 0.2;
        
        const quat = new THREE.Quaternion();
        const euler = new THREE.Euler(-mouseY + 0.5, mouseX, 0, 'YXZ');
        quat.setFromEuler(euler);
        swordRot = quat;
        swinging = desktopSwinging;
    }
    
    swordManager.updateSword(swordPos, swordRot, swinging);
    
    if (swinging) {
        const swordTip = swordManager.getSwordPosition();
        
        // ========== DETECTAR CORTES DE FRUTAS ==========
        const result = fruitManager.checkSlice(swordTip, 0.45);
        
        if (result.count > 0) {
            const points = gameManager.addPoints(result.points, effectManager, swordTip, 'slice');
            
            if (result.points > 0) {
                effectManager.createSliceEffect(swordTip, 'fruit');
                soundManager.playSlice('fruit');
                if (swordManager && swordManager.glowLight) {
                    swordManager.glowLight.intensity = 1.2;
                    setTimeout(() => {
                        if (swordManager && swordManager.glowLight) swordManager.glowLight.intensity = 0.5;
                    }, 100);
                }
            } else if (result.points < 0) {
                effectManager.createSliceEffect(swordTip, 'bomb');
                soundManager.playSlice('bomb');
                if (swordManager && swordManager.glowLight) {
                    swordManager.glowLight.intensity = 2.0;
                    swordManager.glowLight.color.setHex(0xff3300);
                    setTimeout(() => {
                        if (swordManager && swordManager.glowLight) {
                            swordManager.glowLight.intensity = 0.5;
                            swordManager.glowLight.color.setHex(0x44ffaa);
                        }
                    }, 200);
                }
            }
        }
        
        // ========== DETECTAR RECOLECCIÓN DE POWER-UPS ==========
        const collectedPowerups = powerUpManager.checkCollection(swordTip, 0.5);
        if (collectedPowerups.length > 0) {
            collectedPowerups.forEach(powerup => {
                const effect = powerUpManager.activateEffect(powerup, gameManager, fruitManager, swordManager);
                console.log(`⚡ Power-up: ${effect.icon} ${effect.effect} por ${effect.duration}s`);
                
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

// ========== SIMULACIÓN PARA MODO PC ==========
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
    
    if (isInVR && handTrackingAvailable) {
        instructionsEl.innerHTML = '🗡️ ESPADA EN TU MANO | 🤏 PINCH para cortar | ⚡ Corta estrellas para PODERES | 🍎 Frutas = puntos | 💣 Bombas = -puntos | 🔊 Sonidos incluidos!';
        instructionsEl.style.background = 'rgba(0,0,0,0.8)';
        instructionsEl.style.color = '#ffaa44';
    } else if (isInVR) {
        instructionsEl.innerHTML = '🗡️ ESPADA EN CONTROLADOR | 🎮 Gatillo para cortar | ⚡ Corta estrellas para PODERES | 🔊 Sonidos incluidos!';
        instructionsEl.style.background = 'rgba(0,0,0,0.8)';
        instructionsEl.style.color = '#ffaa44';
    } else {
        instructionsEl.innerHTML = '🗡️ MODO PC | 🖱️ CLICK + arrastrar = cortar | W/A/S/D = moverte | ⚡ Corta estrellas para PODERES | 🔊 Sonidos incluidos!';
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
volumeButton.style.fontFamily = 'monospace';
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
vrButton.style.fontFamily = 'monospace';
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
                optionalFeatures: ['local-floor', 'hand-tracking']
            });
            await renderer.xr.setSession(session);
            vrButton.textContent = '⬅️ SALIR VR';
            vrButton.style.background = '#ff6688';
            isInVR = true;
            handTrackingAvailable = true;
            
            // Reactivar sonido para VR
            soundManager.resume();
            
            setTimeout(() => {
                setupHandTracking();
                ensureSwordIsVisible();
                updateInstructions();
            }, 500);
            
            hideDesktopUI();
            console.log('🥽 Modo VR - 🗡️ Espada visible en tu mano derecha');
        }
    } catch (err) {
        console.error('Error VR:', err);
        alert('Error al entrar a VR.\n\nPara usar manos:\n1. Activa Hand Tracking en Ajustes del Quest\n2. Movimientos → Seguimiento manual');
    }
};

// ========== EVENTOS DE SESIÓN VR ==========
renderer.xr.addEventListener('sessionstart', () => {
    isInVR = true;
    hideDesktopUI();
    ensureSwordIsVisible();
    soundManager.resume();
    console.log('🥽 Sesión VR iniciada - 🗡️ Espada lista');
});

renderer.xr.addEventListener('sessionend', () => {
    isInVR = false;
    handTrackingAvailable = false;
    rightHand = null;
    leftHand = null;
    showDesktopUI();
    updateInstructions();
    console.log('🖥️ Sesión VR terminada');
});

// ========== INICIALIZAR ==========
setupDesktopControls();
ensureSwordIsVisible();

// Pequeña bienvenida con sonido
setTimeout(() => {
    console.log('🔊 Haz clic en la pantalla para activar el sonido!');
}, 1000);

// ========== LOOP PRINCIPAL ==========
let lastTime = 0;

function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    updateMovement(delta);
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

console.log('⚔️ SLICE MASTER VR - 🗡️ ESPADA VISIBLE EN TU MANO!');
console.log('🎮 En VR: La espada aparece en tu mano derecha');
console.log('🤏 Haz pinch (pellizco) para cortar frutas');
console.log('⚡ Corta las estrellas flotantes para activar POWER-UPS!');
console.log('🔊 Con sonidos incluidos - Botón de volumen en esquina inferior izquierda');
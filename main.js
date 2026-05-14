import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// ========== CONFIGURACIÓN INICIAL ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b1a);
scene.fog = new THREE.FogExp2(0x050b1a, 0.008);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// ========== ILUMINACIÓN ==========
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
dirLight.receiveShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x4466cc, 0.3);
fillLight.position.set(-2, 3, 4);
scene.add(fillLight);

const warmLight = new THREE.PointLight(0xffaa66, 0.2);
warmLight.position.set(0, -1, 0);
scene.add(warmLight);

// ========== ESCENARIO ==========
const gridHelper = new THREE.GridHelper(20, 20, 0x88aaff, 0x335588);
gridHelper.position.y = -0.5;
scene.add(gridHelper);

const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.6, metalness: 0.1 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.5;
floor.receiveShadow = true;
scene.add(floor);

// Plataforma OBJETIVO
const targetPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.2, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xffaa44, metalness: 0.8, roughness: 0.3, emissive: 0x442200 })
);
targetPlatform.position.set(2, -0.4, 2);
targetPlatform.castShadow = true;
targetPlatform.receiveShadow = true;
scene.add(targetPlatform);

const ringGeo = new THREE.TorusGeometry(0.9, 0.05, 32, 100);
const ringMat = new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0x442200 });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.1;
targetPlatform.add(ring);

// Partículas decorativas
const particleCount = 50;
const particles = [];
for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0xff4400 })
    );
    particle.userData = {
        angle: (i / particleCount) * Math.PI * 2,
        radius: 1.1,
        speed: 0.5 + Math.random() * 0.5
    };
    targetPlatform.add(particle);
    particles.push(particle);
}

// ========== CONTROLADORES VR ==========
let leftController, rightController;

const controllerModelFactory = new XRControllerModelFactory();

// Controlador izquierdo
leftController = renderer.xr.getController(0);
leftController.addEventListener('selectstart', onLeftTriggerStart);
leftController.addEventListener('selectend', onLeftTriggerEnd);
scene.add(leftController);

const leftModel = renderer.xr.getControllerGrip(0);
leftModel.add(controllerModelFactory.createControllerModel(leftModel));
scene.add(leftModel);

// Controlador derecho
rightController = renderer.xr.getController(1);
rightController.addEventListener('selectstart', onRightTriggerStart);
rightController.addEventListener('selectend', onRightTriggerEnd);
scene.add(rightController);

const rightModel = renderer.xr.getControllerGrip(1);
rightModel.add(controllerModelFactory.createControllerModel(rightModel));
scene.add(rightModel);

// ========== HERRAMIENTAS DEL JUGADOR ==========
// Imán (mano izquierda)
const magnetGroup = new THREE.Group();
const magnetBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xcc3333, metalness: 0.7, emissive: 0x330000 })
);
magnetBody.position.y = 0;
magnetGroup.add(magnetBody);
const magnetTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.12),
    new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x442222 })
);
magnetTip.position.y = 0.18;
magnetGroup.add(magnetTip);
const magnetGlow = new THREE.PointLight(0xff3333, 0.5, 1);
magnetTip.add(magnetGlow);
scene.add(magnetGroup);

// Repulsor (mano derecha)
const repulsorGroup = new THREE.Group();
const repulsorBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x33aaff, metalness: 0.8, emissive: 0x004466 })
);
repulsorBody.position.y = 0;
repulsorGroup.add(repulsorBody);
const repulsorTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x44ccff, emissive: 0x2288aa })
);
repulsorTip.position.y = 0.22;
repulsorGroup.add(repulsorTip);
const repulsorGlow = new THREE.PointLight(0x33aaff, 0.5, 1);
repulsorTip.add(repulsorGlow);
scene.add(repulsorGroup);

let magnetActive = false;
let repulsorActive = false;

// ========== SISTEMA DE TELETRANSPORTE ==========
let teleportActive = false;
let teleportReticle = null;
let teleportCooldown = false;

const reticleGeometry = new THREE.RingGeometry(0.3, 0.4, 16);
const reticleMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00aa00, side: THREE.DoubleSide });
teleportReticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
teleportReticle.rotation.x = -Math.PI / 2;
teleportReticle.visible = false;
scene.add(teleportReticle);

// Detectar stick izquierdo (simulado con evento de thumbstick)
// Nota: Los eventos exactos pueden variar, esta es una aproximación
leftController.addEventListener('selectstart', (event) => {
    // Si se presiona el grip (botón lateral) activar teletransporte
    if (event.data && event.data.button === 'grip') {
        teleportActive = true;
    }
});

leftController.addEventListener('selectend', (event) => {
    if (teleportActive && event.data && event.data.button === 'grip') {
        teleportActive = false;
        if (teleportReticle.visible && !teleportCooldown) {
            const targetPos = teleportReticle.position.clone();
            targetPos.y = 1.6;
            camera.position.copy(targetPos);
            teleportReticle.visible = false;
            teleportCooldown = true;
            setTimeout(() => { teleportCooldown = false; }, 500);
        }
    }
});

function updateTeleportReticle() {
    if (!teleportActive) return;
    
    const controllerDir = new THREE.Vector3(0, 0, -1).applyQuaternion(leftController.quaternion);
    const rayOrigin = leftController.position.clone();
    const rayDirection = controllerDir.normalize();
    
    const raycaster = new THREE.Raycaster(rayOrigin, rayDirection, 0, 5);
    const intersects = raycaster.intersectObject(floor);
    
    if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        teleportReticle.position.set(hitPoint.x, -0.48, hitPoint.z);
        teleportReticle.visible = true;
        teleportReticle.material.color.setHex(0x00ff00);
    } else {
        teleportReticle.visible = false;
    }
}

// ========== SISTEMA DE FÍSICA ==========
class PhysicsObject {
    constructor(mesh, mass = 1) {
        this.mesh = mesh;
        this.mass = mass;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.grounded = false;
        mesh.userData.physics = this;
    }
    
    update(deltaTime) {
        if (!this.grounded) {
            this.velocity.y -= 9.8 * deltaTime;
        }
        
        this.mesh.position.x += this.velocity.x * deltaTime;
        this.mesh.position.y += this.velocity.y * deltaTime;
        this.mesh.position.z += this.velocity.z * deltaTime;
        
        if (this.mesh.position.y - 0.3 <= -0.5) {
            this.mesh.position.y = -0.2;
            this.velocity.y = -this.velocity.y * 0.5;
            this.grounded = true;
            
            if (Math.abs(this.velocity.y) < 0.5) {
                this.velocity.y = 0;
                this.grounded = true;
            }
        } else {
            this.grounded = false;
        }
        
        this.velocity.x *= 0.99;
        this.velocity.z *= 0.99;
        
        if (this.velocity.length() > 15) {
            this.velocity.multiplyScalar(15 / this.velocity.length());
        }
    }
    
    applyForce(force) {
        this.velocity.x += force.x / this.mass;
        this.velocity.y += force.y / this.mass;
        this.velocity.z += force.z / this.mass;
    }
}

// ========== CREAR CUBOS ==========
const cubes = [];
const MAX_CUBES = 10;
let cubesPlaced = 0;
let score = 0;

function createCube(x, z, color = null) {
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffaa44, 0xff44ff, 0x44ffff];
    const finalColor = color || colors[Math.floor(Math.random() * colors.length)];
    
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: finalColor, roughness: 0.3, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 1, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    const edgesGeo = new THREE.EdgesGeometry(geometry);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    mesh.add(wireframe);
    
    scene.add(mesh);
    
    const physics = new PhysicsObject(mesh, 1);
    
    return { mesh, physics };
}

function spawnCubes() {
    for (let i = 0; i < MAX_CUBES; i++) {
        const angle = (i / MAX_CUBES) * Math.PI * 2;
        const radius = 2.5 + Math.random() * 1.5;
        const x = camera.position.x + Math.cos(angle + Math.random()) * radius;
        const z = camera.position.z + Math.sin(angle + Math.random()) * radius;
        const cube = createCube(x, z);
        cubes.push(cube);
    }
}

function checkTargetCollision() {
    for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];
        if (!cube || !cube.mesh.visible) continue;
        
        const cubePos = cube.mesh.position;
        const targetPos = targetPlatform.position;
        const halfSize = 0.75;
        
        if (Math.abs(cubePos.x - targetPos.x) < halfSize &&
            Math.abs(cubePos.z - targetPos.z) < halfSize &&
            cubePos.y - 0.25 < targetPos.y + 0.2) {
            
            cube.mesh.visible = false;
            cubesPlaced++;
            score = cubesPlaced;
            updateScore();
            
            createPlacementEffect(cube.mesh.position);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 2.5 + Math.random() * 1.5;
            const newX = camera.position.x + Math.cos(angle) * radius;
            const newZ = camera.position.z + Math.sin(angle) * radius;
            cube.mesh.position.set(newX, 1.5, newZ);
            cube.mesh.visible = true;
            cube.physics.velocity.set(0, 0, 0);
            cubesPlaced--;
        }
    }
}

function updateScore() {
    const scoreDiv = document.getElementById('score');
    if (scoreDiv) {
        scoreDiv.innerHTML = `Puntuación: ${score} / 10`;
        if (score >= 10) {
            scoreDiv.innerHTML += '<br>🎉 ¡COMPLETADO! 🎉';
        }
    }
}

function createPlacementEffect(position) {
    for (let i = 0; i < 20; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 4, 4),
            new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff4400 })
        );
        particle.position.copy(position);
        particle.userData = {
            life: 1,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            )
        };
        scene.add(particle);
        
        const animateParticle = () => {
            particle.userData.life -= 0.05;
            if (particle.userData.life <= 0) {
                scene.remove(particle);
                return;
            }
            particle.position.x += particle.userData.velocity.x * 0.05;
            particle.position.y += particle.userData.velocity.y * 0.05;
            particle.position.z += particle.userData.velocity.z * 0.05;
            particle.scale.setScalar(particle.userData.life);
            requestAnimationFrame(animateParticle);
        };
        animateParticle();
    }
}

// ========== FUNCIONES DE CONTROLADORES ==========
function onLeftTriggerStart() {
    magnetActive = true;
    magnetGlow.intensity = 1.5;
    magnetTip.material.emissiveIntensity = 0.5;
}

function onLeftTriggerEnd() {
    magnetActive = false;
    magnetGlow.intensity = 0.3;
    magnetTip.material.emissiveIntensity = 0;
}

function onRightTriggerStart() {
    repulsorActive = true;
    repulsorGlow.intensity = 1.5;
    repulsorTip.material.emissiveIntensity = 0.5;
}

function onRightTriggerEnd() {
    repulsorActive = false;
    repulsorGlow.intensity = 0.3;
    repulsorTip.material.emissiveIntensity = 0;
}

// ========== ACTUALIZAR HERRAMIENTAS ==========
function updateTools() {
    if (leftController) {
        magnetGroup.position.copy(leftController.position);
        magnetGroup.quaternion.copy(leftController.quaternion);
    }
    
    if (rightController) {
        repulsorGroup.position.copy(rightController.position);
        repulsorGroup.quaternion.copy(rightController.quaternion);
    }
}

// ========== APLICAR IMÁN Y REPULSOR ==========
function applyMagnetAndRepulsor() {
    if (!cubes.length) return;
    
    const magnetPos = magnetGroup.position;
    const repulsorPos = repulsorGroup.position;
    const magnetStrength = 8;
    const repulsorStrength = 12;
    const radius = 1.2;
    
    for (const cube of cubes) {
        if (!cube.mesh.visible) continue;
        
        const cubePos = cube.mesh.position;
        
        if (magnetActive) {
            const distance = magnetPos.distanceTo(cubePos);
            if (distance < radius) {
                const direction = new THREE.Vector3().subVectors(magnetPos, cubePos).normalize();
                const force = direction.multiplyScalar(magnetStrength * (1 - distance / radius));
                cube.physics.applyForce(force);
            }
        }
        
        if (repulsorActive) {
            const distance = repulsorPos.distanceTo(cubePos);
            if (distance < radius) {
                const direction = new THREE.Vector3().subVectors(cubePos, repulsorPos).normalize();
                const force = direction.multiplyScalar(repulsorStrength * (1 - distance / radius));
                cube.physics.applyForce(force);
            }
        }
    }
}

// ========== ANIMACIONES ==========
function animateParticles() {
    const time = Date.now() * 0.002;
    particles.forEach((particle, i) => {
        const data = particle.userData;
        const x = Math.cos(data.angle + time * data.speed) * data.radius;
        const z = Math.sin(data.angle + time * data.speed) * data.radius;
        particle.position.set(x, Math.sin(time * 2 + i) * 0.1, z);
    });
}

// ========== LOOP PRINCIPAL ==========
let lastTime = 0;

function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    
    for (const cube of cubes) {
        if (cube.mesh.visible) {
            cube.physics.update(delta);
        }
    }
    
    checkTargetCollision();
    updateTools();
    applyMagnetAndRepulsor();
    updateTeleportReticle();
    animateParticles();
    
    ring.rotation.z += 0.01;
    
    renderer.render(scene, camera);
    
    if (renderer.xr.isPresenting) {
        renderer.setAnimationLoop(animate);
    } else {
        requestAnimationFrame(animate);
    }
}

// ========== INICIALIZAR ==========
function init() {
    spawnCubes();
    updateScore();
    
    // === BOTÓN VR CORREGIDO ===
    // Crear botón manualmente para entrar a VR
    const vrButton = document.createElement('button');
    vrButton.textContent = '🔮 ENTER VR';
    vrButton.style.position = 'absolute';
    vrButton.style.bottom = '20px';
    vrButton.style.right = '20px';
    vrButton.style.padding = '12px 24px';
    vrButton.style.fontSize = '18px';
    vrButton.style.fontWeight = 'bold';
    vrButton.style.backgroundColor = '#ff4400';
    vrButton.style.color = 'white';
    vrButton.style.border = 'none';
    vrButton.style.borderRadius = '8px';
    vrButton.style.cursor = 'pointer';
    vrButton.style.zIndex = '100';
    vrButton.style.fontFamily = 'Arial, sans-serif';
    vrButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    
    vrButton.addEventListener('click', () => {
        renderer.xr.isPresenting ? 
            renderer.xr.getSession()?.end() : 
            renderer.xr.getSession()?.end();
        
        // Solicitar sesión VR
        navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor']
        }).then(session => {
            renderer.xr.setSession(session);
            vrButton.textContent = '⬅️ SALIR VR';
            vrButton.style.backgroundColor = '#ff6688';
        }).catch(err => {
            console.error('Error al entrar a VR:', err);
            alert('No se pudo entrar a VR. Asegúrate de estar en un navegador compatible (Meta Quest Browser)');
        });
    });
    
    document.body.appendChild(vrButton);
    
    // Detectar cuando se sale de VR para cambiar el texto del botón
    renderer.xr.addEventListener('sessionend', () => {
        vrButton.textContent = '🔮 ENTER VR';
        vrButton.style.backgroundColor = '#ff4400';
    });
    
    renderer.setAnimationLoop(animate);
    
    console.log('🎮 Gravity Grabber VR - Listo para Meta Quest 3');
    console.log('🔴 Imán: Disparador izquierdo');
    console.log('🔵 Repulsor: Disparador derecho');
    console.log('🟢 Teletransporte: Botón Grip izquierdo + apuntar');
}

init();
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// Estado del juego
let scene, camera, renderer;
let leftController, rightController;
let magnetGroup, repulsorGroup;
let magnetActive = false, repulsorActive = false;
let cubes = [];
let score = 0;
let targetPlatform;
let floor;

// Función para actualizar UI
function updateUI() {
    document.getElementById('score').innerHTML = `Puntuación: ${score} / 5`;
    if (score >= 5) {
        document.getElementById('score').innerHTML += '<br>🎉 ¡VICTORIA! 🎉';
    }
}

// Crear un cubo
function createCube(x, z) {
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffaa44, 0xff44ff];
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, 0.5, z);
    cube.castShadow = false;
    cube.receiveShadow = false;
    scene.add(cube);
    
    // Datos de física
    cube.userData = {
        velocity: new THREE.Vector3(0, 0, 0),
        grounded: false
    };
    
    return cube;
}

// Física simplificada
function updatePhysics(cube, deltaTime) {
    if (!cube.visible) return;
    
    // Gravedad
    if (!cube.userData.grounded) {
        cube.userData.velocity.y -= 9.8 * deltaTime;
    }
    
    // Mover
    cube.position.x += cube.userData.velocity.x * deltaTime;
    cube.position.y += cube.userData.velocity.y * deltaTime;
    cube.position.z += cube.userData.velocity.z * deltaTime;
    
    // Suelo
    if (cube.position.y - 0.25 <= -0.5) {
        cube.position.y = -0.25;
        cube.userData.velocity.y = -cube.userData.velocity.y * 0.5;
        cube.userData.grounded = true;
        if (Math.abs(cube.userData.velocity.y) < 0.5) cube.userData.velocity.y = 0;
    } else {
        cube.userData.grounded = false;
    }
    
    // Fricción
    cube.userData.velocity.x *= 0.98;
    cube.userData.velocity.z *= 0.98;
}

// Aplicar imán y repulsor
function applyTools() {
    if (!leftController || !rightController) return;
    
    const magnetPos = magnetGroup.position;
    const repulsorPos = repulsorGroup.position;
    const strength = 10;
    const radius = 1.5;
    
    cubes.forEach(cube => {
        if (!cube.visible) return;
        
        // Imán
        if (magnetActive) {
            const dist = magnetPos.distanceTo(cube.position);
            if (dist < radius) {
                const dir = new THREE.Vector3().subVectors(magnetPos, cube.position).normalize();
                cube.userData.velocity.add(dir.multiplyScalar(strength * (1 - dist/radius) * 0.1));
            }
        }
        
        // Repulsor
        if (repulsorActive) {
            const dist = repulsorPos.distanceTo(cube.position);
            if (dist < radius) {
                const dir = new THREE.Vector3().subVectors(cube.position, repulsorPos).normalize();
                cube.userData.velocity.add(dir.multiplyScalar(strength * (1 - dist/radius) * 0.1));
            }
        }
    });
}

// Verificar colisiones con plataforma
function checkCollisions() {
    cubes.forEach(cube => {
        if (!cube.visible) return;
        
        const dx = Math.abs(cube.position.x - targetPlatform.position.x);
        const dz = Math.abs(cube.position.z - targetPlatform.position.z);
        
        if (dx < 0.9 && dz < 0.9 && cube.position.y < 0.2) {
            cube.visible = false;
            score++;
            updateUI();
            
            // Respawnear cubo
            const angle = Math.random() * Math.PI * 2;
            const radius = 2 + Math.random() * 2;
            cube.position.set(
                camera.position.x + Math.cos(angle) * radius,
                1,
                camera.position.z + Math.sin(angle) * radius
            );
            cube.userData.velocity.set(0, 0, 0);
            cube.visible = true;
        }
    });
}

// Teletransporte
let teleportActive = false;
let teleportReticle;

function setupTeleport() {
    const geometry = new THREE.RingGeometry(0.3, 0.4, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    teleportReticle = new THREE.Mesh(geometry, material);
    teleportReticle.rotation.x = -Math.PI / 2;
    teleportReticle.visible = false;
    scene.add(teleportReticle);
    
    if (leftController) {
        leftController.addEventListener('squeezestart', () => {
            teleportActive = true;
        });
        
        leftController.addEventListener('squeezeend', () => {
            if (teleportActive && teleportReticle.visible) {
                camera.position.set(teleportReticle.position.x, 1.6, teleportReticle.position.z);
            }
            teleportActive = false;
            teleportReticle.visible = false;
        });
    }
}

function updateTeleport() {
    if (!teleportActive || !leftController) return;
    
    const raycaster = new THREE.Raycaster(
        leftController.position,
        new THREE.Vector3(0, -1, 0).applyQuaternion(leftController.quaternion),
        0, 3
    );
    const hits = raycaster.intersectObject(floor);
    
    if (hits.length > 0) {
        teleportReticle.position.set(hits[0].point.x, -0.48, hits[0].point.z);
        teleportReticle.visible = true;
    } else {
        teleportReticle.visible = false;
    }
}

// Configurar herramientas visuales
function setupTools() {
    // Imán (izquierda)
    magnetGroup = new THREE.Group();
    const magnetBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xcc3333 })
    );
    const magnetTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.12),
        new THREE.MeshStandardMaterial({ color: 0xff4444 })
    );
    magnetTip.position.y = 0.18;
    magnetGroup.add(magnetBody, magnetTip);
    scene.add(magnetGroup);
    
    // Repulsor (derecha)
    repulsorGroup = new THREE.Group();
    const repulsorBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x33aaff })
    );
    const repulsorTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x44ccff })
    );
    repulsorTip.position.y = 0.22;
    repulsorGroup.add(repulsorBody, repulsorTip);
    scene.add(repulsorGroup);
}

// Inicializar escena
function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050b1a);
    
    // Luces
    const ambient = new THREE.AmbientLight(0x404060);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    
    // Suelo
    floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0x1a2a4a })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    scene.add(floor);
    
    // Grid (opcional)
    const grid = new THREE.GridHelper(20, 20, 0x88aaff, 0x335588);
    grid.position.y = -0.49;
    scene.add(grid);
    
    // Plataforma objetivo
    targetPlatform = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.2, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x442200 })
    );
    targetPlatform.position.set(2, -0.4, 2);
    scene.add(targetPlatform);
}

// Inicializar juego
async function init() {
    updateStatus('Creando escena...');
    setupScene();
    
    updateStatus('Configurando renderizador...');
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    updateStatus('Creando objetos...');
    setupTools();
    
    // Crear cubos
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 2.5;
        const z = Math.sin(angle) * 2.5;
        cubes.push(createCube(x, z));
    }
    
    updateStatus('Configurando controles...');
    const controllerFactory = new XRControllerModelFactory();
    
    leftController = renderer.xr.getController(0);
    leftController.addEventListener('selectstart', () => { magnetActive = true; });
    leftController.addEventListener('selectend', () => { magnetActive = false; });
    scene.add(leftController);
    scene.add(renderer.xr.getControllerGrip(0).add(controllerFactory.createControllerModel(renderer.xr.getControllerGrip(0))));
    
    rightController = renderer.xr.getController(1);
    rightController.addEventListener('selectstart', () => { repulsorActive = true; });
    rightController.addEventListener('selectend', () => { repulsorActive = false; });
    scene.add(rightController);
    scene.add(renderer.xr.getControllerGrip(1).add(controllerFactory.createControllerModel(renderer.xr.getControllerGrip(1))));
    
    setupTeleport();
    
    updateStatus('¡Listo!');
    
    // Ocultar loading después de 1 segundo
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }, 1000);
    
    // BOTÓN VR - VERSIÓN CORREGIDA
    const vrButton = document.getElementById('vrButton');
    vrButton.onclick = async () => {
        updateStatus('Solicitando permisos VR...');
        try {
            if (renderer.xr.isPresenting) {
                await renderer.xr.getSession()?.end();
                vrButton.textContent = '🔮 ENTER VR';
                vrButton.style.background = '#ff4400';
            } else {
                const session = await navigator.xr.requestSession('immersive-vr', {
                    requiredFeatures: ['local-floor'],
                    optionalFeatures: ['hand-tracking']
                });
                await renderer.xr.setSession(session);
                vrButton.textContent = '⬅️ SALIR VR';
                vrButton.style.background = '#ff6688';
                updateStatus('¡En VR! Usa los controles');
            }
        } catch (err) {
            console.error('Error VR:', err);
            updateStatus('Error: ' + err.message);
            alert('No se pudo entrar a VR. Asegúrate de:\n1. Usar Meta Quest Browser\n2. Tener HTTPS (https://)\n3. Aceptar los permisos');
        }
    };
    
    // Loop de animación
    let lastTime = 0;
    function animate() {
        const now = performance.now();
        let delta = Math.min(0.033, (now - lastTime) / 1000);
        lastTime = now;
        
        // Actualizar físicas
        cubes.forEach(cube => updatePhysics(cube, delta));
        
        // Actualizar herramientas
        if (leftController) magnetGroup.position.copy(leftController.position);
        if (rightController) repulsorGroup.position.copy(rightController.position);
        
        applyTools();
        checkCollisions();
        updateTeleport();
        
        renderer.render(scene, camera);
        renderer.setAnimationLoop(animate);
    }
    
    animate();
}

function updateStatus(msg) {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = msg;
    console.log(msg);
}

// Iniciar
init();
import * as THREE from 'three';
import { setupScene } from './scene.js';
import { setupControllers } from './controllers.js';
import { applyMagnetAndRepulsor } from './physics.js';
import { ObjectManager } from './objects.js';
import { GameManager } from './gameplay.js';

// ========== INICIALIZACIÓN ==========
const { scene, floor, targetPlatform } = setupScene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// ========== MÓDULOS ==========
const { magnetActive, repulsorActive, magnetGroup, repulsorGroup, updateTools, leftController, rightController } = 
    setupControllers(renderer, scene);

const objectManager = new ObjectManager(scene, camera);
objectManager.spawnCubes();

const gameManager = new GameManager(objectManager, targetPlatform);
gameManager.setScoreCallback((score) => {
    document.getElementById('score').innerHTML = `Puntuación: ${score} / 10`;
});

// ========== UI ==========
const vrButton = document.createElement('button');
vrButton.textContent = '🔮 ENTER VR';
vrButton.style.cssText = 'position:absolute;bottom:20px;right:20px;padding:12px 24px;background:#ff4400;color:white;border:none;border-radius:8px;cursor:pointer;z-index:100';
vrButton.onclick = async () => {
    if (renderer.xr.isPresenting) {
        await renderer.xr.getSession()?.end();
        vrButton.textContent = '🔮 ENTER VR';
    } else {
        const session = await navigator.xr.requestSession('immersive-vr');
        await renderer.xr.setSession(session);
        vrButton.textContent = '⬅️ SALIR VR';
    }
};
document.body.appendChild(vrButton);

// ========== LOOP PRINCIPAL ==========
let lastTime = 0;

function animate() {
    const delta = Math.min(0.033, (performance.now() - lastTime) / 1000);
    lastTime = performance.now();
    
    objectManager.updatePhysics(delta);
    gameManager.checkCollisions();
    updateTools();
    
    applyMagnetAndRepulsor(
        objectManager.getCubes(),
        magnetGroup.position,
        repulsorGroup.position,
        magnetActive,
        repulsorActive
    );
    
    renderer.render(scene, camera);
    renderer.setAnimationLoop(animate);
}

animate();
console.log('🎮 Juego listo!');
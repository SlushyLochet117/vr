import * as THREE from 'three';

export function setupScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050b1a);
    scene.fog = new THREE.FogExp2(0x050b1a, 0.008);
    
    // Luces
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    
    const fillLight = new THREE.PointLight(0x4466cc, 0.3);
    fillLight.position.set(-2, 3, 4);
    scene.add(fillLight);
    
    // Suelo y grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x88aaff, 0x335588);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);
    
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Plataforma objetivo
    const targetPlatform = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.2, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xffaa44, metalness: 0.8, emissive: 0x442200 })
    );
    targetPlatform.position.set(2, -0.4, 2);
    targetPlatform.castShadow = true;
    scene.add(targetPlatform);
    
    return { scene, floor, targetPlatform };
}
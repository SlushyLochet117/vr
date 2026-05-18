import * as THREE from 'three';

export function createFruitScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2a);
    scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);
    
    // Suelo tipo "arena"
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Césped decorativo (círculos verdes)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a });
    for (let i = 0; i < 50; i++) {
        const grass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.05, 6), grassMat);
        grass.position.x = (Math.random() - 0.5) * 15;
        grass.position.z = (Math.random() - 0.5) * 15;
        grass.position.y = -1.15;
        scene.add(grass);
    }
    
    // Luces ambientales
    const ambient = new THREE.AmbientLight(0x333344);
    scene.add(ambient);
    
    // Luz principal
    const mainLight = new THREE.DirectionalLight(0xffeedd, 1);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    // Luz de relleno colorida
    const fillLight = new THREE.PointLight(0xff66aa, 0.5);
    fillLight.position.set(-3, 4, 4);
    scene.add(fillLight);
    
    const backLight = new THREE.PointLight(0x44aaff, 0.4);
    backLight.position.set(0, 3, -5);
    scene.add(backLight);
    
    // Partículas flotantes (ambiente mágico)
    const particleCount = 300;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        particlePositions[i*3] = (Math.random() - 0.5) * 25;
        particlePositions[i*3+1] = Math.random() * 5;
        particlePositions[i*3+2] = (Math.random() - 0.5) * 15;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0xffaa66, size: 0.05 }));
    scene.add(particles);
    
    return { scene, floor, particles };
}
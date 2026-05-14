import * as THREE from 'three';
import { PhysicsObject } from './physics.js';

export class ObjectManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.cubes = [];
        this.maxCubes = 10;
        this.score = 0;
    }
    
    createCube(x, z) {
        const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffaa44];
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 1, z);
        mesh.castShadow = true;
        this.scene.add(mesh);
        
        return { mesh, physics: new PhysicsObject(mesh, 1) };
    }
    
    spawnCubes() {
        for (let i = 0; i < this.maxCubes; i++) {
            const angle = (i / this.maxCubes) * Math.PI * 2;
            const radius = 2.5 + Math.random() * 1.5;
            const x = this.camera.position.x + Math.cos(angle) * radius;
            const z = this.camera.position.z + Math.sin(angle) * radius;
            this.cubes.push(this.createCube(x, z));
        }
    }
    
    updatePhysics(deltaTime) {
        for (const cube of this.cubes) {
            if (cube.mesh.visible) cube.physics.update(deltaTime);
        }
    }
    
    getCubes() { return this.cubes; }
    getScore() { return this.score; }
    addScore(points) { this.score += points; }
}
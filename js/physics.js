import * as THREE from 'three';

export class PhysicsObject {
    constructor(mesh, mass = 1) {
        this.mesh = mesh;
        this.mass = mass;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.grounded = false;
    }
    
    update(deltaTime, floorY = -0.5) {
        if (!this.grounded) this.velocity.y -= 9.8 * deltaTime;
        
        this.mesh.position.x += this.velocity.x * deltaTime;
        this.mesh.position.y += this.velocity.y * deltaTime;
        this.mesh.position.z += this.velocity.z * deltaTime;
        
        // Colisión con suelo
        if (this.mesh.position.y - 0.3 <= floorY) {
            this.mesh.position.y = floorY + 0.2;
            this.velocity.y = -this.velocity.y * 0.5;
            this.grounded = true;
            if (Math.abs(this.velocity.y) < 0.5) this.velocity.y = 0;
        } else {
            this.grounded = false;
        }
        
        // Fricción
        this.velocity.x *= 0.99;
        this.velocity.z *= 0.99;
    }
    
    applyForce(force) {
        this.velocity.x += force.x / this.mass;
        this.velocity.y += force.y / this.mass;
        this.velocity.z += force.z / this.mass;
    }
}

export function applyMagnetAndRepulsor(cubes, magnetPos, repulsorPos, magnetActive, repulsorActive) {
    const magnetStrength = 8;
    const repulsorStrength = 12;
    const radius = 1.2;
    
    for (const cube of cubes) {
        if (!cube.mesh.visible) continue;
        
        if (magnetActive) {
            const distance = magnetPos.distanceTo(cube.mesh.position);
            if (distance < radius) {
                const direction = new THREE.Vector3().subVectors(magnetPos, cube.mesh.position).normalize();
                cube.physics.applyForce(direction.multiplyScalar(magnetStrength * (1 - distance / radius)));
            }
        }
        
        if (repulsorActive) {
            const distance = repulsorPos.distanceTo(cube.mesh.position);
            if (distance < radius) {
                const direction = new THREE.Vector3().subVectors(cube.mesh.position, repulsorPos).normalize();
                cube.physics.applyForce(direction.multiplyScalar(repulsorStrength * (1 - distance / radius)));
            }
        }
    }
}
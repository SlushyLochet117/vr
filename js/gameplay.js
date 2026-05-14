export class GameManager {
    constructor(objectManager, targetPlatform) {
        this.objectManager = objectManager;
        this.targetPlatform = targetPlatform;
        this.score = 0;
        this.gameActive = true;
        this.onScoreUpdate = null;
    }
    
    checkCollisions() {
        for (const cube of this.objectManager.getCubes()) {
            if (!cube.mesh.visible) continue;
            
            const cubePos = cube.mesh.position;
            const targetPos = this.targetPlatform.position;
            const halfSize = 0.75;
            
            if (Math.abs(cubePos.x - targetPos.x) < halfSize &&
                Math.abs(cubePos.z - targetPos.z) < halfSize &&
                cubePos.y - 0.25 < targetPos.y + 0.2) {
                
                cube.mesh.visible = false;
                this.score++;
                if (this.onScoreUpdate) this.onScoreUpdate(this.score);
                
                // Respawnear cubo
                const angle = Math.random() * Math.PI * 2;
                const radius = 2.5 + Math.random() * 1.5;
                cube.mesh.position.set(
                    this.objectManager.camera.position.x + Math.cos(angle) * radius,
                    1.5,
                    this.objectManager.camera.position.z + Math.sin(angle) * radius
                );
                cube.mesh.visible = true;
                cube.physics.velocity.set(0, 0, 0);
            }
        }
    }
    
    setScoreCallback(callback) {
        this.onScoreUpdate = callback;
    }
}
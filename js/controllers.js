import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export function setupControllers(renderer, scene) {
    const controllerModelFactory = new XRControllerModelFactory();
    let magnetActive = false;
    let repulsorActive = false;
    
    // Herramientas visuales
    const magnetGroup = createMagnetTool();
    const repulsorGroup = createRepulsorTool();
    scene.add(magnetGroup);
    scene.add(repulsorGroup);
    
    // Controladores
    const leftController = renderer.xr.getController(0);
    const rightController = renderer.xr.getController(1);
    
    leftController.addEventListener('selectstart', () => magnetActive = true);
    leftController.addEventListener('selectend', () => magnetActive = false);
    rightController.addEventListener('selectstart', () => repulsorActive = true);
    rightController.addEventListener('selectend', () => repulsorActive = false);
    
    scene.add(leftController);
    scene.add(rightController);
    
    // Modelos 3D de los controles
    const leftModel = renderer.xr.getControllerGrip(0);
    const rightModel = renderer.xr.getControllerGrip(1);
    leftModel.add(controllerModelFactory.createControllerModel(leftModel));
    rightModel.add(controllerModelFactory.createControllerModel(rightModel));
    scene.add(leftModel);
    scene.add(rightModel);
    
    function createMagnetTool() {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.3), 
            new THREE.MeshStandardMaterial({ color: 0xcc3333, metalness: 0.7 }));
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12), 
            new THREE.MeshStandardMaterial({ color: 0xff4444 }));
        tip.position.y = 0.18;
        group.add(body, tip);
        return group;
    }
    
    function createRepulsorTool() {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.35), 
            new THREE.MeshStandardMaterial({ color: 0x33aaff, metalness: 0.8 }));
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 8), 
            new THREE.MeshStandardMaterial({ color: 0x44ccff }));
        tip.position.y = 0.22;
        group.add(body, tip);
        return group;
    }
    
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
    
    return { magnetActive, repulsorActive, magnetGroup, repulsorGroup, updateTools, leftController, rightController };
}
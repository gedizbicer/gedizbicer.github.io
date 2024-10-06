import * as THREE from "three";

export let BODY_SIZE_MULTIPLIER = 5e3;
export let DISTANCE_SCALE = 3e3;

export class CelestialBody {
    constructor(name, parent, scene, params) {
        this.name = name;
        this.kParamName = name.toLowerCase().replace(" ", "_");
        
        this.mass = params.mass;
        this.radius = params.radius;

        this.text = {};
        
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(params.customSize || (this.radius * BODY_SIZE_MULTIPLIER * 100), 64, 64),
            params.material || (new THREE.MeshPhysicalMaterial({ color: params.color }))
        );

        scene.add(this.mesh);
        
        if (!parent)
            return;

        this.mesh.parent = parent.mesh;
        this.mesh.name = name;
    }
}   
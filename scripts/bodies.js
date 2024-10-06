import * as THREE from "three";
import { CelestialBody } from "./system.js";

export const EARTH_RADIUS = 0.00004259;
export const EARTH_MASS = 5.972e24;

export const PLANETS = {};

export let sun = null;

export function initBodies(scene) {
    sun = new CelestialBody("Sun", null, scene, {
        mass: 1.98892e30,
        radius: 0.0046524726,
        customSize: 200,
        material: new THREE.MeshBasicMaterial({
            color: 0xffff99
        })
    });

    PLANETS.mercury = new CelestialBody("Mercury", sun, scene, {
        mass: EARTH_MASS * 0.055,
        radius: EARTH_RADIUS * 0.3829,
        color: 0xc7c7c7
    });

    PLANETS.venus = new CelestialBody("Venus", sun, scene, {
        mass: EARTH_RADIUS * 0.815,
        radius: EARTH_RADIUS * 0.9499,
        color: 0xc4b891
    })

    PLANETS.earth = new CelestialBody("Earth", sun, scene, {
        mass: EARTH_MASS,
        radius: EARTH_RADIUS,
        color: 0x2090ff
    });

    PLANETS.mars = new CelestialBody("Mars", sun, scene, {
        mass: EARTH_MASS * 0.107,
        radius: EARTH_RADIUS * 0.533,
        color: 0xdb996c
    });

    PLANETS.jupiter = new CelestialBody("Jupiter", sun, scene, {
        mass: EARTH_MASS * 317.8,
        radius: EARTH_RADIUS * 10.973,
        color: 0xdec7bc
    });

    PLANETS.saturn = new CelestialBody("Saturn", sun, scene, {
        mass: EARTH_MASS * 95.159,
        radius: EARTH_RADIUS * 9.1402,
        color: 0xd4c8a3
    });

    PLANETS.uranus = new CelestialBody("Uranus", sun, scene, {
        mass: EARTH_MASS * 14.536,
        radius: EARTH_RADIUS * 3.929,
        color: 0xc5fbff
    });

    PLANETS.neptune = new CelestialBody("Neptune", sun, scene, {
        mass: EARTH_MASS * 17.147,
        radius: EARTH_RADIUS * 3.883,
        color: 0x0040ad
    });
}

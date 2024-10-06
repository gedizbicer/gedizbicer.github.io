import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { CelestialBody, DISTANCE_SCALE } from "./system.js";
import { getBodyPos, getSemiMinor, rad } from "./kepler.js";
import { KEPLER_PARAMS } from "./params.js";

const sleep = async (ms) => new Promise(r => setTimeout(r, ms));

const IS_DEBUG = true;
let CURR_TIME = 0;

let TRACKED_OBJECT = null;
let FOLLOW_DISTANCE = 500;

const DAYS_TO_CENTURIES = 0.000027379070;

let DAYS_PER_SECOND = 5;
let UPDATE_RATE = 10;

const errHandler = function (err) {
    console.error(err);
}

const scene = new THREE.Scene();

const light = new THREE.PointLight(0xffffff, 5, 0, 0);
light.position.set(0, 0, 0);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x050505);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1e5);

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

renderer.domElement.addEventListener("mousedown", (e) => {
    if (e.buttons === 1)
        return;

    TRACKED_OBJECT = null;
});

const sun = new CelestialBody("Sun", null, scene, {
    mass: 1.98892e30,
    radius: 0.0046524726,
    customSize: 200,
    material: new THREE.MeshBasicMaterial({
        color: 0xffff99
    })
});

const EARTH_RADIUS = 0.00004259;
const EARTH_MASS = 5.972e24;

const PLANETS = {};
const MOONS = {};

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

PLANETS.cool_planet = new CelestialBody("Cool Planet", sun, scene, {
    mass: 1,
    radius: EARTH_RADIUS,
    color: 0xffffff
});

MOONS.moon = new CelestialBody("Moon", PLANETS.earth, scene, {
    mass: EARTH_MASS * 0.0123,
    radius: EARTH_RADIUS * 0.2727,
    color: 0x888888
});

const ORBIT_LINES = {};

const APSIS = {};

function handleLines(bodies) {
    for (const body of Object.values(bodies)) {

        APSIS[body.kParamName] = {
            apo: new THREE.Mesh(
                new THREE.SphereGeometry(20, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            ),
            peri: new THREE.Mesh(
                new THREE.SphereGeometry(20, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0x0000ff })
            ),
        }

        ORBIT_LINES[body.kParamName] = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({
                color: 0x101010
            })
        );

        scene.add(ORBIT_LINES[body.kParamName]);

        ORBIT_LINES[body.kParamName].lookAt(0, 10, 0);
        ORBIT_LINES[body.kParamName].parent = body.mesh.parent;
    }   
}

handleLines(PLANETS);
handleLines(MOONS);

camera.position.set(0, 1000, 0);

let camDirection = new THREE.Vector3();
camera.getWorldDirection(camDirection);

camera.position.add(camDirection.multiplyScalar(-200));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();

function positionBodies(bodies) {
    for (const bodyName of Object.keys(bodies)) {
        const body = bodies[bodyName];

        const pos = getBodyPos(KEPLER_PARAMS[body.kParamName], CURR_TIME);
     
        let newPosition = body.mesh.parent.position.clone().add((new THREE.Vector3()).fromArray(pos).multiplyScalar(DISTANCE_SCALE));

        bodies[bodyName].mesh.position.set(newPosition.x, newPosition.y, newPosition.z);

        updateCurve(
            {
                obj: ORBIT_LINES[body.kParamName],
                apsis: APSIS[body.kParamName]
            },
            KEPLER_PARAMS[body.kParamName]
        );
    }
}

positionBodies(PLANETS);
positionBodies(MOONS);

function animate() {
    if (TRACKED_OBJECT !== null) {
        controls.target.set(TRACKED_OBJECT.position.x, TRACKED_OBJECT.position.y, TRACKED_OBJECT.position.z);

        camera.getWorldDirection(camDirection);
        camDirection.normalize();

        const difference = TRACKED_OBJECT.position.clone().sub(camera.position);
        const distance = difference.length();

        if (distance > FOLLOW_DISTANCE)
            camera.position.add(camDirection.multiplyScalar(distance - FOLLOW_DISTANCE));
    }
    
    controls.update();
    
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

const gotoBodyInput = document.getElementById("goto_body_input");
const gotoBodyButton = document.getElementById("goto_body_button");
const bodyResult = document.getElementById("body_result");

gotoBodyButton.addEventListener("click", async (_) => {
    const bodyName = gotoBodyInput.value.toLowerCase().replace(" ", "_");

    if (!(bodyName == "sun" || bodyName in PLANETS || bodyName in MOONS)) {
        bodyResult.textContent = "Body not found";
        bodyResult.style.color = "rgba(255, 128, 128, 255)";
        setTimeout(() => bodyResult.style.color = "rgba(255, 128, 128, 0)", 3000);
        return;
    }

    const body = PLANETS[bodyName] || MOONS[bodyName] || sun;

    camera.getWorldDirection(camDirection);
    camDirection.normalize();
    
    for (let i = 0.0; i <= 1.0; i += 0.002) {
        const bodyPos = body.mesh.position.clone();

        const targetDir = bodyPos.clone().sub(camera.position);
        targetDir.normalize();

        const offset = targetDir.clone().multiplyScalar(-FOLLOW_DISTANCE * (body.radius / EARTH_RADIUS));
        const targetPos = bodyPos.clone().add(offset);

        const camPos = camera.position.clone();
        
        const newPos = camPos.clone().lerp(targetPos, sinEase(i));
        const newDir = camDirection.clone().lerp(targetDir, sinEase(i));

        camera.position.set(newPos.x, newPos.y, newPos.z);
        controls.target.set(newPos.x + newDir.x, newPos.y + newDir.y, newPos.z + newDir.z);
        controls.update();

        await sleep(1);
    }

    controls.target.set(body.mesh.position.x, body.mesh.position.y, body.mesh.position.z);
    controls.update();

    TRACKED_OBJECT = body.mesh;

    bodyResult.textContent = "Done!";
    bodyResult.style.color = "rgba(128, 255, 128, 255)";
    setTimeout(() => bodyResult.style.color = "rgba(255, 128, 128, 0)", 3000);
});

const camText = document.getElementById("cam_pos_text");

setInterval(() => {
    camText.textContent = `Camera X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}`;
}, 100);

const faceBodyInput = document.getElementById("face_body_input");
const faceBodyButton = document.getElementById("face_body_button");

faceBodyButton.addEventListener("click", async (_) => {
    const bodyName = faceBodyInput.value.toLowerCase();

    if (!(bodyName == "sun" || bodyName in PLANETS || bodyName in MOONS)) {
        bodyResult.textContent = "Body not found";
        bodyResult.style.color = "rgba(255, 128, 128, 255)";
        setTimeout(() => bodyResult.style.color = "rgba(255, 128, 128, 0)", 3000);
        return;
    }

    const body = PLANETS[bodyName] || MOONS[bodyName] || sun;

    TRACKED_OBJECT = null;

    camera.getWorldDirection(camDirection);
    camDirection.normalize();
    
    for (let i = 0.0; i <= 1.0; i += 0.01) {
        const bodyPos = body.mesh.position.clone();
        const targetDir = bodyPos.sub(camera.position);
        targetDir.normalize();

        const newDir = camDirection.clone().lerp(targetDir, sinEase(i));

        controls.target.set(
            camera.position.x + newDir.x * 5,
            camera.position.y + newDir.y * 5,
            camera.position.z + newDir.z * 5
        );

        controls.update();
        await sleep(5);
    }

    bodyResult.textContent = "Done!";
    bodyResult.style.color = "rgba(128, 255, 128, 255)";
    setTimeout(() => bodyResult.style.color = "rgba(255, 128, 128, 0)", 3000);
});

function sinEase(alpha) {
    return Math.sin((alpha + 1.5) * Math.PI) / 2 + 0.5;
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
});

setInterval(() => {
    CURR_TIME += DAYS_PER_SECOND * DAYS_TO_CENTURIES * (UPDATE_RATE / 1e3);
    positionBodies(PLANETS);
    positionBodies(MOONS);
}, UPDATE_RATE);

function updateCurve(curve, keplerParams) {
    const curveObj = curve.obj;

    const minorAxis = getSemiMinor(keplerParams, CURR_TIME);
    
    const KP = keplerParams;
    const a = KP.a + KP.aDot * CURR_TIME;
    const e = KP.e + KP.eDot * CURR_TIME;
    const I = rad(KP.I + KP.IDot * CURR_TIME);  
    const O = rad(KP.O + KP.ODot * CURR_TIME);  
    const B = rad(KP.B + KP.BDot * CURR_TIME);  
    
    const periapsis = (1 - e) * a;
    const apoapsis = (1 + e) * a;

    const centerX = DISTANCE_SCALE * (apoapsis - (apoapsis + periapsis) / 2);
    
    const xRadius = DISTANCE_SCALE * a;
    const yRadius = DISTANCE_SCALE * minorAxis;

    const w = B - O;

    const ellipse = new THREE.EllipseCurve(centerX, 0, xRadius, yRadius);

    const pointCount = Math.floor(Math.sqrt(Math.max(64, (apoapsis + periapsis) / (2 * EARTH_RADIUS))));

    const points = ellipse.getPoints(pointCount % 2 == 0 ? pointCount : pointCount + 1);
    console.log(points);
    
    curveObj.geometry.dispose();
    curveObj.geometry = new THREE.BufferGeometry().setFromPoints(points);

    const rotationMatrix = new THREE.Matrix4();
    
    const xAxisRotationMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    rotationMatrix.multiply(xAxisRotationMatrix);
    
    const longAscNodeMatrix = new THREE.Matrix4().makeRotationZ(O);
    rotationMatrix.multiply(longAscNodeMatrix);
    
    const inclinationMatrix = new THREE.Matrix4().makeRotationX(-I);
    rotationMatrix.multiply(inclinationMatrix);

    const argPeriapsisMatrix = new THREE.Matrix4().makeRotationZ(w);
    rotationMatrix.multiply(argPeriapsisMatrix);
    
    // Yes, this magically fixed everything
    const hopefullyThisMagicallyFixesEverythingMatrix = new THREE.Matrix4().makeRotationY(Math.PI);
    rotationMatrix.multiply(hopefullyThisMagicallyFixesEverythingMatrix);
    
    curveObj.setRotationFromMatrix(rotationMatrix);
}

function generateBodyPosPoints(keplerParams, days) {
    const points = [];

    for (let i = 0; i < days; ++i) {
        const t = DAYS_TO_CENTURIES * i;

        const point = getBodyPos(keplerParams, t);
        points.push(new THREE.Vector3(point[0] * DISTANCE_SCALE, point[1] * DISTANCE_SCALE, point[2] * DISTANCE_SCALE));
    }

    return points;
}

// Used to test orbit lines
function createPositionLine(keplerParams, days = 1000, color = 0xff0000) {
    const points = generateBodyPosPoints(keplerParams, days);

    console.log(points);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color });

    return new THREE.Line(geometry, material);
}


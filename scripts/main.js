import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { CelestialBody, DISTANCE_SCALE } from "./system.js";
import { getBodyPos, getSemiMinor, rad } from "./kepler.js";
import { KEPLER_PARAMS } from "./params.js";

import { EARTH_RADIUS, PLANETS, MOONS, sun, initBodies } from "./bodies.js";

const sleep = async ms => new Promise(r => setTimeout(r, ms));
const sinEase = alpha => Math.sin((alpha + 1.5) * Math.PI) / 2 + 0.5;

const IS_DEBUG = true;
let CURR_TIME = 0;

let TRACKED_BODY = null;
let FOLLOW_DISTANCE = 500;

const DAYS_TO_CENTURIES = 0.000027379070;

let DAYS_PER_SECOND = 5;
let UPDATE_RATE = 10;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5e5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new OrbitControls(camera, renderer.domElement);

const scene = new THREE.Scene();

const light = new THREE.PointLight(0xffffff, 5, 0, 0);
const ambientLight = new THREE.AmbientLight(0x050505);

const gotoBodyInput = document.getElementById("goto_body_input");
const gotoBodyButton = document.getElementById("goto_body_button");
const bodyResult = document.getElementById("body_result");

const faceBodyInput = document.getElementById("face_body_input");
const faceBodyButton = document.getElementById("face_body_button");

const camText = document.getElementById("cam_pos_text");

let camDirection = new THREE.Vector3();

const ORBIT_LINES = {};

const DEFAULT_LINE_MATERIAL = new THREE.LineBasicMaterial({
    color: 0x101010
});

const ACTIVE_LINE_MATERIAL = new THREE.LineBasicMaterial({
    color: 0xaaaaaa
});

camera.panSpeed = 1e1;
camera.zoomSpeed = 1e2;

initBodies(scene);

light.position.set(0, 0, 0);
scene.add(light);

scene.add(ambientLight);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.getWorldDirection(camDirection);

renderer.domElement.addEventListener("mousedown", (e) => {
    if (e.buttons === 1)
        return;
    
    setTrackedBody(null);
});

renderer.setAnimationLoop(animate);

function setTrackedBody(body) {
    if (body !== null && !(body instanceof CelestialBody))
        throw new Error("setTrackedBody: body must be a CelestialBody");

    const oldLine = ORBIT_LINES[TRACKED_BODY?.kParamName];
    
    TRACKED_BODY = body;

    const newLine = ORBIT_LINES[TRACKED_BODY?.kParamName];

    if (oldLine)
        oldLine.material = DEFAULT_LINE_MATERIAL;

    if (newLine)
        newLine.material = ACTIVE_LINE_MATERIAL;
}

function handleLines(bodies) {
    for (const body of Object.values(bodies)) {

        ORBIT_LINES[body.kParamName] = new THREE.Line(
            new THREE.BufferGeometry(),
            DEFAULT_LINE_MATERIAL
        );

        scene.add(ORBIT_LINES[body.kParamName]);

        ORBIT_LINES[body.kParamName].lookAt(0, 10, 0);
        ORBIT_LINES[body.kParamName].parent = body.mesh.parent;
    }   
}

handleLines(PLANETS);
handleLines(MOONS);

camera.position.set(0, 1000, 0);

camera.position.add(camDirection.multiplyScalar(-200));

controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();

positionBodies(PLANETS);
positionBodies(MOONS);

setInterval(() => {
    CURR_TIME += DAYS_PER_SECOND * DAYS_TO_CENTURIES * (UPDATE_RATE / 1e3);
    positionBodies(PLANETS);
    positionBodies(MOONS);
}, UPDATE_RATE);

setInterval(() => {
    camText.textContent = `Camera X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}`;
}, 100);

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
});

function positionBodies(bodies) {
    for (const bodyName of Object.keys(bodies)) {
        const body = bodies[bodyName];

        const pos = getBodyPos(KEPLER_PARAMS[body.kParamName], CURR_TIME);

        const oldPosition = body.mesh.position.clone();
     
        let newPosition = body.mesh.parent.position.clone().add((new THREE.Vector3()).fromArray(pos).multiplyScalar(DISTANCE_SCALE));

        bodies[bodyName].mesh.position.set(newPosition.x, newPosition.y, newPosition.z);

        if (bodies[bodyName] === TRACKED_BODY)
            camera.position.add(oldPosition.sub(newPosition).negate());

        updateCurve(
            ORBIT_LINES[body.kParamName],
            KEPLER_PARAMS[body.kParamName]
        );
    }
}

function animate() {
    if (TRACKED_BODY !== null)
        controls.target.set(TRACKED_BODY.mesh.position.x, TRACKED_BODY.mesh.position.y, TRACKED_BODY.mesh.position.z);
    
    controls.update();
    
    renderer.render(scene, camera);
}

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

    setTrackedBody(body);

    bodyResult.textContent = "Done!";
    bodyResult.style.color = "rgba(128, 255, 128, 255)";
    setTimeout(() => bodyResult.style.color = "rgba(255, 128, 128, 0)", 3000);
});

faceBodyButton.addEventListener("click", async (_) => {
    const bodyName = faceBodyInput.value.toLowerCase();

    if (!(bodyName == "sun" || bodyName in PLANETS || bodyName in MOONS)) {
        bodyResult.textContent = "Body not found";
        bodyResult.style.color = "rgba(255, 128, 128, 255)";
        setTimeout(() => bodyResult.style.color = "rgba(255, 128, 128, 0)", 3000);
        return;
    }

    const body = PLANETS[bodyName] || MOONS[bodyName] || sun;

    setTrackedBody(null);

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

function updateCurve(curveObj, keplerParams) {

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

    const pointCount = Math.min(1024, Math.floor(Math.sqrt(Math.max(64, (apoapsis + periapsis) / (2 * EARTH_RADIUS)))));

    const points = ellipse.getPoints(pointCount % 2 == 0 ? pointCount : pointCount + 1);
    
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


// Tank Shooter 3D - Ultra minimal
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 100, 50);
scene.add(dirLight);

// ==================== PROCEDURAL SOUND FX (Web Audio API) ====================
class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.engineOsc = null;
        this.engineGain = null;
        this.engineFilter = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.setupEngine();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.engineGain && this.ctx) {
            if (this.isMuted) {
                this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
            }
        }
        return this.isMuted;
    }

    setupEngine() {
        if (!this.ctx) return;
        try {
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineFilter = this.ctx.createBiquadFilter();

            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(32, this.ctx.currentTime);

            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(130, this.ctx.currentTime);

            this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            this.engineOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc.start();
        } catch (e) {
            console.warn('Engine sound init notice:', e);
        }
    }

    updateEngine(isMoving) {
        if (!this.ctx || !this.engineOsc || !this.engineGain || this.isMuted) return;
        const t = this.ctx.currentTime;
        const targetFreq = isMoving ? 58 : 34;
        const targetVol = isMoving ? 0.08 : 0.035;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
        this.engineGain.gain.setTargetAtTime(targetVol, t, 0.1);
    }

    playShoot(isPlayer, distance = 0) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const distAtten = isPlayer ? 1 : Math.max(0.15, 1 - distance / 120);

        // Sub bass thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = isPlayer ? 'triangle' : 'sine';
        const startFreq = isPlayer ? 170 : 210;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);

        oscGain.gain.setValueAtTime(0.5 * distAtten, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);

        // Explosive burst noise
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(isPlayer ? 600 : 850, t);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.18);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.45 * distAtten, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(t);
    }

    playExplosion(distance = 0) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const distAtten = Math.max(0.2, 1 - distance / 150);

        // Rumble oscillator
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.7);

        oscGain.gain.setValueAtTime(0.6 * distAtten, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.75);

        // Long noisy explosion rumble
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.65);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, t);
        filter.frequency.exponentialRampToValueAtTime(70, t + 0.65);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.7 * distAtten, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(t);
    }

    playHit() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.14);
    }

    playGameOver(win) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const notes = win ? [261.63, 329.63, 392.00, 523.25] : [392.00, 311.13, 261.63, 196.00];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = win ? 'triangle' : 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + idx * 0.18);

            gain.gain.setValueAtTime(0.28, t + idx * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.18 + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t + idx * 0.18);
            osc.stop(t + idx * 0.18 + 0.4);
        });
    }
}
const sound = new SoundManager();

// Ground
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7CFC00 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Grid
const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x888888);
scene.add(gridHelper);

// ==================== ARENA OBSTACLES ====================
const obstacles = [];
const TANK_RADIUS = 2.4;

function addObstacle(mesh, halfW, halfD, height) {
    scene.add(mesh);
    obstacles.push({
        mesh: mesh,
        minX: mesh.position.x - halfW,
        maxX: mesh.position.x + halfW,
        minZ: mesh.position.z - halfD,
        maxZ: mesh.position.z + halfD,
        height: height
    });
}

function resolveTankObstacleCollision(entityPos) {
    for (const obs of obstacles) {
        const cx = Math.max(obs.minX, Math.min(obs.maxX, entityPos.x));
        const cz = Math.max(obs.minZ, Math.min(obs.maxZ, entityPos.z));
        const dx = entityPos.x - cx;
        const dz = entityPos.z - cz;
        const distSq = dx * dx + dz * dz;

        if (distSq < TANK_RADIUS * TANK_RADIUS) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.001) {
                const overlap = TANK_RADIUS - dist;
                entityPos.x += (dx / dist) * overlap;
                entityPos.z += (dz / dist) * overlap;
            } else {
                entityPos.x += TANK_RADIUS;
            }
        }
    }
}

function initObstacles() {
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x7A8288 });
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
    const crateDarkMat = new THREE.MeshLambertMaterial({ color: 0x5C3A21 });
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x555A60, flatShading: true });

    // Seeded-like fixed distribution for clean tactical layout
    const layouts = [
        // Concrete Walls: [x, z, w, d, rotY]
        { type: 'wall', x: 25, z: 25, w: 10, d: 2.4, h: 3.5 },
        { type: 'wall', x: -25, z: -25, w: 10, d: 2.4, h: 3.5 },
        { type: 'wall', x: -35, z: 20, w: 2.4, d: 12, h: 3.5 },
        { type: 'wall', x: 35, z: -20, w: 2.4, d: 12, h: 3.5 },
        { type: 'wall', x: 0, z: 50, w: 14, d: 2.4, h: 3.5 },
        { type: 'wall', x: 0, z: -50, w: 14, d: 2.4, h: 3.5 },
        { type: 'wall', x: 60, z: 30, w: 2.4, d: 10, h: 3.5 },
        { type: 'wall', x: -60, z: -30, w: 2.4, d: 10, h: 3.5 },
        { type: 'wall', x: 50, z: -60, w: 12, d: 2.4, h: 3.5 },
        { type: 'wall', x: -50, z: 60, w: 12, d: 2.4, h: 3.5 },

        // Crate Bunkers: [x, z]
        { type: 'crate', x: 18, z: -18 },
        { type: 'crate', x: -18, z: 18 },
        { type: 'crate', x: 45, z: 0 },
        { type: 'crate', x: -45, z: 0 },
        { type: 'crate', x: 30, z: 70 },
        { type: 'crate', x: -30, z: -70 },
        { type: 'crate', x: 75, z: -40 },
        { type: 'crate', x: -75, z: 40 },
        { type: 'crate', x: -20, z: 85 },
        { type: 'crate', x: 20, z: -85 },

        // Boulders: [x, z, radius]
        { type: 'rock', x: -15, z: -40, r: 3.2 },
        { type: 'rock', x: 15, z: 40, r: 3.2 },
        { type: 'rock', x: -40, z: -60, r: 3.8 },
        { type: 'rock', x: 40, z: 60, r: 3.8 },
        { type: 'rock', x: 65, z: -15, r: 3.0 },
        { type: 'rock', x: -65, z: 15, r: 3.0 },
        { type: 'rock', x: 70, z: 70, r: 4.2 },
        { type: 'rock', x: -70, z: -70, r: 4.2 },
        { type: 'rock', x: 90, z: 10, r: 3.5 },
        { type: 'rock', x: -90, z: -10, r: 3.5 },
        { type: 'rock', x: 10, z: 95, r: 3.6 },
        { type: 'rock', x: -10, z: -95, r: 3.6 }
    ];

    for (const item of layouts) {
        if (item.type === 'wall') {
            const geo = new THREE.BoxGeometry(item.w, item.h, item.d);
            const mesh = new THREE.Mesh(geo, concreteMat);
            mesh.position.set(item.x, item.h / 2, item.z);
            addObstacle(mesh, item.w / 2, item.d / 2, item.h);
        } else if (item.type === 'crate') {
            const group = new THREE.Group();
            const baseGeo = new THREE.BoxGeometry(3.5, 2.5, 3.5);
            const baseMesh = new THREE.Mesh(baseGeo, crateMat);
            baseMesh.position.y = 1.25;
            group.add(baseMesh);

            // Stacked smaller crate on top
            const topGeo = new THREE.BoxGeometry(2.2, 1.8, 2.2);
            const topMesh = new THREE.Mesh(topGeo, crateDarkMat);
            topMesh.position.set(0.2, 2.5 + 0.9, -0.1);
            topMesh.rotation.y = 0.25;
            group.add(topMesh);

            group.position.set(item.x, 0, item.z);
            addObstacle(group, 1.8, 1.8, 4.3);
        } else if (item.type === 'rock') {
            const geo = new THREE.DodecahedronGeometry(item.r, 1);
            const mesh = new THREE.Mesh(geo, rockMat);
            mesh.position.set(item.x, item.r * 0.7, item.z);
            mesh.rotation.set(0.3, 0.7, 0.2);
            addObstacle(mesh, item.r * 0.9, item.r * 0.9, item.r * 1.5);
        }
    }
}
initObstacles();

// ==================== AIM RETICLE ====================
const aimReticleGroup = new THREE.Group();
const reticleRingMat = new THREE.MeshBasicMaterial({ color: 0x00FF88, side: THREE.DoubleSide });
const reticleRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.1, 32),
    reticleRingMat
);
reticleRing.rotation.x = -Math.PI / 2;
aimReticleGroup.add(reticleRing);

const reticleDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 16),
    new THREE.MeshBasicMaterial({ color: 0x00FF88, side: THREE.DoubleSide })
);
reticleDot.rotation.x = -Math.PI / 2;
reticleDot.position.y = 0.01;
aimReticleGroup.add(reticleDot);

aimReticleGroup.position.set(0, 0.05, 10);
scene.add(aimReticleGroup);

// Player tank - more realistic shape
const tankHull = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.5, 5),
    new THREE.MeshLambertMaterial({ color: 0x2E8B57 })
);
tankHull.position.y = 0.75;

// Tracks
const trackGeometry = new THREE.BoxGeometry(0.6, 0.4, 5.5);
const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x1C1C1C });

const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
leftTrack.position.set(-2.2, 0.3, 0);

const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
rightTrack.position.set(2.2, 0.3, 0);

// Turret base
const turretBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.8, 1.2, 20),
    new THREE.MeshLambertMaterial({ color: 0x228B22 })
);
turretBase.position.y = 2.2;

// Turret main
const turretMain = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 0.8, 16),
    new THREE.MeshLambertMaterial({ color: 0x32CD32 })
);
turretMain.position.y = 2.8;

// Barrel
const barrelLength = 4;
const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.25, barrelLength, 10),
    new THREE.MeshLambertMaterial({ color: 0x696969 })
);
barrel.rotation.x = Math.PI / 2;
barrel.position.z = barrelLength / 2 + 0.8;
barrel.position.y = 2.8;

// Turret group
const turret = new THREE.Group();
turret.add(turretBase);
turret.add(turretMain);
turret.add(barrel);

const BARREL_REST_Z = barrelLength / 2 + 0.8; // 2.8
let barrelRecoilOffset = 0;

// Tank group
const tank = new THREE.Group();
tank.add(tankHull);
tank.add(leftTrack);
tank.add(rightTrack);
tank.add(turret);
tank.position.set(0, 0, 0);
scene.add(tank);

// Player state
const player = {
    health: 100,
    kills: 0,
    speed: 10,
    rotSpeed: 2,
    shootCooldown: 0,
    shootDelay: 0.5
};

// Input
const keys = {};
let mouseX = 0, mouseY = 0;
let isMouseDown = false;
let isRightMouseDown = false;
let prevMouseX = 0, prevMouseY = 0;
let orbitYaw = 0;
let camPitch = 0.6435;
let camDistance = 25;
let isPaused = false;

window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
    sound.init();
    if (e.code === 'KeyM') {
        const isMuted = sound.toggleMute();
        const soundEl = document.getElementById('soundVal');
        if (soundEl) soundEl.textContent = isMuted ? '🔇 MUTED' : '🔊 ON';
        return;
    }
    if (e.code === 'Escape') {
        if (!gameActive) return;
        isPaused = !isPaused;
        document.getElementById('pauseMenu').style.display = isPaused ? 'block' : 'none';
        if (isPaused && sound.engineGain && sound.ctx && !sound.isMuted) {
            sound.engineGain.gain.setValueAtTime(0, sound.ctx.currentTime);
        }
        return;
    }
    keys[e.code] = true;
});
window.addEventListener('keyup', e => keys[e.code] = false);

window.addEventListener('mousedown', e => {
    sound.init();
    if (e.button === 0) isMouseDown = true;
    if (e.button === 2) {
        isRightMouseDown = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
    }
});

window.addEventListener('mouseup', e => {
    if (e.button === 0) isMouseDown = false;
    if (e.button === 2) isRightMouseDown = false;
});

window.addEventListener('mousemove', e => {
    if (isRightMouseDown) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        orbitYaw += deltaX * 0.006;
        camPitch = Math.max(0.12, Math.min(1.35, camPitch - deltaY * 0.005));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
    }
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('wheel', e => {
    camDistance = Math.max(12, Math.min(55, camDistance + e.deltaY * 0.02));
});

function lerpAngle(current, target, factor) {
    let diff = (target - current) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return current + diff * factor;
}

// Camera Shake
let cameraShake = 0;
function addCameraShake(amount) {
    cameraShake = Math.min(cameraShake + amount, 1.5);
}

// Particle System
const particles = [];
const particleBoxGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);

function createExplosion(pos, count = 28) {
    const fireColors = [0xff4500, 0xff8c00, 0xffd700, 0x333333, 0x555555];
    for (let i = 0; i < count; i++) {
        const color = fireColors[Math.floor(Math.random() * fireColors.length)];
        const mat = new THREE.MeshLambertMaterial({ color: color });
        const pMesh = new THREE.Mesh(particleBoxGeo, mat);
        pMesh.position.copy(pos);
        pMesh.position.x += (Math.random() - 0.5) * 1.5;
        pMesh.position.y += 0.5 + Math.random() * 1.2;
        pMesh.position.z += (Math.random() - 0.5) * 1.5;

        const speed = 6 + Math.random() * 18;
        const angle = Math.random() * Math.PI * 2;
        const yVel = 4 + Math.random() * 14;

        scene.add(pMesh);
        particles.push({
            mesh: pMesh,
            velocity: new THREE.Vector3(
                Math.cos(angle) * speed * (0.4 + Math.random() * 0.6),
                yVel,
                Math.sin(angle) * speed * (0.4 + Math.random() * 0.6)
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12
            ),
            life: 0.5 + Math.random() * 0.6,
            maxLife: 1.1,
            gravity: 24,
            scaleShrink: true
        });
    }
}

function createHitSparks(pos) {
    const sparkColors = [0xffffff, 0xffe066, 0xff8c00];
    for (let i = 0; i < 7; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: sparkColors[Math.floor(Math.random() * sparkColors.length)] });
        const pMesh = new THREE.Mesh(particleBoxGeo, mat);
        pMesh.scale.set(0.4, 0.4, 0.4);
        pMesh.position.copy(pos);
        scene.add(pMesh);

        particles.push({
            mesh: pMesh,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 16,
                Math.random() * 10 + 2,
                (Math.random() - 0.5) * 16
            ),
            rotationSpeed: new THREE.Vector3(5, 5, 5),
            life: 0.25 + Math.random() * 0.2,
            maxLife: 0.45,
            gravity: 18,
            scaleShrink: true
        });
    }
}

function createMuzzleFlash(pos, dir) {
    for (let i = 0; i < 6; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        const pMesh = new THREE.Mesh(particleBoxGeo, mat);
        pMesh.scale.set(0.5, 0.5, 0.5);
        pMesh.position.copy(pos).add(dir.clone().multiplyScalar(Math.random() * 0.7));
        scene.add(pMesh);

        const spread = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );
        const vel = dir.clone().multiplyScalar(10 + Math.random() * 8).add(spread);
        particles.push({
            mesh: pMesh,
            velocity: vel,
            rotationSpeed: new THREE.Vector3(Math.random() * 6, Math.random() * 6, 0),
            life: 0.12 + Math.random() * 0.1,
            maxLife: 0.22,
            gravity: 2,
            scaleShrink: true
        });
    }
}

let dustTimer = 0;
function createTrackDust(pos) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x6e8b3d, transparent: true, opacity: 0.65 });
    const pMesh = new THREE.Mesh(particleBoxGeo, mat);
    pMesh.scale.set(0.45, 0.25, 0.45);
    pMesh.position.copy(pos);
    pMesh.position.y = 0.2;
    scene.add(pMesh);

    particles.push({
        mesh: pMesh,
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 0.8 + 0.3,
            (Math.random() - 0.5) * 1.5
        ),
        rotationSpeed: new THREE.Vector3(1, 1, 0),
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        gravity: -0.3,
        scaleShrink: true,
        fadeOpacity: true
    });
}

// Bullets
const bullets = [];
const bulletGeometry = new THREE.SphereGeometry(0.3, 8, 8);
const bulletMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });

function shoot(pos, dir, isPlayer) {
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bulletMesh.position.copy(pos);
    scene.add(bulletMesh);
    bullets.push({
        mesh: bulletMesh,
        velocity: dir.clone().multiplyScalar(50),
        isPlayer: isPlayer,
        life: 3
    });

    createMuzzleFlash(pos, dir);
    sound.playShoot(isPlayer, isPlayer ? 0 : tank.position.distanceTo(pos));
    if (isPlayer) {
        barrelRecoilOffset = -0.8;
        addCameraShake(0.35);
    }
}

// Enemy
const enemies = [];

function createTankMesh(color) {
    const hull = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.5, 5),
        new THREE.MeshLambertMaterial({ color: color })
    );
    hull.position.y = 0.75;

    const leftTrack = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.4, 5.5),
        new THREE.MeshLambertMaterial({ color: 0x1C1C1C })
    );
    leftTrack.position.set(-2.2, 0.3, 0);

    const rightTrack = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.4, 5.5),
        new THREE.MeshLambertMaterial({ color: 0x1C1C1C })
    );
    rightTrack.position.set(2.2, 0.3, 0);

    const turretBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.8, 1.2, 20),
        new THREE.MeshLambertMaterial({ color: color })
    );
    turretBase.position.y = 2.2;

    const turretMain = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 0.8, 16),
        new THREE.MeshLambertMaterial({ color: color })
    );
    turretMain.position.y = 2.8;

    const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, 4, 10),
        new THREE.MeshLambertMaterial({ color: 0x696969 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 2.8;
    barrel.position.y = 2.8;

    const tankGroup = new THREE.Group();
    tankGroup.add(hull);
    tankGroup.add(leftTrack);
    tankGroup.add(rightTrack);
    tankGroup.add(turretBase);
    tankGroup.add(turretMain);
    tankGroup.add(barrel);

    return tankGroup;
}

function spawnEnemy() {
    let spawnX = 0, spawnZ = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 40) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const dist = 35 + Math.random() * 45;
        spawnX = Math.cos(angle) * dist;
        spawnZ = Math.sin(angle) * dist;

        valid = true;
        for (const obs of obstacles) {
            const cx = Math.max(obs.minX, Math.min(obs.maxX, spawnX));
            const cz = Math.max(obs.minZ, Math.min(obs.maxZ, spawnZ));
            const dx = spawnX - cx;
            const dz = spawnZ - cz;
            if (dx * dx + dz * dz < (TANK_RADIUS + 1.5) * (TANK_RADIUS + 1.5)) {
                valid = false;
                break;
            }
        }
    }

    const enemyMesh = createTankMesh(0xDC143C);
    enemyMesh.position.set(spawnX, 0, spawnZ);
    scene.add(enemyMesh);
    
    enemies.push({
        mesh: enemyMesh,
        health: 50,
        shootCooldown: Math.random() * 2,
        shootDelay: 2
    });
}

// Spawn initial enemies
for (let i = 0; i < 5; i++) {
    spawnEnemy();
}

// Camera follow
camera.position.set(0, 15, -20);
camera.lookAt(0, 0, 0);

// UI update
function updateUI() {
    document.getElementById('healthVal').textContent = Math.max(0, player.health);
    document.getElementById('killsVal').textContent = enemies.length;
}

// Game over
function gameOver(win) {
    const gameOverDiv = document.getElementById('gameOver');
    const gameOverText = document.getElementById('gameOverText');
    gameOverText.textContent = win ? 'YOU WIN!' : 'GAME OVER';
    gameOverDiv.style.display = 'block';
    sound.playGameOver(win);
}

// Game loop
const clock = new THREE.Clock();
let gameActive = true;

function animate() {
    requestAnimationFrame(animate);
    if (!gameActive || isPaused) return;
    
    const dt = clock.getDelta();
    
    // Orbit rotation (Arrow keys or Right Mouse Drag)
    if (keys['ArrowLeft']) orbitYaw -= player.rotSpeed * dt;
    if (keys['ArrowRight']) orbitYaw += player.rotSpeed * dt;

    // Tank body smoothly follows orbit rotation
    tank.rotation.y = lerpAngle(tank.rotation.y, orbitYaw, Math.min(1, dt * 10));

    // Update Camera position based on orbit angles
    const hDist = camDistance * Math.cos(camPitch);
    const vHeight = camDistance * Math.sin(camPitch);

    camera.position.x = tank.position.x + hDist * Math.sin(orbitYaw + Math.PI);
    camera.position.y = tank.position.y + vHeight;
    camera.position.z = tank.position.z + hDist * Math.cos(orbitYaw + Math.PI);

    if (cameraShake > 0.005) {
        camera.position.x += (Math.random() - 0.5) * cameraShake * 2.5;
        camera.position.y += (Math.random() - 0.5) * cameraShake * 2.5;
        camera.position.z += (Math.random() - 0.5) * cameraShake * 2.5;
        cameraShake = THREE.MathUtils.lerp(cameraShake, 0, dt * 6);
    } else {
        cameraShake = 0;
    }
    camera.lookAt(tank.position.clone().add(new THREE.Vector3(0, 1.5, 0)));

    // Camera screen-relative vectors on XZ ground plane
    const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    camFwd.y = 0;
    camFwd.normalize();

    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    camRight.y = 0;
    camRight.normalize();

    let inputFwd = 0;
    let inputSide = 0;
    if (keys['KeyW'] || keys['ArrowUp']) inputFwd += 1;
    if (keys['KeyS'] || keys['ArrowDown']) inputFwd -= 1;
    if (keys['KeyA']) inputSide -= 1;
    if (keys['KeyD']) inputSide += 1;

    const moveDir = new THREE.Vector3();
    if (inputFwd !== 0 || inputSide !== 0) {
        moveDir.addScaledVector(camFwd, inputFwd);
        moveDir.addScaledVector(camRight, inputSide);
        moveDir.normalize();

        tank.position.add(moveDir.clone().multiplyScalar(player.speed * dt));
        // Keep in bounds
        tank.position.x = Math.max(-240, Math.min(240, tank.position.x));
        tank.position.z = Math.max(-240, Math.min(240, tank.position.z));

        // Resolve collision with obstacles
        resolveTankObstacleCollision(tank.position);

        // Track dust trail
        dustTimer += dt;
        if (dustTimer >= 0.08) {
            dustTimer = 0;
            const leftTrackOffset = new THREE.Vector3(-2.2, 0.2, -2.6).applyQuaternion(tank.quaternion);
            const rightTrackOffset = new THREE.Vector3(2.2, 0.2, -2.6).applyQuaternion(tank.quaternion);
            createTrackDust(tank.position.clone().add(leftTrackOffset));
            createTrackDust(tank.position.clone().add(rightTrackOffset));
        }
    }

    sound.updateEngine(moveDir.length() > 0 && gameActive && !isPaused);

    // Barrel recoil recovery
    barrelRecoilOffset = THREE.MathUtils.lerp(barrelRecoilOffset, 0, dt * 10);
    barrel.position.z = BARREL_REST_Z + barrelRecoilOffset;
    
    // Turret rotation (mouse aim) - project mouse to ground plane
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouse, camera);
    
    // Intersect with ground plane at y=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    if (intersectPoint) {
        aimReticleGroup.position.set(intersectPoint.x, 0.05, intersectPoint.z);

        const dirToMouse = new THREE.Vector3()
            .subVectors(intersectPoint, tank.position)
            .normalize();
        
        const worldAngle = Math.atan2(dirToMouse.x, dirToMouse.z);
        // Relative local angle so turret points accurately at the mouse target in world space
        let localAngle = worldAngle - tank.rotation.y;
        while (localAngle > Math.PI) localAngle -= Math.PI * 2;
        while (localAngle < -Math.PI) localAngle += Math.PI * 2;
        turret.rotation.y = localAngle;
    }
    
    // Shooting
    player.shootCooldown = Math.max(0, player.shootCooldown - dt);
    if ((isMouseDown || keys['Space']) && player.shootCooldown === 0) {
        const barrelWorldPos = new THREE.Vector3();
        barrel.getWorldPosition(barrelWorldPos);
        
        const shootDir = new THREE.Vector3(0, 0, 1);
        shootDir.applyQuaternion(turret.getWorldQuaternion(new THREE.Quaternion()));
        
        shoot(barrelWorldPos, shootDir, true);
        player.shootCooldown = player.shootDelay;
    }
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.mesh.position.add(bullet.velocity.clone().multiplyScalar(dt));
        bullet.life -= dt;
        
        if (bullet.life <= 0) {
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
            continue;
        }

        // Bullet collision with obstacles
        let hitObs = false;
        const bPos = bullet.mesh.position;
        for (const obs of obstacles) {
            if (bPos.y >= 0 && bPos.y <= obs.height) {
                if (bPos.x >= obs.minX - 0.35 && bPos.x <= obs.maxX + 0.35 &&
                    bPos.z >= obs.minZ - 0.35 && bPos.z <= obs.maxZ + 0.35) {
                    createHitSparks(bPos);
                    sound.playHit();
                    scene.remove(bullet.mesh);
                    bullets.splice(i, 1);
                    hitObs = true;
                    break;
                }
            }
        }
        if (hitObs) continue;

        // Collision with enemies — ignore Y, tank hitbox ~3.5 in XZ
        if (bullet.isPlayer) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const dx = bullet.mesh.position.x - enemy.mesh.position.x;
                const dz = bullet.mesh.position.z - enemy.mesh.position.z;
                const distXZ = Math.sqrt(dx * dx + dz * dz);
                if (distXZ < 3) {
                    enemy.health -= 50;
                    createHitSparks(bullet.mesh.position);
                    sound.playHit();
                    scene.remove(bullet.mesh);
                    bullets.splice(i, 1);
                    
                    if (enemy.health <= 0) {
                        createExplosion(enemy.mesh.position, 34);
                        sound.playExplosion(tank.position.distanceTo(enemy.mesh.position));
                        addCameraShake(0.5);
                        scene.remove(enemy.mesh);
                        enemies.splice(j, 1);
                        player.kills++;
                        
                        // Spawn new enemy
                        if (enemies.length < 5) {
                            spawnEnemy();
                        }
                        
                        // Win condition
                        if (player.kills >= 20) {
                            gameActive = false;
                            gameOver(true);
                        }
                    }
                    break;
                }
            }
        } else {
            // Enemy bullet hits player — ignore Y
            const dx = bullet.mesh.position.x - tank.position.x;
            const dz = bullet.mesh.position.z - tank.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 3) {
                player.health -= 20;
                createHitSparks(bullet.mesh.position);
                sound.playHit();
                addCameraShake(0.55);
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);
                
                if (player.health <= 0) {
                    createExplosion(tank.position, 48);
                    sound.playExplosion(0);
                    addCameraShake(1.2);
                    gameActive = false;
                    gameOver(false);
                }
            }
        }
    }
    
    // Enemy AI
    for (const enemy of enemies) {
        // Chase player
        const dirToPlayer = new THREE.Vector3()
            .subVectors(tank.position, enemy.mesh.position)
            .normalize();
        
        const dist = enemy.mesh.position.distanceTo(tank.position);
        if (dist > 15) {
            enemy.mesh.position.add(dirToPlayer.multiplyScalar(3 * dt));
            resolveTankObstacleCollision(enemy.mesh.position);
        }
        
        enemy.mesh.lookAt(tank.position);
        
        // Shoot at player
        enemy.shootCooldown -= dt;
        if (enemy.shootCooldown <= 0 && dist < 50) {
            const enemyShootDir = dirToPlayer.clone();
            shoot(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), enemyShootDir, false);
            enemy.shootCooldown = enemy.shootDelay + Math.random();
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
        if (p.gravity) {
            p.velocity.y -= p.gravity * dt;
            // Floor bounce / clamp
            if (p.mesh.position.y < 0.1) {
                p.mesh.position.y = 0.1;
                p.velocity.y = -p.velocity.y * 0.3;
                p.velocity.x *= 0.8;
                p.velocity.z *= 0.8;
            }
        }
        p.mesh.rotation.x += p.rotationSpeed.x * dt;
        p.mesh.rotation.y += p.rotationSpeed.y * dt;
        p.mesh.rotation.z += p.rotationSpeed.z * dt;
        p.life -= dt;

        if (p.scaleShrink) {
            const scale = Math.max(0.01, p.life / p.maxLife);
            p.mesh.scale.set(scale, scale, scale);
        }
        if (p.fadeOpacity && p.mesh.material && p.mesh.material.opacity !== undefined) {
            p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
        }

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
    
    updateUI();
    renderer.render(scene, camera);
}

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

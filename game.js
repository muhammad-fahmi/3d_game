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

// Ground
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7CFC00 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Grid
const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x888888);
scene.add(gridHelper);

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
let isPaused = false;

window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
        if (!gameActive) return;
        isPaused = !isPaused;
        document.getElementById('pauseMenu').style.display = isPaused ? 'block' : 'none';
        return;
    }
    keys[e.code] = true;
});
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

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
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 40;
    const enemyMesh = createTankMesh(0xDC143C);
    enemyMesh.position.set(
        Math.cos(angle) * dist,
        0,
        Math.sin(angle) * dist
    );
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
}

// Game loop
const clock = new THREE.Clock();
let gameActive = true;

function animate() {
    requestAnimationFrame(animate);
    if (!gameActive || isPaused) return;
    
    const dt = clock.getDelta();
    
    // Tank rotation (Arrow keys)
    if (keys['ArrowLeft']) tank.rotation.y += player.rotSpeed * dt;
    if (keys['ArrowRight']) tank.rotation.y -= player.rotSpeed * dt;

    // Tank movement
    const moveDir = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp']) moveDir.z += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveDir.z -= 1;
    if (keys['KeyA']) moveDir.x += 1;
    if (keys['KeyD']) moveDir.x -= 1;
    
    if (moveDir.length() > 0) {
        moveDir.normalize();
        const worldDir = moveDir.applyQuaternion(tank.quaternion);
        tank.position.add(worldDir.multiplyScalar(player.speed * dt));
        // Keep in bounds
        tank.position.x = Math.max(-240, Math.min(240, tank.position.x));
        tank.position.z = Math.max(-240, Math.min(240, tank.position.z));
    }
    
    // Turret rotation (mouse aim) - project mouse to ground plane
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouse, camera);
    
    // Intersect with ground plane at y=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    if (intersectPoint) {
        const dirToMouse = new THREE.Vector3()
            .subVectors(intersectPoint, tank.position)
            .normalize();
        
        const angle = Math.atan2(dirToMouse.x, dirToMouse.z);
        turret.rotation.y = angle;
    }
    
    // Shooting
    player.shootCooldown = Math.max(0, player.shootCooldown - dt);
    if (keys['Space'] && player.shootCooldown === 0) {
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
        
        // Collision with enemies — ignore Y, tank hitbox ~3.5 in XZ
        if (bullet.isPlayer) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const dx = bullet.mesh.position.x - enemy.mesh.position.x;
                const dz = bullet.mesh.position.z - enemy.mesh.position.z;
                const distXZ = Math.sqrt(dx * dx + dz * dz);
                if (distXZ < 3) {
                    enemy.health -= 50;
                    scene.remove(bullet.mesh);
                    bullets.splice(i, 1);
                    
                    if (enemy.health <= 0) {
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
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);
                
                if (player.health <= 0) {
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
    
    // Camera follow
    const cameraOffset = new THREE.Vector3(0, 15, -20);
    cameraOffset.applyQuaternion(tank.quaternion);
    camera.position.copy(tank.position).add(cameraOffset);
    camera.lookAt(tank.position);
    
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

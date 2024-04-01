import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// threejs base
let scene, camera, renderer, composer, renderPass, unrealBloomPass;;
// back- and foreground models
let sun, grid1, grid2, gridDistance, stars, arrow;
// text variables and font
let font, currentTextIndex = 0, textMeshes = [], textSize = 2;
const textStrings = ["David Dahncke", "Freelancer", "Software Engineer", "Coach", "Consultant", "AI Creative", "C++", "Python", "Kotlin", "Java", "Swift", "C#", "Mobile", "Desktop", "Web"];
// light streak attributes
const lightStreaks = [], streakCount = 150, streakLength = 75;
// interaction attributes
let mouseX = 0, mouseY = 0, windowHalfX = window.innerWidth / 2, windowHalfY = window.innerHeight / 2;

function initPostProcessing() {
    composer = new EffectComposer(renderer);
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    unrealBloomPass.threshold = 0.021;
    unrealBloomPass.strength = 1.25; // bloom strength, glow amount
    unrealBloomPass.radius = 0.55; // glow radius

    composer.addPass(unrealBloomPass);
}

function init() {
    // basic trhree js scene, camera, renderer setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 20); 
    textSize = camera.aspect * 2;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("threejs-canvas").appendChild(renderer.domElement);

    // ambient lightning
    scene.add(new THREE.AmbientLight(0x404040));

    initPostProcessing();
    initGridMeshes();
    initLightStreaks();
    initSunMesh();
    initArrow();
    initStars();
    initTextMeshes();

    animate();
}

function initSunMesh() {
    const textureLoader = new THREE.TextureLoader();
    const glowTexture = textureLoader.load('textures/glow_tex.png');

    const glowMaterial = new THREE.SpriteMaterial({ 
        map: glowTexture,
        color: 0xff51c8,
        transparent: true,
        blending: THREE.AdditiveBlending // glow effect blend with the scene
    });

    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(100, 100, 1); // adjust size to match the sun's glow effect

    const sunMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            varying vec2 vUv; // Added for accessing the UV coordinates in the fragment shader
    
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vUv = uv; // Pass the UV coordinates to the fragment shader
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            varying vec2 vUv; // Received from the vertex shader
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
    
            void main() {
                float h = normalize(vNormal).y;
                float intensity = pow(max(h + offset, 0.0), exponent);
                vec4 color = vec4(mix(bottomColor, topColor, intensity), 1.0);
    
                // Calculate transparency gradient
                float alpha = smoothstep(0.0, 0.6, vUv.y); // Gradually becomes transparent from top to bottom
    
                // Create transparent lines
                float line1 = smoothstep(0.35, 0.36, vUv.y) - smoothstep(0.36, 0.37, vUv.y);
                float line2 = smoothstep(0.34, 0.35, vUv.y) - smoothstep(0.35, 0.36, vUv.y);
                float line3 = smoothstep(0.31, 0.32, vUv.y) - smoothstep(0.33, 0.34, vUv.y);
                float line4 = smoothstep(0.27, 0.29, vUv.y) - smoothstep(0.30, 0.32, vUv.y);
                float line5 = smoothstep(0.05, 0.26, vUv.y) - smoothstep(0.27, 0.40, vUv.y);
                float lines = max(line1, max(line2, max(line3, max(line4, line5))));
    
                // Decrease alpha where the lines are
                alpha *= 1.0 - lines;
    
                // Apply the transparency gradient to the alpha component
                gl_FragColor = vec4(color.rgb, color.a * alpha);
            }
        `,
        uniforms: {
            topColor: { value: new THREE.Color(0xffab00) },
            bottomColor: { value: new THREE.Color(0xff51c8) },
            offset: { value: .4 },
            exponent: { value: 0.9 }
        },
        transparent: true,
    });
    
    
    const sunGeometry = new THREE.SphereGeometry(64, 32, 32);
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.add(glowSprite);
    sun.rotateY(180);
    sun.position.set(0, 80, -250);
    scene.add(sun);
}

function initGridMeshes() {
    let gridDimension = 600;
    gridDistance = gridDimension;

    // initialize the first grid 
    grid1 = createBentGrid(gridDimension, 50);
    grid1.position.set(0, -1, -(gridDimension / 2));

    // initialize the second grid, position right at the end of the first grid
    grid2 = createBentGrid(600, 50);
    grid2.position.set(0, -1, -300 - gridDistance);
}

function createBentGrid(size, divisions) {
    const gridGeometry = new THREE.PlaneGeometry(size, size * 2, divisions, divisions);
    gridGeometry.rotateX(-Math.PI / 2); // orient the grid horizontally

    // access the position attribute of the geometry
    const positions = gridGeometry.attributes.position;
    const sizeHalf = size / 4;

    // modify the y position of each vertex to bend the grid at the edges
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const normalizedX = Math.abs(x) / sizeHalf; // normalized distance from center
        const bendAmount = Math.pow(normalizedX, 4) * 12; // quadratic curve for smoother transition
        const y = positions.getY(i) + bendAmount;
        positions.setY(i, y);
    }

    positions.needsUpdate = true; // mark the positions as needing an update
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0xff51c8, wireframe: true });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    scene.add(gridMesh);

    return gridMesh;
}

function initLightStreaks() {
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, streakLength, 32);
    const material = new THREE.MeshBasicMaterial({color: 0xffffff});
    
    for (let i = 0; i < streakCount; i++) {
        const streak = new THREE.Mesh(geometry, material);
       
        // position the streaks randomly in front of the camera and orient them
        resetSingleLightStreak(streak, true);
        
        // rotate to face the camera directly, simulating a light streak
        streak.rotation.x = Math.PI / 2;
        
        scene.add(streak);
        lightStreaks.push(streak);
    }
}

function resetSingleLightStreak(streak, initial) {
    const cameraFarDistanceHalf = 500;
    const distance = initial ? Math.random() * cameraFarDistanceHalf : cameraFarDistanceHalf;
    const angle = Math.random() * 2 * Math.PI;
    
    streak.position.x = Math.cos(angle) * distance;
    streak.position.y = Math.sin(angle) * distance;
    streak.position.z = -(distance * 2) + (initial ? Math.random() * cameraFarDistanceHalf : 0);
}

function animateLightStreaks() {
    lightStreaks.forEach(streak => {
        streak.position.z += 5; // move towards the camera
        
        if (streak.position.z > 10) {
            resetSingleLightStreak(streak, false); // reset position if it's too close
        }
    });
}

function initStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.7,
        sizeAttenuation: true
    });

    const starVertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = -Math.random() * 2000;
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
}

function updateCameraLookAt() {
    // adjust these values to control the sensitivity or speed of the camera movement
    const lookSpeedX = mouseX * 4;
    const lookSpeedY = mouseY * 2;

    // vector representing where the camera is looking at
    let lookAtVector = new THREE.Vector3(
        camera.position.x + lookSpeedX,
        camera.position.y - lookSpeedY,
        camera.position.z - 10
    );

    camera.lookAt(lookAtVector);
}

function animate() {
    requestAnimationFrame(animate);

    updateCameraLookAt();

    animateSun();
    animateGrids();
    animateStars();
    animateTextMeshes();
    animateLightStreaks();
    animateArrow();

    composer.render();
}

function animateArrow() {
    const time = Date.now() * 0.005; // speed of the pulse effect

    // scale up and down
    const scale = Math.sin(time) * 0.1 + 0.9;
    arrow.scale.set(scale, scale, scale);
}

function animateStars() {
    stars.rotation.x += 0.0005;
    stars.rotation.y += 0.0005;
}

function animateGrids() {
    grid1.position.z += 0.5;
    grid2.position.z += 0.5;

    // check if the grid has moved completely through the view
    if (grid1.position.z >= 150) {
        grid1.position.z = grid2.position.z - gridDistance;
    }

    if (grid2.position.z >= 150) {
        grid2.position.z = grid1.position.z - gridDistance;
    }
}

function animateSun() {
    sun.rotation.y += 0.01;
}

function animateTextMeshes() {
    const fadeSpeed = 0.01;

    textMeshes.forEach((mesh, index) => {
        if (!mesh.userData.fadeState) {
            mesh.userData.fadeState = 'in';
            mesh.material.opacity = 0;
        }

        // handle fading in
        if (mesh.userData.fadeState === 'in') {
            mesh.material.opacity += fadeSpeed;
            if (mesh.material.opacity >= 1) {
                mesh.userData.fadeState = 'visible';
                mesh.userData.visibleTimer = 60;
            }
        }

        // handle visible state
        if (mesh.userData.fadeState === 'visible') {
            mesh.userData.visibleTimer--;
            if (mesh.userData.visibleTimer <= 0) {
                mesh.userData.fadeState = 'out';
            }
        }

        // handle fading out
        if (mesh.userData.fadeState === 'out') {
            mesh.material.opacity -= fadeSpeed;
            if (mesh.material.opacity <= 0) {
                mesh.userData.fadeState = 'in';
                mesh.material.opacity = 0;
                
                scene.remove(mesh);
                textMeshes.shift(); 
                createText();
            }
        }
    });
}

function createText() {
    if (!font || textMeshes.length >= textStrings.length) return;

    const text = textStrings[currentTextIndex];
    const height = 0.75;

    const geometry = new TextGeometry(text, {
        font: font,
        size: textSize,
        height: height,
    });

    const material = new THREE.MeshBasicMaterial({ color: 0xfff00f, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(geometry, material);

    geometry.computeBoundingBox();
    const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x;

    mesh.position.set(-textWidth / 2, 10, 0);
    mesh.userData = {
        fadeState: 'in',
        visibleTimer: 100, // frames to stay fully visible before fading out
    };

    scene.add(mesh);
    textMeshes.push(mesh);

    currentTextIndex = (currentTextIndex + 1) % textStrings.length;
}

function initArrow() {
    const arrowShape = new THREE.Shape();
    const arrowSize = 2;

    arrowShape.moveTo(0, -arrowSize);
    arrowShape.lineTo(-arrowSize / 1.5, 0);
    arrowShape.lineTo(arrowSize / 1.5, 0);
    arrowShape.lineTo(0, -arrowSize);

    const geometry = new THREE.ShapeGeometry(arrowShape);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    arrow = new THREE.Mesh(geometry, material);

    arrow.position.set(0, -10, -10);
    arrow.rotation.x = Math.PI / 2;
    arrow.rotateX(180);

    scene.add(arrow);
}

function initTextMeshes() {
    const loader = new FontLoader();
    loader.load('font/helvetiker_regular.typeface.json', function (loadedFont) {
        font = loadedFont;
        createText();
    });
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 1000;
    mouseY = (event.clientY - windowHalfY) / 800;
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    textSize = camera.aspect * 2;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(e) {
    let className = "#threejs-canvas";
    if (e.target.tagName == "CANVAS") {
        className = ".content";
    }
    
    const element = document.querySelector(`${className}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

document.addEventListener('mousemove', onDocumentMouseMove, false);
window.addEventListener('resize', onWindowResize, false);
window.addEventListener('click', onMouseClick, false);

init();

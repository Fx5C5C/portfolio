import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

let scene, camera, renderer, sun, grid1, grid2, gridDistance, stars;
let font, textStrings = ["David Dahncke", "Freelancer", "Software Engineer", "Coach", "Consultant", "AI Creative", "C++", "Python", "Kotlin", "Java", "Swift", "C#", "Mobile", "Desktop", "Web"], currentTextIndex = 0, textMeshes = [];
let lightStreaks = [], streakCount = 250, streakLength = 50;
let mouseX = 0, mouseY = 0, windowHalfX = window.innerWidth / 2, windowHalfY = window.innerHeight / 2;
let arrow, textColor = 0xff00ff, neonMaterial;
let composer, renderPass, unrealBloomPass;

function initPostProcessing() {
    composer = new EffectComposer(renderer);
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    unrealBloomPass.threshold = 0.21;
    unrealBloomPass.strength = 1.5; // Bloom strength. The glow amount
    unrealBloomPass.radius = 0.55; // Glow radius

    composer.addPass(unrealBloomPass);
}


function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Set a background color

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 20); // Position the camera

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("threejs-canvas").appendChild(renderer.domElement);
    initPostProcessing();

    gridDistance = 300;
     // Initialize the first grid
     grid1 = createBentGrid(300, 50);
     grid1.position.set(0, -1, -150);
 
     // Initialize the second grid, positioned right at the end of the first grid
     grid2 = createBentGrid(300, 50);
     grid2.position.set(0, -1, -150 - gridDistance);

     createLightStreak();

     neonMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00, // Neon green, for example
        emissive: 0x00ff00, // Match the color for glow effect
        emissiveIntensity: 0.5,
    });


    // Add a simple sun

    const textureLoader = new THREE.TextureLoader();
    const glowTexture = textureLoader.load('textures/glow_tex.png'); // Replace with your texture path

    const glowMaterial = new THREE.SpriteMaterial({ 
        map: glowTexture,
        color: 0xff51c8, // Optional: Tint the glow with the sun's color
        transparent: true,
        blending: THREE.AdditiveBlending // This makes the glow effect blend with the scene
    });

    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(240, 240, 1); // Adjust size to match the sun's glow effect you desire

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
                float line5 = smoothstep(0.00, 0.16, vUv.y) - smoothstep(0.01, 0.40, vUv.y);
                float lines = max(line1, max(line2, max(line3, max(line4, line5))));
    
                // Decrease alpha where the lines are
                alpha *= 1.0 - lines;
    
                // Apply the transparency gradient to the alpha component
                gl_FragColor = vec4(color.rgb, color.a * alpha);
            }
        `,
        uniforms: {
            topColor: { value: new THREE.Color(0xffab00) }, // Yellow
            bottomColor: { value: new THREE.Color(0xff51c8) }, // Orange
            offset: { value: 0.8 },
            exponent: { value: 0.6 }
        },
        transparent: true, // Enable transparency
    });
    
    
    const sunGeometry = new THREE.SphereGeometry(64, 32, 32);
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.add(glowSprite);
    sun.rotateY(180);
    sun.position.set(0, 80, -250);
    scene.add(sun);

    arrow = createArrow(scene);

    // Lighting (ambient)
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);

    addStars();
    loadFont();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();
}

function createBentGrid(size, divisions) {
    const gridGeometry = new THREE.PlaneGeometry(size, size, divisions, divisions);
    gridGeometry.rotateX(-Math.PI / 2); // Orient the grid horizontally

    // Access the position attribute of the geometry
    const positions = gridGeometry.attributes.position;
    const sizeHalf = size / 4;

    // Modify the y position of each vertex to bend the grid smoothly downwards at the edges
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        // Adjust the formula to ensure the bend is downwards towards the edges
        const normalizedX = Math.abs(x) / sizeHalf; // Normalized distance from center
        const bendAmount = Math.pow(normalizedX, 2) * 12; // Quadratic curve for smoother transition

        // Apply the bend amount, ensuring it's only applied downwards
        const y = positions.getY(i) + bendAmount;
        positions.setY(i, y);
    }
    positions.needsUpdate = true; // Important! Mark the positions as needing an update

    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0xff51c8, wireframe: true });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    scene.add(gridMesh);
    return gridMesh;
}

function addStars() {
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
    // Variables for camera look direction
    // Adjust these values to control the sensitivity or speed of the camera movement
    const lookSpeedX = mouseX * 4; // 2 is an arbitrary speed factor
    const lookSpeedY = mouseY * 2; // Adjust this to make the vertical movement faster or slower

    // Create a vector representing where the camera is looking at
    let lookAtVector = new THREE.Vector3(
        camera.position.x + lookSpeedX,
        camera.position.y - lookSpeedY,
        camera.position.z - 10// Assuming you want to keep looking forward to some degree
    );

    // Make the camera look at the new vector
    camera.lookAt(lookAtVector);
}

function animate() {
    requestAnimationFrame(animate);

    updateCameraLookAt();

    // Rotate the sun for a simple animation
    //sun.rotation.z += 0.01;
    sun.rotation.y += 0.01;

     // Move both grids
    grid1.position.z += 0.5;
    grid2.position.z += 0.5;

    // Check if the first grid has moved completely through the view
    if (grid1.position.z >= 150) { // Assuming the camera view ends at z = 100
        grid1.position.z = grid2.position.z - gridDistance;
    }

    // Do the same for the second grid
    if (grid2.position.z >= 150) {
        grid2.position.z = grid1.position.z - gridDistance;
    }

    stars.rotation.x += 0.0005;
    stars.rotation.y += 0.0005;
    animateTextMeshes();
    updateLightStreaks();

    const time = Date.now() * 0.005; // Adjust the speed of the pulsing effect

    // Create a pulsing effect by scaling up and down
    const scale = Math.sin(time) * 0.1 + 0.9; // Oscillates between 0.8 and 1.0
    arrow.scale.set(scale, scale, scale);

    // Render the scene
    //renderer.render(scene, camera);
    composer.render();
}

function animateTextMeshes() {
    const fadeSpeed = 0.01; // Speed of fading

    textMeshes.forEach((mesh, index) => {
        if (!mesh.userData.fadeState) {
            mesh.userData.fadeState = 'in'; // Initial fade state
            mesh.material.opacity = 0; // Ensure starting with opacity 0
        }

        // Handle fading in
        if (mesh.userData.fadeState === 'in') {
            mesh.material.opacity += fadeSpeed;
            if (mesh.material.opacity >= 1) {
                mesh.userData.fadeState = 'visible';
                mesh.userData.visibleTimer = 60; // Frames to stay fully visible
            }
        }

        // Handle visible state
        if (mesh.userData.fadeState === 'visible') {
            mesh.userData.visibleTimer--;
            if (mesh.userData.visibleTimer <= 0) {
                mesh.userData.fadeState = 'out';
            }
        }

        // Handle fading out
        if (mesh.userData.fadeState === 'out') {
            mesh.material.opacity -= fadeSpeed;
            if (mesh.material.opacity <= 0) {
                mesh.userData.fadeState = 'in'; // Prepare for next cycle
                mesh.material.opacity = 0; // Ensure it does not go below 0
                // Move to the next text in the array
                scene.remove(mesh);
                textMeshes.shift(); // Remove the mesh from the array
                createText(); // Add a new text mesh
            }
        }
    });
}

function createText() {
    if (!font || textMeshes.length >= textStrings.length) return; // Ensure font is loaded and limit textMeshes

    const text = textStrings[currentTextIndex];
    const textSize = 2; // Size of the text
    const height = 0.75; // Thickness of the text

    const geometry = new TextGeometry(text, {
        font: font,
        size: textSize,
        height: height,
    });

    // Adjust material for transparency and initial opacity
    const material = new THREE.MeshBasicMaterial({ color: 0xfff00f, transparent: true, opacity: 0 });

    const mesh = new THREE.Mesh(geometry, material);

    // Calculate the width of the text for centering
    geometry.computeBoundingBox();
    const textWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x;

    // Set initial position and user data for animation
    mesh.position.set(-textWidth / 2, 10, 0); // Adjust position as needed
    mesh.userData = {
        fadeState: 'in', // Initial fade state
        visibleTimer: 100, // Frames to stay fully visible before fading out
    };

    scene.add(mesh);
    textMeshes.push(mesh);

    // Prepare for the next text
    currentTextIndex = (currentTextIndex + 1) % textStrings.length;
}

function createArrow(scene) {
    const arrowShape = new THREE.Shape();
    const arrowSize = 2; // Adjust the size of the arrow as needed

    // Draw an arrow shape
    arrowShape.moveTo(0, -arrowSize);
    arrowShape.lineTo(-arrowSize / 1.5, 0);
    arrowShape.lineTo(arrowSize / 1.5, 0);
    arrowShape.lineTo(0, -arrowSize);

    const geometry = new THREE.ShapeGeometry(arrowShape);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const arrowMesh = new THREE.Mesh(geometry, material);

    // Position the arrow at the bottom of the screen
    arrowMesh.position.set(0, -10, -10); // Adjust the position according to your scene setup
    arrowMesh.rotation.x = Math.PI / 2; // Rotate to face the camera if necessary
    arrowMesh.rotateX(180);

    scene.add(arrowMesh);

    return arrowMesh;
}

// Function to load the font
function loadFont() {
    const loader = new FontLoader();
    loader.load('node_modules/three/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
        font = loadedFont;
        createText(); // Initial call to create text after the font is loaded
    });
}

function createLightStreak() {
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, streakLength, 32);
    const material = new THREE.MeshBasicMaterial({color: 0xffffff});
    
    for (let i = 0; i < streakCount; i++) {
        const streak = new THREE.Mesh(geometry, material);
        
        // Position the streaks randomly in front of the camera and orient them
        resetStreak(streak, true);
        
        // Rotate to face the camera directly, simulating a light streak
        streak.rotation.x = Math.PI / 2;
        
        scene.add(streak);
        lightStreaks.push(streak);
    }
}

function resetStreak(streak, initial) {
    const distance = initial ? Math.random() * 500 : 500; // Start further away if initial
    const angle = Math.random() * 2 * Math.PI;
    
    streak.position.x = Math.cos(angle) * distance;
    streak.position.y = Math.sin(angle) * distance;
    streak.position.z = -distance + (initial ? Math.random() * 500 : 0); // Offset on z-axis
}

function updateLightStreaks() {
    lightStreaks.forEach(streak => {
        streak.position.z += 5; // Move towards the camera
        
        if (streak.position.z > 10) {
            resetStreak(streak, false); // Reset position if it's too close
        }
    });
}

// Adjust the camera's position slightly based on mouse movement
function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 1000;
    mouseY = (event.clientY - windowHalfY) / 800;
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    composer.setSize(window.innerWidth, window.innerHeight); // Update the composer size
    //renderer.setSize(window.innerWidth, window.innerHeight);
}

document.addEventListener('mousemove', onDocumentMouseMove, false);
window.addEventListener('resize', onWindowResize, false);
init();

import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import {TextGeometry} from 'three/examples/jsm/geometries/TextGeometry.js';

let scene, camera, renderer, sun, grid1, grid2, gridDistance, stars;
let font, textStrings = ["David Dahncke", "Development", "Coaching", "Consulting", "Freelance", "C++", "Python", "Kotlin", "Java", "Swift", "AI Tech", "Mobile", "Desktop", "Web"], currentTextIndex = 0, textMeshes = [];
let lightStreaks = [], streakCount = 250, streakLength = 50;


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

    gridDistance = 300;
     // Initialize the first grid
     grid1 = createBentGrid(300, 50);
     grid1.position.set(0, -1, -150);
 
     // Initialize the second grid, positioned right at the end of the first grid
     grid2 = createBentGrid(300, 50);
     grid2.position.set(0, -1, -150 - gridDistance);

     createLightStreak();

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
    glowSprite.scale.set(60, 60, 1); // Adjust size to match the sun's glow effect you desire

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
    
    
    const sunGeometry = new THREE.SphereGeometry(12, 32, 32);
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.add(glowSprite);
    sun.rotateY(180);
    sun.position.set(0, 20, -25);
    scene.add(sun);

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

function animate() {
    requestAnimationFrame(animate);

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

    // Render the scene
    renderer.render(scene, camera);
}

function animateTextMeshes() {
    textMeshes.forEach(mesh => {
        mesh.position.z += 0.9; // Adjust speed
        const distance = mesh.position.distanceTo(camera.position);
        
        // Determine the scale factor based on the distance
        // Assuming you want the text to be fully scaled (scale = 1) when it's at a distance of 100 units from the camera
        let scale = distance / 300;
        scale = Math.min(Math.max(scale, 0), 1); // Clamp scale between 0 and 1
        let posX = mesh.scale.x;
        mesh.position.x = posX;

        // Apply the scale factor
        mesh.scale.set(1 - scale, 1 - scale, 0.5);

        if (mesh.position.z > 50) { // When out of view
            scene.remove(mesh); // Remove from the scene
            textMeshes.shift(); // Remove from the array
        }
    });

    // Check to add new text
    if (textMeshes.length === 0) {
        createText(); // Create a new text mesh
    }
}

// Function to load the font
function loadFont() {
    const loader = new FontLoader();
    loader.load('node_modules/three/examples/fonts/helvetiker_regular.typeface.json', function (loadedFont) {
        font = loadedFont;
        createText(); // Initial call to create text after the font is loaded
    });
}

// Function to create text mesh and add it to the scene
function createText() {
    if (!font) return; // Ensure the font is loaded

    const text = textStrings[currentTextIndex];
    const geometry = new TextGeometry(text, {
        font: font,
        size: 4, // Adjust size
        height: 1.75, // Adjust thickness of the text
    });
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);

    // Position the text mesh
    mesh.position.set(-50, 10, -250); // Start position behind the sun
    scene.add(mesh);
    textMeshes.push(mesh);

    // Update the index for the next text
    currentTextIndex = (currentTextIndex + 1) % textStrings.length;
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



function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();

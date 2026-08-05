import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { PLANETS, DWARF_PLANETS, SUN_DATA, MOON_DATA } from './planetData.js';
import {
  createStarfield,
  createSunGlow,
  createEarthTexture,
  createEarthCloudTexture,
  createMarsTexture,
  createJupiterTexture,
  createSaturnTexture,
  createSaturnRingTexture,
  createUranusTexture,
  createUranusRingTexture,
  createNeptuneTexture,
  createMercuryTexture,
  createVenusTexture,
  createComet,
  createPlutoTexture,
  createCeresTexture,
  createErisTexture
} from './helpers.js';

let scene, camera, renderer, labelRenderer, controls, composer;
let stars, sun, sunGlow, outerGlow;
let clock;
let planetMeshes = [];
let dwarfPlanetMeshes = [];
let orbitLines = [];
let earthClouds;
let moon;
let moonOrbit;
let gasGiantsMoons = [];
let comets = [];

let simulationSpeed = 1;
let isPaused = false;
let showOrbits = true;
let showLabels = true;
let showStars = true;
let showRotation = true;
let autoRotate = false;
let showDwarfPlanets = true;

let raycaster, mouse;
let hoveredPlanet = null;
let hoveredOriginalEmissive = 0x111111;
let selectedPlanet = null;
let planetLabels = [];

let fpsCounter = 0;
let lastFpsUpdate = 0;
let frameCount = 0;

let timeTravelDate = new Date();
let isTimeTravelMode = false;

// Shooting stars
let shootingStars = [];
let shootingStarTimer = 0;

// Orbit trails
let orbitTrails = [];
const TRAIL_LENGTH = 200;

// Guided tour
let isTourActive = false;
let tourStopIndex = 0;
let tourAutoTimer = null;
let tourFollowTarget = null;   // The 3D object to track (group)
let tourFollowDistance = 15;   // Camera distance from target
let tourTransitioning = false; // True during camera fly-to transition

// Mini-map
let minimapCanvas = null;
let minimapCtx = null;

// Ambient sound
let audioCtx = null;
let ambientGain = null;
let ambientOscillators = [];
let isSoundOn = false;

const sunData = SUN_DATA;
const moonData = MOON_DATA;

const defaultCameraPosition = new THREE.Vector3(50, 80, 150);
const defaultControlsTarget = new THREE.Vector3(0, 0, 0);

/** Shared raycaster helper — returns all intersectable objects */
function getClickableObjects() {
  const clickables = [sun, moon, ...planetMeshes.map(p => p.mesh), ...dwarfPlanetMeshes.map(p => p.mesh), ...gasGiantsMoons.map(m => m.mesh)];
  return clickables.filter(Boolean);
}

/** Resolve a raycaster hit to a known object type */
function resolveIntersection(intersected) {
  let current = intersected;
  while (current && current !== scene) {
    if (current === sun) return { type: 'sun', object: sun, data: sunData };
    if (current === moon) return { type: 'moon', object: moon, data: moonData };
    if (current.userData.isMoon && current.userData.moonData) {
      const md = current.userData.moonData;
      const pp = current.userData.planetData;
      return {
        type: 'submoon',
        object: current,
        data: {
          name: md.name,
          diameter: md.diameter || 'N/A',
          distance: md.distance + ' (from ' + (pp ? pp.name : 'planet') + ')',
          orbitalSpeed: md.speed + 'x',
          orbitalPeriod: md.orbitalPeriod || 'N/A',
          rotationPeriod: 'N/A',
          temperature: md.temperature || 'N/A',
          moons: '0',
          funFact: md.funFact,
          educational: md.educational || null
        },
        moonData: md,
        parentData: pp
      };
    }
    if (current.userData.planetData) {
      return { type: 'planet', object: current, data: current.userData.planetData };
    }
    current = current.parent;
  }
  return null;
}

init();
animate();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 50, 500); // Start far for intro fly-in

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('solarSystem'),
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  document.getElementById('label-container').appendChild(labelRenderer.domElement);

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,
    0.4,
    0.2
  );
  composer.addPass(bloomPass);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 800;
  controls.enablePan = true;
  controls.panSpeed = 1.0;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.2;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.5;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  createLighting();
  createSpaceBackground();
  createSun();
  createPlanets();
  createDwarfPlanets();
  createMoon();
  createGasGiantMoons();
  createAsteroidBelt();
  createComets();
  initOrbitTrails();
  setupEventListeners();
  setupUIControls();
  setupDraggable();
  setupComparison();
  setupPlanetSearch();
  setupGuidedTour();

  // Intro fly-in animation
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
    const uiContainer = document.getElementById('ui-container');
    uiContainer.style.opacity = '0';
    uiContainer.style.transition = 'opacity 1s ease-in';

    animateCamera(defaultCameraPosition.clone(), defaultControlsTarget.clone(), 3000, () => {
      uiContainer.style.opacity = '1';
    });
  }, 1200);
}

function createLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const sunLight = new THREE.PointLight(0xfff5e6, 3.0, 1500, 0.3);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.camera.far = 500;
  scene.add(sunLight);

  const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight1.position.set(50, 30, 50);
  scene.add(fillLight1);

  const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight2.position.set(-50, -20, -50);
  scene.add(fillLight2);

  const fillLight3 = new THREE.DirectionalLight(0xffffff, 0.25);
  fillLight3.position.set(0, 50, 0);
  scene.add(fillLight3);

  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
  scene.add(hemisphereLight);
}

function createSpaceBackground() {
  stars = createStarfield(8000);
  scene.add(stars);
}

function createSun() {
  const sunGeometry = new THREE.SphereGeometry(4, 64, 64);
  const sunMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(0xffaa22) },
      hotColor: { value: new THREE.Color(0xffdd66) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 baseColor;
      uniform vec3 hotColor;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      
      void main() {
        float n = noise(vUv * 8.0 + time * 0.3);
        float n2 = noise(vUv * 16.0 - time * 0.2);
        float n3 = noise(vUv * 32.0 + time * 0.1);
        
        float pattern = n * 0.5 + n2 * 0.3 + n3 * 0.2;
        
        vec3 color = mix(baseColor, hotColor, pattern);
        
        float edge = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        color += vec3(0.2, 0.05, 0.0) * edge * edge;
        
        float pulse = 1.0 + 0.05 * sin(time * 2.0);
        color *= pulse;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.userData.isSun = true;
  scene.add(sun);

  sunGlow = createSunGlow();
  sunGlow.scale.set(1.5, 1.5, 1.5);
  scene.add(sunGlow);

  const outerGlowGeometry = new THREE.SphereGeometry(5.5, 32, 32);
  const outerGlowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      glowColor: { value: new THREE.Color(0xff8800) }
    },
    vertexShader: `
      varying vec3 vNormal;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 glowColor;
      varying vec3 vNormal;
      
      void main() {
        float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        float pulse = 1.0 + 0.1 * sin(time * 1.8);
        gl_FragColor = vec4(glowColor, intensity * pulse * 0.3);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
  outerGlow.scale.set(2.0, 2.0, 2.0);
  scene.add(outerGlow);

  const sunLabelDiv = document.createElement('div');
  sunLabelDiv.className = 'planet-label';
  sunLabelDiv.textContent = 'Sun';
  const sunLabel = new CSS2DObject(sunLabelDiv);
  sunLabel.position.set(0, 5.5, 0);
  sun.add(sunLabel);
  planetLabels.push({ object: sunLabel, element: sunLabelDiv, distance: 0 });
}

function createPlanets() {
  const textureCreators = {
    'Mercury': createMercuryTexture,
    'Venus': createVenusTexture,
    'Earth': createEarthTexture,
    'Mars': createMarsTexture,
    'Jupiter': createJupiterTexture,
    'Saturn': createSaturnTexture,
    'Uranus': createUranusTexture,
    'Neptune': createNeptuneTexture
  };

  PLANETS.forEach((planetData, index) => {
    const planetGroup = new THREE.Group();
    const planetGeometry = new THREE.SphereGeometry(planetData.radius, 64, 64);

    let planetMaterial;
    const textureCreator = textureCreators[planetData.name];
    if (textureCreator) {
      const texture = textureCreator();
      planetMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.5,
        metalness: 0.05,
        emissive: new THREE.Color(0x111111),
        emissiveIntensity: 0.3
      });
    } else {
      planetMaterial = new THREE.MeshStandardMaterial({
        color: planetData.color,
        roughness: 0.5,
        metalness: 0.05,
        emissive: new THREE.Color(0x111111),
        emissiveIntensity: 0.3
      });
    }

    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.castShadow = true;
    planet.receiveShadow = true;
    planet.rotation.z = planetData.tilt;
    planet.userData.planetData = planetData;
    planet.userData.isPlanet = true;

    planetGroup.add(planet);

    if (planetData.name === 'Earth') {
      const cloudGeometry = new THREE.SphereGeometry(planetData.radius * 1.02, 64, 64);
      const cloudTexture = createEarthCloudTexture();
      const cloudMaterial = new THREE.MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.4,
        depthWrite: false
      });
      earthClouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
      planetGroup.add(earthClouds);
    }

    if (planetData.name === 'Saturn') {
      const ringGeometry = new THREE.RingGeometry(
        planetData.radius * 1.4,
        planetData.radius * 2.4,
        64
      );
      const ringTexture = createSaturnRingTexture();
      const ringMaterial = new THREE.MeshStandardMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        roughness: 0.4,
        metalness: 0.05,
        emissive: new THREE.Color(0x221100),
        emissiveIntensity: 0.2
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.y = planetData.tilt * 0.3;
      planetGroup.add(ring);
    }

    if (planetData.name === 'Uranus') {
      const ringGeometry = new THREE.RingGeometry(
        planetData.radius * 1.6,
        planetData.radius * 2.0,
        64
      );
      const ringTexture = createUranusRingTexture();
      const ringMaterial = new THREE.MeshStandardMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        roughness: 0.5,
        metalness: 0.05,
        emissive: new THREE.Color(0x112233),
        emissiveIntensity: 0.15
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.y = planetData.tilt;
      ring.rotation.z = 0.1;
      planetGroup.add(ring);
    }

    // Atmospheric glow for planets with atmospheres
    const atmosphereColors = {
      'Earth': new THREE.Color(0.3, 0.6, 1.0),
      'Venus': new THREE.Color(1.0, 0.85, 0.5),
      'Jupiter': new THREE.Color(0.9, 0.7, 0.4),
      'Saturn': new THREE.Color(0.95, 0.85, 0.6),
      'Uranus': new THREE.Color(0.4, 0.7, 0.85),
      'Neptune': new THREE.Color(0.25, 0.35, 0.85),
      'Mars': new THREE.Color(0.9, 0.5, 0.3)
    };

    if (atmosphereColors[planetData.name]) {
      const glowColor = atmosphereColors[planetData.name];
      const glowScale = planetData.name === 'Mars' ? 1.04 : 1.06;
      const glowGeometry = new THREE.SphereGeometry(planetData.radius * glowScale, 48, 48);
      const glowMaterial = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float intensity;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = 1.0 - abs(dot(viewDir, vNormal));
            fresnel = pow(fresnel, 3.0) * intensity;
            gl_FragColor = vec4(glowColor, fresnel);
          }
        `,
        uniforms: {
          glowColor: { value: glowColor },
          intensity: { value: planetData.name === 'Mars' ? 0.5 : 0.8 }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.rotation.z = planetData.tilt;
      planetGroup.add(glowMesh);
    }

    const orbitRadius = planetData.distance;
    planetGroup.position.x = orbitRadius;

    scene.add(planetGroup);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'planet-label';
    labelDiv.textContent = planetData.name;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, planetData.radius + 0.8, 0);
    planet.add(label);
    planetLabels.push({ object: label, element: labelDiv, distance: orbitRadius });

    planetMeshes.push({
      group: planetGroup,
      mesh: planet,
      data: planetData,
      angle: Math.random() * Math.PI * 2
    });

    const orbitGeometry = new THREE.RingGeometry(orbitRadius - 0.08, orbitRadius + 0.08, 128);
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0x556688,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    const orbitLine = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbitLine.rotation.x = Math.PI / 2;
    scene.add(orbitLine);
    orbitLines.push(orbitLine);
  });
}

function createMoon() {
  const moonGroup = new THREE.Group();
  const moonGeometry = new THREE.SphereGeometry(0.27, 32, 32);
  const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.6,
    metalness: 0.05,
    emissive: new THREE.Color(0x222222),
    emissiveIntensity: 0.2
  });

  moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.castShadow = true;
  moon.receiveShadow = true;
  moonGroup.add(moon);

  const moonLabelDiv = document.createElement('div');
  moonLabelDiv.className = 'planet-label';
  moonLabelDiv.textContent = 'Moon';
  const moonLabel = new CSS2DObject(moonLabelDiv);
  moonLabel.position.set(0, 0.5, 0);
  moon.add(moonLabel);
  planetLabels.push({ object: moonLabel, element: moonLabelDiv, distance: 15 });

  moonOrbit = new THREE.Group();
  moonOrbit.position.set(0, 0, 0);

  const earthPlanet = planetMeshes.find(p => p.data.name === 'Earth');
  if (earthPlanet) {
    earthPlanet.group.add(moonOrbit);
    moonOrbit.add(moonGroup);
    moonGroup.position.x = 2.5;
  }

  moonOrbit.userData.angle = 0;
}

function createGasGiantMoons() {
  PLANETS.forEach((planetData) => {
    if (planetData.majorMoons && planetData.majorMoons.length > 0) {
      const planetEntry = planetMeshes.find(p => p.data.name === planetData.name);
      if (!planetEntry) return;

      const moonOrbitGroup = new THREE.Group();
      planetEntry.group.add(moonOrbitGroup);

      planetData.majorMoons.forEach((moonData) => {
        const moonGroup = new THREE.Group();
        const moonGeometry = new THREE.SphereGeometry(moonData.radius, 24, 24);
        const moonMaterial = new THREE.MeshStandardMaterial({
          color: moonData.color,
          roughness: 0.6,
          metalness: 0.05,
          emissive: new THREE.Color(0x111111),
          emissiveIntensity: 0.2
        });

        const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
        moonMesh.castShadow = true;
        moonMesh.receiveShadow = true;
        moonMesh.userData.moonData = moonData;
        moonMesh.userData.planetData = planetData;
        moonMesh.userData.isMoon = true;
        moonGroup.add(moonMesh);

        const moonLabelDiv = document.createElement('div');
        moonLabelDiv.className = 'planet-label';
        moonLabelDiv.textContent = moonData.name;
        const moonLabel = new CSS2DObject(moonLabelDiv);
        moonLabel.position.set(0, moonData.radius + 0.3, 0);
        moonMesh.add(moonLabel);
        planetLabels.push({ object: moonLabel, element: moonLabelDiv, distance: planetData.distance });

        moonOrbitGroup.add(moonGroup);
        moonGroup.position.x = moonData.distance;

        gasGiantsMoons.push({
          group: moonGroup,
          mesh: moonMesh,
          data: moonData,
          planetData: planetData,
          angle: Math.random() * Math.PI * 2
        });
      });
    }
  });
}

function createAsteroidBelt() {
  const asteroidCount = 500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(asteroidCount * 3);
  const colors = new Float32Array(asteroidCount * 3);

  for (let i = 0; i < asteroidCount; i++) {
    const i3 = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = 24 + Math.random() * 4;
    const height = (Math.random() - 0.5) * 1.5;

    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = height;
    positions[i3 + 2] = Math.sin(angle) * radius;

    const shade = 0.3 + Math.random() * 0.3;
    colors[i3] = shade;
    colors[i3 + 1] = shade;
    colors[i3 + 2] = shade;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.6
  });

  const asteroids = new THREE.Points(geometry, material);
  asteroids.userData.isAsteroidBelt = true;
  scene.add(asteroids);
}

function createComets() {
  const cometData = [
    {
      name: "Halley",
      position: new THREE.Vector3(80, 10, 0),
      velocity: new THREE.Vector3(-0.08, 0, 0.04),
      color: 0x88ccff,
      orbitSpeed: 0.3
    },
    {
      name: "Hale-Bopp",
      position: new THREE.Vector3(-60, -15, 40),
      velocity: new THREE.Vector3(0.05, 0, -0.06),
      color: 0xffaa66,
      orbitSpeed: 0.2
    },
    {
      name: "Lovejoy",
      position: new THREE.Vector3(30, 20, -70),
      velocity: new THREE.Vector3(-0.04, -0.01, 0.07),
      color: 0x66ffaa,
      orbitSpeed: 0.25
    }
  ];

  cometData.forEach(data => {
    const comet = createComet(scene, data.position, data.velocity, data.color);
    comet.name = data.name;
    comet.orbitSpeed = data.orbitSpeed;
    comet.angle = Math.atan2(data.position.z, data.position.x);
    comets.push(comet);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'planet-label';
    labelDiv.textContent = data.name;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 1.2, 0);
    comet.core.add(label);
    planetLabels.push({ object: label, element: labelDiv, distance: data.position.length() });
  });
}

function updateComets(delta) {
  comets.forEach(comet => {
    comet.angle += comet.orbitSpeed * delta * simulationSpeed;

    const distance = comet.group.position.length();
    const newDistance = 20 + Math.sin(comet.angle * 0.5) * 60;

    comet.group.position.x = Math.cos(comet.angle) * newDistance;
    comet.group.position.z = Math.sin(comet.angle) * newDistance;
    comet.group.position.y = Math.sin(comet.angle * 2) * 10;

    const sunDir = new THREE.Vector3().subVectors(
      new THREE.Vector3(0, 0, 0),
      comet.group.position
    ).normalize();

    const positions = comet.tail.geometry.attributes.position.array;
    for (let i = 0; i < comet.tailSegments; i++) {
      const t = i / comet.tailSegments;
      const offset = t * comet.tailLength;
      positions[i * 3] = sunDir.x * offset + (Math.random() - 0.5) * t * 0.5;
      positions[i * 3 + 1] = sunDir.y * offset + (Math.random() - 0.5) * t * 0.5;
      positions[i * 3 + 2] = sunDir.z * offset + (Math.random() - 0.5) * t * 0.5;
    }
    comet.tail.geometry.attributes.position.needsUpdate = true;

    const sunDistance = comet.group.position.length();
    const brightness = Math.max(0.3, 1 - sunDistance / 100);
    comet.core.material.opacity = brightness;
    comet.coma.material.uniforms && (comet.coma.scale.setScalar(brightness));
  });
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onMouseClick);
  window.addEventListener('dblclick', onDoubleClick);
  window.addEventListener('keydown', onKeyDown);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(getClickableObjects(), true);
  const tooltip = document.getElementById('tooltip');

  if (intersects.length > 0) {
    const intersected = intersects[0].object;
    const found = resolveIntersection(intersected);

    let tooltipContent = '';
    if (found) {
      if (found.type === 'sun') {
        tooltipContent = '<strong>Sun</strong><br><small>Click for details</small>';
      } else if (found.type === 'moon') {
        tooltipContent = '<strong>Moon</strong><br><small>Earth\'s satellite</small>';
      } else if (found.type === 'submoon') {
        tooltipContent = '<strong>' + found.data.name + '</strong><br><small>Orbits ' + (found.parentData ? found.parentData.name : '') + '</small>';
      } else if (found.type === 'planet') {
        tooltipContent = '<strong>' + found.data.name + '</strong><br><small>' + found.data.diameter + '</small><br><small>' + found.data.temperature + '</small>';
      }
    }

    if (tooltipContent) {
      document.body.style.cursor = 'pointer';
      tooltip.classList.remove('hidden');
      tooltip.innerHTML = tooltipContent;

      let left = event.clientX + 15;
      let top = event.clientY + 15;
      if (left + 200 > window.innerWidth) left = event.clientX - 200;
      if (top + 100 > window.innerHeight) top = event.clientY - 100;

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';

      if (hoveredPlanet !== intersected) {
        // Restore previous hovered planet's emissive
        if (hoveredPlanet && hoveredPlanet !== sun && hoveredPlanet !== moon && hoveredPlanet.material && hoveredPlanet.material.emissive) {
          hoveredPlanet.material.emissive.setHex(hoveredOriginalEmissive);
        }
        hoveredPlanet = intersected;
        // Store original and set hover emissive
        if (hoveredPlanet !== sun && hoveredPlanet !== moon && hoveredPlanet.material && hoveredPlanet.material.emissive) {
          hoveredOriginalEmissive = hoveredPlanet.material.emissive.getHex();
          hoveredPlanet.material.emissive.setHex(0x333333);
        }
      }
    }
  } else {
    document.body.style.cursor = 'default';
    tooltip.classList.add('hidden');

    if (hoveredPlanet && hoveredPlanet !== sun && hoveredPlanet !== moon && hoveredPlanet.material && hoveredPlanet.material.emissive) {
      hoveredPlanet.material.emissive.setHex(hoveredOriginalEmissive);
    }
    hoveredPlanet = null;
  }
}

function onMouseClick(event) {
  if (event.target.closest('#control-panel') || event.target.closest('#info-panel') ||
      event.target.closest('#time-travel-panel') || event.target.closest('#comparison-panel') ||
      event.target.closest('#stats-panel') || event.target.closest('#tour-overlay') ||
      event.target.closest('#planet-search-wrapper')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getClickableObjects(), true);

  if (intersects.length > 0) {
    const found = resolveIntersection(intersects[0].object);
    if (found) {
      selectPlanet(found.data, found.object);
    }
  }
}

function onDoubleClick(event) {
  if (event.target.closest('#control-panel') || event.target.closest('#info-panel') ||
      event.target.closest('#time-travel-panel') || event.target.closest('#comparison-panel') ||
      event.target.closest('#stats-panel') || event.target.closest('#tour-overlay')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getClickableObjects(), true);

  if (intersects.length > 0) {
    const found = resolveIntersection(intersects[0].object);
    if (found) {
      if (found.type === 'planet') {
        const pm = planetMeshes.find(p => p.mesh === found.object) || dwarfPlanetMeshes.find(p => p.mesh === found.object);
        if (pm) { focusPlanet(pm.group); return; }
      }
      focusPlanet(found.object);
    }
  }
}

function onKeyDown(event) {
  switch (event.code) {
    case 'Space':
      event.preventDefault();
      togglePause();
      break;
    case 'KeyR':
      resetCamera();
      break;
    case 'KeyF':
      toggleFullscreen();
      break;
    case 'KeyO':
      toggleOrbits();
      break;
    case 'KeyL':
      toggleLabels();
      break;
    case 'KeyS':
      toggleStars();
      break;
  }
}

function selectPlanet(planetData, planetGroup) {
  selectedPlanet = planetData;

  document.getElementById('planet-name').textContent = planetData.name;
  document.getElementById('info-diameter').textContent = planetData.diameter;

  // Show real-world distance in km
  const distLabel = document.getElementById('info-distance-label');
  const distValue = document.getElementById('info-distance');
  const lightTravelRow = document.getElementById('light-travel-row');
  const lightTravelValue = document.getElementById('info-light-travel');

  if (planetData.distanceFromSun) {
    if (distLabel) distLabel.textContent = 'Distance from Sun:';
    distValue.textContent = planetData.distanceFromSun;

    // Calculate light travel time from distance string
    const distKm = parseFloat(planetData.distanceFromSun.replace(/,/g, '').replace(' km', ''));
    if (distKm > 0 && lightTravelRow && lightTravelValue) {
      const SPEED_OF_LIGHT = 299792; // km/s
      const totalSeconds = Math.round(distKm / SPEED_OF_LIGHT);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      let timeStr = '';
      if (hours > 0) timeStr += `${hours}h `;
      if (minutes > 0) timeStr += `${minutes}m `;
      timeStr += `${seconds}s`;
      lightTravelValue.textContent = timeStr.trim();
      lightTravelRow.style.display = '';
    } else if (lightTravelRow) {
      lightTravelRow.style.display = 'none';
    }
  } else if (planetData.distanceFromParent) {
    if (distLabel) distLabel.textContent = 'Distance:';
    distValue.textContent = planetData.distanceFromParent;
    if (lightTravelRow) lightTravelRow.style.display = 'none';
  } else if (planetData.distance) {
    if (distLabel) distLabel.textContent = 'Distance:';
    distValue.textContent = String(planetData.distance);
    if (lightTravelRow) lightTravelRow.style.display = 'none';
  }

  document.getElementById('info-orbital-speed').textContent = planetData.orbitalSpeed;
  document.getElementById('info-orbital-period').textContent = planetData.orbitalPeriod;
  document.getElementById('info-rotation-period').textContent = planetData.rotationPeriod;
  document.getElementById('info-temperature').textContent = planetData.temperature;
  document.getElementById('info-moons').textContent = planetData.moons;
  document.getElementById('info-fun-fact').textContent = planetData.funFact;

  const eduContent = document.getElementById('edu-content');
  const educational = planetData.educational;

  if (educational) {
    if (!eduContent) {
      const newEduContent = document.createElement('div');
      newEduContent.id = 'edu-content';
      newEduContent.className = 'edu-content';
      document.querySelector('.info-content').appendChild(newEduContent);
    }

    const eduElement = document.getElementById('edu-content');
    eduElement.innerHTML = `
      <div class="edu-section">
        <div class="edu-label">Overview</div>
        <div class="edu-text">${educational.overview}</div>
      </div>
      <div class="edu-section">
        <div class="edu-label">Composition</div>
        <div class="edu-text">${educational.composition}</div>
      </div>
      <div class="edu-section">
        <div class="edu-label">Atmosphere</div>
        <div class="edu-text">${educational.atmosphere}</div>
      </div>
      <div class="edu-section">
        <div class="edu-label">Surface</div>
        <div class="edu-text">${educational.surface}</div>
      </div>
      <div class="edu-section">
        <div class="edu-label">Exploration</div>
        <div class="edu-text">${educational.exploration}</div>
      </div>
      <div class="edu-section">
        <div class="edu-label">Discovery</div>
        <div class="edu-text">${educational.discovery}</div>
      </div>
      <div class="edu-section">
        <div class="edu-label">Gravity</div>
        <div class="edu-text">${educational.gravity}</div>
      </div>
    `;
    eduElement.style.display = 'block';
  } else if (eduContent) {
    eduContent.innerHTML = '';
    eduContent.style.display = 'none';
  }

  document.getElementById('info-panel').classList.remove('hidden');
}

function focusPlanet(planetGroup) {
  const targetPosition = new THREE.Vector3();
  planetGroup.getWorldPosition(targetPosition);

  const planetData = (planetMeshes.find(p => p.group === planetGroup) || dwarfPlanetMeshes.find(p => p.group === planetGroup))?.data;
  const focusDistance = planetData ? planetData.radius * 6 + 5 : 15;

  const cameraOffset = new THREE.Vector3(focusDistance, focusDistance * 0.5, focusDistance);
  const newCameraPosition = targetPosition.clone().add(cameraOffset);

  animateCamera(newCameraPosition, targetPosition);
}

function animateCamera(targetPosition, targetLookAt, duration = 1500, onComplete = null) {
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = Date.now();

  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(startPosition, targetPosition, eased);
    controls.target.lerpVectors(startTarget, targetLookAt, eased);
    controls.update();

    if (progress < 1) {
      requestAnimationFrame(update);
    } else if (onComplete) {
      onComplete();
    }
  }

  update();
}

function resetCamera() {
  animateCamera(defaultCameraPosition.clone(), defaultControlsTarget.clone());
  document.getElementById('info-panel').classList.add('hidden');
  selectedPlanet = null;
}

function togglePause() {
  isPaused = !isPaused;
  const btn = document.getElementById('btn-pause');
  btn.textContent = isPaused ? '▶ Play' : '⏸ Pause';
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

function toggleOrbits() {
  showOrbits = !showOrbits;
  orbitLines.forEach(orbit => {
    if (orbit.userData.isDwarfOrbit) {
      orbit.visible = showOrbits && showDwarfPlanets;
    } else {
      orbit.visible = showOrbits;
    }
  });

  const btn = document.getElementById('toggle-orbits');
  btn.textContent = showOrbits ? 'ON' : 'OFF';
  btn.classList.toggle('active', showOrbits);
}

function toggleLabels() {
  showLabels = !showLabels;
  planetLabels.forEach(label => {
    label.element.classList.toggle('hidden', !showLabels);
    label.object.visible = showLabels;
  });
  const btn = document.getElementById('toggle-labels');
  btn.textContent = showLabels ? 'ON' : 'OFF';
  btn.classList.toggle('active', showLabels);
}

function toggleStars() {
  showStars = !showStars;
  if (stars) {
    stars.visible = showStars;
  }
  const btn = document.getElementById('toggle-stars');
  btn.textContent = showStars ? 'ON' : 'OFF';
  btn.classList.toggle('active', showStars);
}

function toggleRotation() {
  showRotation = !showRotation;
  const btn = document.getElementById('toggle-rotation');
  btn.textContent = showRotation ? 'ON' : 'OFF';
  btn.classList.toggle('active', showRotation);
}

function toggleAutoRotate() {
  autoRotate = !autoRotate;
  controls.autoRotate = autoRotate;
  const btn = document.getElementById('toggle-auto-rotate');
  btn.textContent = autoRotate ? 'ON' : 'OFF';
  btn.classList.toggle('active', autoRotate);
}

function setupUIControls() {
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      simulationSpeed = parseFloat(btn.dataset.speed);
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('speed-display').textContent = `Speed: ${simulationSpeed}x`;
    });
  });

  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-reset').addEventListener('click', resetCamera);
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot);
  document.getElementById('toggle-orbits').addEventListener('click', toggleOrbits);
  document.getElementById('toggle-labels').addEventListener('click', toggleLabels);
  document.getElementById('toggle-stars').addEventListener('click', toggleStars);
  document.getElementById('toggle-rotation').addEventListener('click', toggleRotation);
  document.getElementById('toggle-auto-rotate').addEventListener('click', toggleAutoRotate);
  const dwarfBtn = document.getElementById('toggle-dwarf-planets');
  if (dwarfBtn) dwarfBtn.addEventListener('click', toggleDwarfPlanets);
  document.getElementById('close-info').addEventListener('click', () => {
    document.getElementById('info-panel').classList.add('hidden');
    selectedPlanet = null;
  });

  document.getElementById('btn-time-travel').addEventListener('click', toggleTimeTravel);
  document.getElementById('btn-compare').addEventListener('click', toggleComparison);
  document.getElementById('close-time-travel').addEventListener('click', () => {
    document.getElementById('time-travel-panel').classList.add('hidden');
  });

  const yearSlider = document.getElementById('year-slider');
  const yearDisplay = document.getElementById('year-display');
  yearSlider.addEventListener('input', () => {
    yearDisplay.textContent = yearSlider.value;
    updateDateFromInputs();
  });

  const dateInput = document.getElementById('date-input');
  dateInput.addEventListener('change', () => {
    updateDateFromInputs();
  });

  document.getElementById('btn-apply-date').addEventListener('click', applyTimeTravel);
  document.getElementById('btn-today').addEventListener('click', goToToday);

  document.getElementById('btn-travel-100y').addEventListener('click', () => travelTime(-100, 'years'));
  document.getElementById('btn-travel-10y').addEventListener('click', () => travelTime(-10, 'years'));
  document.getElementById('btn-travel-1y').addEventListener('click', () => travelTime(-1, 'years'));
  document.getElementById('btn-travel-1m').addEventListener('click', () => travelTime(-1, 'months'));
  document.getElementById('btn-travel-p1m').addEventListener('click', () => travelTime(1, 'months'));
  document.getElementById('btn-travel-p1y').addEventListener('click', () => travelTime(1, 'years'));
  document.getElementById('btn-travel-p10y').addEventListener('click', () => travelTime(10, 'years'));
  document.getElementById('btn-travel-p100y').addEventListener('click', () => travelTime(100, 'years'));
}

function toggleTimeTravel() {
  const panel = document.getElementById('time-travel-panel');
  panel.classList.toggle('hidden');
}

let selectedPlanetsForComparison = ['Earth'];
let isComparisonMode = false;

function toggleComparison() {
  const panel = document.getElementById('comparison-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    updateComparison();
  }
}

function setupComparison() {
  document.querySelectorAll('.planet-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const planet = btn.dataset.planet;
      if (btn.classList.contains('active')) {
        if (selectedPlanetsForComparison.length > 1) {
          selectedPlanetsForComparison = selectedPlanetsForComparison.filter(p => p !== planet);
          btn.classList.remove('active');
        }
      } else {
        if (selectedPlanetsForComparison.length < 4) {
          selectedPlanetsForComparison.push(planet);
          btn.classList.add('active');
        }
      }
      updateComparison();
    });
  });

  document.getElementById('close-comparison').addEventListener('click', () => {
    document.getElementById('comparison-panel').classList.add('hidden');
  });
}

function updateComparison() {
  const allPlanets = [...PLANETS, ...DWARF_PLANETS];
  const selectedPlanets = allPlanets.filter(p => selectedPlanetsForComparison.includes(p.name));
  if (selectedPlanets.length === 0) return;

  const maxRadius = Math.max(...allPlanets.map(p => p.radius));
  const visualContainer = document.getElementById('comparison-visual');
  visualContainer.innerHTML = '';

  selectedPlanets.forEach(planet => {
    const size = Math.max(15, (planet.radius / maxRadius) * 80);
    const div = document.createElement('div');
    div.className = 'comparison-planet';
    div.innerHTML = `
      <div class="comparison-planet-sphere" style="
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle at 30% 30%, ${lightenColor(planet.color, 40)}, ${colorToHex(planet.color)});
      "></div>
      <div class="comparison-planet-name">${planet.name}</div>
    `;
    visualContainer.appendChild(div);
  });

  const dataContainer = document.getElementById('comparison-data');
  let tableHTML = '<table class="comparison-table">';
  tableHTML += '<tr><th>Property</th>';
  selectedPlanets.forEach(p => {
    tableHTML += `<td class="planet-header">${p.name}</td>`;
  });
  tableHTML += '</tr>';

  const properties = [
    { label: 'Diameter', key: 'diameter' },
    { label: 'Distance from Sun', key: 'distanceFromSun' },
    { label: 'Orbital Period', key: 'orbitalPeriod' },
    { label: 'Rotation Period', key: 'rotationPeriod' },
    { label: 'Temperature', key: 'temperature' },
    { label: 'Moons', key: 'moons' }
  ];

  properties.forEach(prop => {
    tableHTML += `<tr><td>${prop.label}</td>`;
    selectedPlanets.forEach(p => {
      const value = p[prop.key];
      const display = prop.format ? prop.format(value) : value;
      tableHTML += `<td>${display}</td>`;
    });
    tableHTML += '</tr>';
  });

  tableHTML += '</table>';
  dataContainer.innerHTML = tableHTML;
}

function colorToHex(color) {
  return '#' + color.toString(16).padStart(6, '0');
}

function lightenColor(color, percent) {
  const num = parseInt(color.toString(16), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `rgb(${R}, ${G}, ${B})`;
}

function updateDateFromInputs() {
  const year = parseInt(document.getElementById('year-slider').value);
  const dateValue = document.getElementById('date-input').value;

  if (dateValue) {
    const parts = dateValue.split('-');
    timeTravelDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    timeTravelDate = new Date(year, 0, 1);
  }

  updateDateDisplay();
}

function updateDateDisplay() {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-date-display').textContent =
    timeTravelDate.toLocaleDateString('en-US', options);
  document.getElementById('year-display').textContent = timeTravelDate.getFullYear();
  document.getElementById('year-slider').value = timeTravelDate.getFullYear();

  const yyyy = timeTravelDate.getFullYear();
  const mm = String(timeTravelDate.getMonth() + 1).padStart(2, '0');
  const dd = String(timeTravelDate.getDate()).padStart(2, '0');
  document.getElementById('date-input').value = `${yyyy}-${mm}-${dd}`;
}

function setupDraggable() {
  makeDraggable('time-travel-panel', 'time-travel-drag-handle');
  makeDraggable('comparison-panel', 'comparison-drag-handle');
}

function makeDraggable(panelId, handleId) {
  const panel = document.getElementById(panelId);
  const dragHandle = document.getElementById(handleId);

  if (!panel || !dragHandle) return;

  let isDragging = false;
  let offsetX, offsetY;

  dragHandle.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);

  dragHandle.addEventListener('touchstart', startDragTouch, { passive: false });
  document.addEventListener('touchmove', dragTouch, { passive: false });
  document.addEventListener('touchend', stopDrag);

  function startDrag(e) {
    isDragging = true;
    panel.classList.add('dragging');
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    e.preventDefault();
  }

  function startDragTouch(e) {
    isDragging = true;
    panel.classList.add('dragging');
    const touch = e.touches[0];
    offsetX = touch.clientX - panel.offsetLeft;
    offsetY = touch.clientY - panel.offsetTop;
    e.preventDefault();
  }

  function drag(e) {
    if (!isDragging) return;

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    newX = Math.max(0, Math.min(newX, window.innerWidth - panel.offsetWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - panel.offsetHeight));

    panel.style.left = newX + 'px';
    panel.style.top = newY + 'px';
    panel.style.right = 'auto';
  }

  function dragTouch(e) {
    if (!isDragging) return;

    const touch = e.touches[0];
    let newX = touch.clientX - offsetX;
    let newY = touch.clientY - offsetY;

    newX = Math.max(0, Math.min(newX, window.innerWidth - panel.offsetWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - panel.offsetHeight));

    panel.style.left = newX + 'px';
    panel.style.top = newY + 'px';
    panel.style.right = 'auto';
    e.preventDefault();
  }

  function stopDrag() {
    isDragging = false;
    panel.classList.remove('dragging');
  }
}

function applyTimeTravel() {
  isTimeTravelMode = true;
  updatePlanetPositionsForDate(timeTravelDate);
}

function goToToday() {
  timeTravelDate = new Date();
  isTimeTravelMode = false;
  updateDateDisplay();
}

function travelTime(amount, unit) {
  if (unit === 'years') {
    timeTravelDate.setFullYear(timeTravelDate.getFullYear() + amount);
  } else if (unit === 'months') {
    timeTravelDate.setMonth(timeTravelDate.getMonth() + amount);
  }
  isTimeTravelMode = true;
  updateDateDisplay();
  updatePlanetPositionsForDate(timeTravelDate);
}

function getPlanetOrbitalAngle(planetData, date) {
  const J2000 = new Date(2000, 0, 1);
  const daysSinceJ2000 = (date - J2000) / (1000 * 60 * 60 * 24);

  const orbitalPeriods = {
    'Mercury': 87.969,
    'Venus': 224.701,
    'Earth': 365.256,
    'Mars': 686.980,
    'Jupiter': 4332.59,
    'Saturn': 10759.22,
    'Uranus': 30688.5,
    'Neptune': 60182.0
  };

  const period = orbitalPeriods[planetData.name] || 365.256;
  const baseAngle = planetData.angle || 0;
  const angle = baseAngle + (daysSinceJ2000 / period) * Math.PI * 2;

  return angle;
}

function updatePlanetPositionsForDate(date) {
  planetMeshes.forEach((planet) => {
    const angle = getPlanetOrbitalAngle(planet.data, date);
    planet.angle = angle;
    planet.group.position.x = Math.cos(angle) * planet.data.distance;
    planet.group.position.z = Math.sin(angle) * planet.data.distance;
  });

  gasGiantsMoons.forEach((moonEntry) => {
    const planetAngle = getPlanetOrbitalAngle(moonEntry.planetData, date);
    const moonAngle = planetAngle * moonEntry.data.speed * 10;
    moonEntry.angle = moonAngle;
    moonEntry.group.position.x = Math.cos(moonAngle) * moonEntry.data.distance;
    moonEntry.group.position.z = Math.sin(moonAngle) * moonEntry.data.distance;
  });
}

function takeScreenshot() {
  composer.render();
  const link = document.createElement('a');
  link.download = 'solar-system-screenshot.png';
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
}

function updateLabels() {
  planetLabels.forEach(label => {
    if (!showLabels) return;

    const worldPos = new THREE.Vector3();
    label.object.getWorldPosition(worldPos);
    const distance = camera.position.distanceTo(worldPos);

    let opacity = 1;
    if (distance > 200) {
      opacity = Math.max(0, 1 - (distance - 200) / 100);
    } else if (distance < 20) {
      opacity = Math.min(1, distance / 20);
    }

    label.element.style.opacity = opacity;
  });
}

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock-display').textContent = `${hours}:${minutes}:${seconds}`;
}

function updateFPS(delta) {
  frameCount++;
  lastFpsUpdate += delta;

  if (lastFpsUpdate >= 0.5) {
    fpsCounter = Math.round(frameCount / lastFpsUpdate);
    document.getElementById('fps-counter').textContent = `FPS: ${fpsCounter}`;
    frameCount = 0;
    lastFpsUpdate = 0;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (!isPaused) {
    if (stars && stars.userData.updateTime) {
      stars.userData.updateTime(elapsed);
    }

    if (sun && sun.material.uniforms) {
      sun.material.uniforms.time.value = elapsed;
      sun.rotation.y += delta * 0.1;
    }

    if (sunGlow && sunGlow.userData.updateTime) {
      sunGlow.userData.updateTime(elapsed);
    }

    if (outerGlow && outerGlow.material.uniforms) {
      outerGlow.material.uniforms.time.value = elapsed;
    }

    if (showRotation && !isTimeTravelMode) {
      planetMeshes.forEach((planet) => {
        planet.angle += planet.data.orbitalSpeed * delta * 0.5 * simulationSpeed;
        planet.group.position.x = Math.cos(planet.angle) * planet.data.distance;
        planet.group.position.z = Math.sin(planet.angle) * planet.data.distance;
        planet.mesh.rotation.y += planet.data.rotationSpeed * delta * simulationSpeed;

        if (planet.data.name === 'Earth' && earthClouds) {
          earthClouds.rotation.y += planet.data.rotationSpeed * delta * 0.8 * simulationSpeed;
        }
      });

      if (moonOrbit) {
        moonOrbit.userData.angle += delta * 2 * simulationSpeed;
        const moonAngle = moonOrbit.userData.angle;
        moonOrbit.children[0].position.x = Math.cos(moonAngle) * 2.5;
        moonOrbit.children[0].position.z = Math.sin(moonAngle) * 2.5;
      }

      gasGiantsMoons.forEach((moonEntry) => {
        moonEntry.angle += moonEntry.data.speed * delta * simulationSpeed;
        moonEntry.group.position.x = Math.cos(moonEntry.angle) * moonEntry.data.distance;
        moonEntry.group.position.z = Math.sin(moonEntry.angle) * moonEntry.data.distance;
        moonEntry.mesh.rotation.y += delta * 0.5 * simulationSpeed;
      });

      // Dwarf planet orbital mechanics
      if (showDwarfPlanets) {
        dwarfPlanetMeshes.forEach((planet) => {
          planet.angle += planet.data.orbitalSpeed * delta * 0.5 * simulationSpeed;
          planet.group.position.x = Math.cos(planet.angle) * planet.data.distance;
          planet.group.position.z = Math.sin(planet.angle) * planet.data.distance;
          planet.mesh.rotation.y += planet.data.rotationSpeed * delta * simulationSpeed;
        });
      }

      updateComets(delta);
      updateOrbitTrails();

      scene.children.forEach(child => {
        if (child.userData.isAsteroidBelt) {
          child.rotation.y += delta * 0.02 * simulationSpeed;
        }
      });
    }

    // Shooting stars
    updateShootingStars(delta, elapsed);

    if (stars) {
      stars.rotation.y += delta * 0.002;
    }
  }

  updateLabels();
  updateClock();
  updateFPS(delta);
  updateMinimap();

  // Tour: continuously follow the target planet
  if (isTourActive && tourFollowTarget && !tourTransitioning) {
    updateTourCamera();
  }

  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);
}

// ===================================================
// DWARF PLANETS
// ===================================================

function createDwarfPlanets() {
  const textureCreators = {
    'Pluto': createPlutoTexture,
    'Ceres': createCeresTexture,
    'Eris': createErisTexture
  };

  DWARF_PLANETS.forEach((planetData) => {
    const planetGroup = new THREE.Group();
    const planetGeometry = new THREE.SphereGeometry(planetData.radius, 32, 32);

    const textureCreator = textureCreators[planetData.name];
    let planetMaterial;
    if (textureCreator) {
      const texture = textureCreator();
      planetMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.6,
        metalness: 0.05,
        emissive: new THREE.Color(0x111111),
        emissiveIntensity: 0.3
      });
    } else {
      planetMaterial = new THREE.MeshStandardMaterial({
        color: planetData.color,
        roughness: 0.6,
        metalness: 0.05,
        emissive: new THREE.Color(0x111111),
        emissiveIntensity: 0.3
      });
    }

    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.castShadow = true;
    planet.receiveShadow = true;
    planet.rotation.z = planetData.tilt;
    planet.userData.planetData = planetData;
    planet.userData.isPlanet = true;
    planet.userData.isDwarf = true;

    planetGroup.add(planet);

    const orbitRadius = planetData.distance;
    planetGroup.position.x = orbitRadius;

    scene.add(planetGroup);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'planet-label dwarf-label';
    labelDiv.textContent = planetData.name;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, planetData.radius + 0.5, 0);
    planet.add(label);
    planetLabels.push({ object: label, element: labelDiv, distance: orbitRadius });

    dwarfPlanetMeshes.push({
      group: planetGroup,
      mesh: planet,
      data: planetData,
      angle: Math.random() * Math.PI * 2
    });

    // Dashed orbit line for dwarf planets
    const orbitPoints = [];
    for (let i = 0; i <= 128; i++) {
      const theta = (i / 128) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(
        Math.cos(theta) * orbitRadius,
        0,
        Math.sin(theta) * orbitRadius
      ));
    }
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineDashedMaterial({
      color: 0x887766,
      dashSize: 1.5,
      gapSize: 1.0,
      transparent: true,
      opacity: 0.35
    });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    orbitLine.computeLineDistances();
    orbitLine.userData.isDwarfOrbit = true;
    scene.add(orbitLine);
    orbitLines.push(orbitLine);
  });
}

function toggleDwarfPlanets() {
  showDwarfPlanets = !showDwarfPlanets;
  dwarfPlanetMeshes.forEach(p => {
    p.group.visible = showDwarfPlanets;
  });
  orbitLines.forEach(line => {
    if (line.userData.isDwarfOrbit) {
      line.visible = showDwarfPlanets && showOrbits;
    }
  });
  const btn = document.getElementById('toggle-dwarf-planets');
  if (btn) {
    btn.textContent = showDwarfPlanets ? 'ON' : 'OFF';
    btn.classList.toggle('active', showDwarfPlanets);
  }
}

// ===================================================
// ORBIT TRAILS
// ===================================================

function initOrbitTrails() {
  const allPlanets = [...planetMeshes, ...dwarfPlanetMeshes];
  allPlanets.forEach((planet) => {
    const positions = new Float32Array(TRAIL_LENGTH * 3);
    const colors = new Float32Array(TRAIL_LENGTH * 4); // RGBA per vertex

    const baseColor = new THREE.Color(planet.data.color);
    // Brighten the trail color for better visibility
    const trailColor = baseColor.clone();
    trailColor.r = Math.min(1, trailColor.r * 1.4 + 0.15);
    trailColor.g = Math.min(1, trailColor.g * 1.4 + 0.15);
    trailColor.b = Math.min(1, trailColor.b * 1.4 + 0.15);

    // Initialize all positions to current planet position
    const px = planet.group.position.x;
    const pz = planet.group.position.z;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      positions[i * 3] = px;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = pz;
      // Colors: RGB stays constant, alpha will be set in update
      colors[i * 4] = trailColor.r;
      colors[i * 4 + 1] = trailColor.g;
      colors[i * 4 + 2] = trailColor.b;
      colors[i * 4 + 3] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    // Only draw filled portion initially
    geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec4 color;
        varying vec4 vColor;
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec4 vColor;
        void main() {
          gl_FragColor = vColor;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const trail = new THREE.Line(geometry, material);
    trail.userData.isOrbitTrail = true;
    trail.frustumCulled = false;
    scene.add(trail);

    orbitTrails.push({
      trail: trail,
      planet: planet,
      trailColor: trailColor,
      pointCount: 0,       // how many valid points we have (grows up to TRAIL_LENGTH)
      frameCounter: 0
    });
  });
}

function updateOrbitTrails() {
  orbitTrails.forEach(entry => {
    entry.frameCounter++;
    // Record every 2 frames for a smooth dense trail
    if (entry.frameCounter % 2 !== 0) return;

    const pos = entry.trail.geometry.attributes.position.array;
    const col = entry.trail.geometry.attributes.color.array;
    const tc = entry.trailColor;

    const newX = entry.planet.group.position.x;
    const newZ = entry.planet.group.position.z;

    if (entry.pointCount < TRAIL_LENGTH) {
      // Still filling up — append at the end
      const i = entry.pointCount;
      pos[i * 3] = newX;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = newZ;
      entry.pointCount++;
    } else {
      // Buffer full — shift everything left by one, append new at end
      // Use copyWithin for fast typed array shift (moves in-place)
      pos.copyWithin(0, 3); // shift positions left by 1 vertex (3 floats)
      const last = (TRAIL_LENGTH - 1) * 3;
      pos[last] = newX;
      pos[last + 1] = 0;
      pos[last + 2] = newZ;
    }

    // Update alpha gradient: index 0 = oldest (transparent), last = newest (bright)
    const count = entry.pointCount;
    for (let i = 0; i < count; i++) {
      // t goes from 0 (oldest) to 1 (newest)
      const t = i / (count - 1 || 1);
      // Power curve: trail is mostly faint, gets bright near the planet
      const alpha = Math.pow(t, 1.8) * 0.85;
      col[i * 4] = tc.r;
      col[i * 4 + 1] = tc.g;
      col[i * 4 + 2] = tc.b;
      col[i * 4 + 3] = alpha;
    }

    // Set draw range to only the filled portion
    entry.trail.geometry.setDrawRange(0, count);
    entry.trail.geometry.attributes.position.needsUpdate = true;
    entry.trail.geometry.attributes.color.needsUpdate = true;

    // Respect orbit visibility toggle
    const isDwarf = entry.planet.data.isDwarf;
    entry.trail.visible = !isDwarf || showDwarfPlanets;
  });
}

// ===================================================
// SHOOTING STARS
// ===================================================

function createShootingStar() {
  const startAngle = Math.random() * Math.PI * 2;
  const startPhi = Math.random() * Math.PI * 0.6 + Math.PI * 0.2;
  const distance = 350 + Math.random() * 100;

  const startPos = new THREE.Vector3(
    distance * Math.sin(startPhi) * Math.cos(startAngle),
    distance * Math.sin(startPhi) * Math.sin(startAngle),
    distance * Math.cos(startPhi)
  );

  const direction = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    -(Math.random() * 0.5 + 0.2),
    (Math.random() - 0.5) * 2
  ).normalize();

  const speed = 150 + Math.random() * 200;
  const tailLength = 8;
  const segments = 15;

  const positions = new Float32Array(segments * 3);
  const alphas = new Float32Array(segments);

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    positions[i * 3] = startPos.x - direction.x * t * tailLength;
    positions[i * 3 + 1] = startPos.y - direction.y * t * tailLength;
    positions[i * 3 + 2] = startPos.z - direction.z * t * tailLength;
    alphas[i] = 1 - t;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const colorChoice = Math.random();
  const color = colorChoice < 0.5 ? 0xffffff : (colorChoice < 0.75 ? 0xaaddff : 0xffffaa);

  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) } },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, (1.0 + alpha * 3.0) * (200.0 / -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying float vAlpha;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float a = (1.0 - dist * 2.0) * vAlpha;
        gl_FragColor = vec4(color, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const star = new THREE.Points(geometry, material);
  scene.add(star);

  return {
    mesh: star,
    position: startPos.clone(),
    direction: direction,
    speed: speed,
    tailLength: tailLength,
    segments: segments,
    life: 0,
    maxLife: 1.5 + Math.random() * 1.0
  };
}

function updateShootingStars(delta, elapsed) {
  if (!showStars) return;

  shootingStarTimer += delta;
  if (shootingStarTimer > 5 + Math.random() * 10) {
    shootingStarTimer = 0;
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      shootingStars.push(createShootingStar());
    }
  }

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
    star.life += delta;

    star.position.addScaledVector(star.direction, star.speed * delta);

    const pos = star.mesh.geometry.attributes.position.array;
    const alphas = star.mesh.geometry.attributes.alpha.array;

    for (let j = 0; j < star.segments; j++) {
      const t = j / star.segments;
      pos[j * 3] = star.position.x - star.direction.x * t * star.tailLength;
      pos[j * 3 + 1] = star.position.y - star.direction.y * t * star.tailLength;
      pos[j * 3 + 2] = star.position.z - star.direction.z * t * star.tailLength;

      const fadeOut = Math.max(0, 1 - star.life / star.maxLife);
      alphas[j] = (1 - t) * fadeOut;
    }

    star.mesh.geometry.attributes.position.needsUpdate = true;
    star.mesh.geometry.attributes.alpha.needsUpdate = true;

    if (star.life >= star.maxLife) {
      scene.remove(star.mesh);
      star.mesh.geometry.dispose();
      star.mesh.material.dispose();
      shootingStars.splice(i, 1);
    }
  }
}

// ===================================================
// PLANET SEARCH / QUICK JUMP
// ===================================================

function setupPlanetSearch() {
  const searchInput = document.getElementById('planet-search');
  const searchResults = document.getElementById('search-results');
  if (!searchInput || !searchResults) return;

  const allSearchable = [
    { name: 'Sun', type: 'sun' },
    { name: 'Moon', type: 'moon' },
    ...PLANETS.map(p => ({ name: p.name, type: 'planet', data: p })),
    ...DWARF_PLANETS.map(p => ({ name: p.name, type: 'dwarf', data: p })),
  ];

  // Add gas giant moons
  PLANETS.forEach(p => {
    if (p.majorMoons) {
      p.majorMoons.forEach(m => {
        allSearchable.push({ name: m.name, type: 'submoon', data: m, parent: p });
      });
    }
  });

  let selectedResultIndex = -1;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      searchResults.classList.add('hidden');
      searchResults.innerHTML = '';
      return;
    }

    const results = allSearchable.filter(item =>
      item.name.toLowerCase().includes(query)
    ).slice(0, 8);

    if (results.length === 0) {
      searchResults.classList.add('hidden');
      return;
    }

    selectedResultIndex = -1;
    searchResults.innerHTML = results.map((r, i) => {
      const typeLabel = r.type === 'dwarf' ? '🪨' : r.type === 'submoon' ? '🌑' : r.type === 'sun' ? '☀️' : r.type === 'moon' ? '🌙' : '🪐';
      return `<div class="search-result" data-index="${i}" data-name="${r.name}" data-type="${r.type}">${typeLabel} ${r.name}</div>`;
    }).join('');
    searchResults.classList.remove('hidden');

    searchResults.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        jumpToObject(el.dataset.name, el.dataset.type);
        searchResults.classList.add('hidden');
        searchInput.value = '';
        searchInput.blur();
      });
    });
  });

  searchInput.addEventListener('keydown', (e) => {
    const items = searchResults.querySelectorAll('.search-result');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedResultIndex = Math.min(selectedResultIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === selectedResultIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedResultIndex = Math.max(selectedResultIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('active', i === selectedResultIndex));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedResultIndex >= 0 && items[selectedResultIndex]) {
        const el = items[selectedResultIndex];
        jumpToObject(el.dataset.name, el.dataset.type);
        searchResults.classList.add('hidden');
        searchInput.value = '';
        searchInput.blur();
      }
    } else if (e.key === 'Escape') {
      searchResults.classList.add('hidden');
      searchInput.blur();
    }
  });

  searchInput.addEventListener('blur', () => {
    setTimeout(() => searchResults.classList.add('hidden'), 200);
  });
}

function jumpToObject(name, type) {
  if (type === 'sun') {
    selectPlanet(sunData, sun);
    focusPlanet(sun);
    return;
  }
  if (type === 'moon') {
    selectPlanet(moonData, moon);
    focusPlanet(moon);
    return;
  }

  const pm = planetMeshes.find(p => p.data.name === name) || dwarfPlanetMeshes.find(p => p.data.name === name);
  if (pm) {
    selectPlanet(pm.data, pm.mesh);
    focusPlanet(pm.group);
    return;
  }

  const moonEntry = gasGiantsMoons.find(m => m.data.name === name);
  if (moonEntry) {
    const md = moonEntry.data;
    const pp = moonEntry.planetData;
    selectPlanet({
      name: md.name,
      diameter: md.diameter || 'N/A',
      distance: md.distance + ' (from ' + (pp ? pp.name : 'planet') + ')',
      orbitalSpeed: md.speed + 'x',
      orbitalPeriod: md.orbitalPeriod || 'N/A',
      rotationPeriod: 'N/A',
      temperature: md.temperature || 'N/A',
      moons: '0',
      funFact: md.funFact,
      educational: md.educational || null
    }, moonEntry.mesh);
    focusPlanet(moonEntry.mesh);
  }
}

// ===================================================
// AMBIENT SOUND (Procedural Space Drone)
// ===================================================

function initAmbientSound() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  ambientGain = audioCtx.createGain();
  ambientGain.gain.value = 0;
  ambientGain.connect(audioCtx.destination);

  // Low-pass filter for warmth
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  filter.Q.value = 1;
  filter.connect(ambientGain);

  // Layer 3 low oscillators for a deep space drone
  const frequencies = [36, 55, 82]; // Low bass frequencies
  const gains = [0.15, 0.08, 0.05];

  frequencies.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Slow vibrato for organic feel
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1 + i * 0.05;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = freq * 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    const oscGain = audioCtx.createGain();
    oscGain.gain.value = gains[i];
    osc.connect(oscGain);
    oscGain.connect(filter);
    osc.start();

    ambientOscillators.push({ osc, lfo, oscGain });
  });
}

function toggleAmbientSound() {
  if (!audioCtx) {
    initAmbientSound();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  isSoundOn = !isSoundOn;
  const btn = document.getElementById('toggle-sound');

  if (isSoundOn) {
    ambientGain.gain.cancelScheduledValues(audioCtx.currentTime);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, audioCtx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 2);
    btn.textContent = 'ON';
    btn.classList.add('active');
  } else {
    ambientGain.gain.cancelScheduledValues(audioCtx.currentTime);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, audioCtx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
    btn.textContent = 'OFF';
    btn.classList.remove('active');
  }
}

// Setup sound toggle
const soundToggleBtn = document.getElementById('toggle-sound');
if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', toggleAmbientSound);
}

// ===================================================
// MINI-MAP (2D Radar View)
// ===================================================

function updateMinimap() {
  if (!minimapCanvas) {
    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
  }
  if (!minimapCtx) return;

  const W = minimapCanvas.width;
  const H = minimapCanvas.height;
  const cx = W / 2;
  const cy = H / 2;

  // Scale: map the largest orbit distance to fit inside the canvas
  // Eris is at distance 92, so scale to fit that in ~80px radius
  const maxDist = 95;
  const scale = (W / 2 - 10) / maxDist;

  // Clear
  minimapCtx.clearRect(0, 0, W, H);

  // Background
  minimapCtx.fillStyle = 'rgba(5, 8, 20, 0.9)';
  minimapCtx.beginPath();
  minimapCtx.arc(cx, cy, W / 2 - 1, 0, Math.PI * 2);
  minimapCtx.fill();

  // Draw orbit rings
  minimapCtx.strokeStyle = 'rgba(100, 150, 255, 0.08)';
  minimapCtx.lineWidth = 0.5;
  planetMeshes.forEach(p => {
    const r = p.data.distance * scale;
    minimapCtx.beginPath();
    minimapCtx.arc(cx, cy, r, 0, Math.PI * 2);
    minimapCtx.stroke();
  });

  // Sun
  minimapCtx.fillStyle = '#ffcc33';
  minimapCtx.beginPath();
  minimapCtx.arc(cx, cy, 3, 0, Math.PI * 2);
  minimapCtx.fill();
  // Sun glow
  const sunGradient = minimapCtx.createRadialGradient(cx, cy, 0, cx, cy, 8);
  sunGradient.addColorStop(0, 'rgba(255, 200, 50, 0.3)');
  sunGradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
  minimapCtx.fillStyle = sunGradient;
  minimapCtx.beginPath();
  minimapCtx.arc(cx, cy, 8, 0, Math.PI * 2);
  minimapCtx.fill();

  // Planet colors for minimap
  const planetColors = {
    'Mercury': '#8c7e6d', 'Venus': '#e8cda0', 'Earth': '#4a90d9',
    'Mars': '#c1440e', 'Jupiter': '#c88b3a', 'Saturn': '#f5deb3',
    'Uranus': '#73c2d0', 'Neptune': '#3f54ba'
  };

  // Draw planets
  planetMeshes.forEach(p => {
    const x = cx + p.group.position.x * scale;
    const z = cy + p.group.position.z * scale;
    const color = planetColors[p.data.name] || '#ffffff';
    const size = Math.max(1.5, Math.min(p.data.radius * 1.2, 3.5));

    // Parse hex color to RGB
    const r = parseInt(color.slice(1,3), 16);
    const g = parseInt(color.slice(3,5), 16);
    const b = parseInt(color.slice(5,7), 16);

    // Soft glow
    minimapCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
    minimapCtx.beginPath();
    minimapCtx.arc(x, z, size + 3, 0, Math.PI * 2);
    minimapCtx.fill();

    // Planet dot
    minimapCtx.fillStyle = color;
    minimapCtx.beginPath();
    minimapCtx.arc(x, z, size, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  // Draw dwarf planets (smaller)
  if (showDwarfPlanets) {
    dwarfPlanetMeshes.forEach(p => {
      const x = cx + p.group.position.x * scale;
      const z = cy + p.group.position.z * scale;
      minimapCtx.fillStyle = 'rgba(200, 180, 150, 0.6)';
      minimapCtx.beginPath();
      minimapCtx.arc(x, z, 1.2, 0, Math.PI * 2);
      minimapCtx.fill();
    });
  }

  // Camera indicator — show where the camera is looking
  const camX = cx + camera.position.x * scale;
  const camZ = cy + camera.position.z * scale;

  // Clamp to minimap bounds
  const clampedX = Math.max(4, Math.min(W - 4, camX));
  const clampedZ = Math.max(4, Math.min(H - 4, camZ));

  // Camera dot
  minimapCtx.fillStyle = '#ffffff';
  minimapCtx.beginPath();
  minimapCtx.arc(clampedX, clampedZ, 2, 0, Math.PI * 2);
  minimapCtx.fill();

  // Camera view direction line
  const targetX = cx + controls.target.x * scale;
  const targetZ = cy + controls.target.z * scale;
  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  minimapCtx.lineWidth = 1;
  minimapCtx.beginPath();
  minimapCtx.moveTo(clampedX, clampedZ);
  minimapCtx.lineTo(targetX, targetZ);
  minimapCtx.stroke();
}

// ===================================================
// GUIDED TOUR
// ===================================================

const tourStops = [
  {
    name: 'The Sun',
    target: () => sun,
    narration: 'Our journey begins at the Sun — a G-type main-sequence star containing 99.86% of the solar system\'s mass. Its surface temperature is about 5,500°C, and it\'s been burning for 4.6 billion years.',
    cameraDistance: 20,
    isStatic: true // Sun doesn't orbit
  },
  {
    name: 'Mercury',
    target: () => planetMeshes.find(p => p.data.name === 'Mercury'),
    narration: 'Mercury is the smallest planet and closest to the Sun. With no atmosphere, its temperature swings from 430°C during the day to -180°C at night. A year here lasts just 88 Earth days.',
    cameraDistance: 6
  },
  {
    name: 'Venus',
    target: () => planetMeshes.find(p => p.data.name === 'Venus'),
    narration: 'Venus is the hottest planet due to its extreme greenhouse effect. It rotates backwards and so slowly that a day on Venus is longer than its year. Surface pressure is 90 times Earth\'s.',
    cameraDistance: 8
  },
  {
    name: 'Earth & Moon',
    target: () => planetMeshes.find(p => p.data.name === 'Earth'),
    narration: 'Earth — our home. The only known world with liquid water, an oxygen atmosphere, and life. The Moon stabilizes Earth\'s axial tilt and creates our tides.',
    cameraDistance: 10
  },
  {
    name: 'Mars',
    target: () => planetMeshes.find(p => p.data.name === 'Mars'),
    narration: 'The Red Planet is home to Olympus Mons — the tallest volcano in the solar system at 21.9 km. Mars has polar ice caps and evidence of ancient water flows.',
    cameraDistance: 8
  },
  {
    name: 'The Asteroid Belt',
    target: null,
    narration: 'Between Mars and Jupiter lies the asteroid belt — millions of rocky fragments left over from the solar system\'s formation. Most are too small to see, but together they form a fascinating ring.',
    cameraDistance: 30,
    isStatic: true,
    customPosition: () => new THREE.Vector3(25, 15, 0)
  },
  {
    name: 'Jupiter',
    target: () => planetMeshes.find(p => p.data.name === 'Jupiter'),
    narration: 'Jupiter is the king of planets — more massive than all other planets combined. Its Great Red Spot is a storm larger than Earth that has raged for at least 350 years. It has 95 known moons.',
    cameraDistance: 20
  },
  {
    name: 'Saturn',
    target: () => planetMeshes.find(p => p.data.name === 'Saturn'),
    narration: 'Saturn\'s stunning ring system stretches 282,000 km but is only about 10 meters thick. Saturn is the least dense planet — it would float in water if you could find a bathtub big enough!',
    cameraDistance: 22
  },
  {
    name: 'Uranus',
    target: () => planetMeshes.find(p => p.data.name === 'Uranus'),
    narration: 'Uranus rotates on its side at a 98° tilt, likely from a collision with an Earth-sized object. It was the first planet discovered with a telescope, by William Herschel in 1781.',
    cameraDistance: 14
  },
  {
    name: 'Neptune',
    target: () => planetMeshes.find(p => p.data.name === 'Neptune'),
    narration: 'Neptune has the strongest winds in the solar system, reaching 2,100 km/h. It was the first planet found through mathematical prediction rather than observation.',
    cameraDistance: 14
  },
  {
    name: 'Pluto & Beyond',
    target: () => dwarfPlanetMeshes.find(p => p.data.name === 'Pluto'),
    narration: 'Beyond Neptune lie the dwarf planets. Pluto, once the 9th planet, was reclassified in 2006. Its heart-shaped nitrogen glacier Sputnik Planitia is one of the solar system\'s most iconic features.',
    cameraDistance: 8
  }
];

function setupGuidedTour() {
  const tourBtn = document.getElementById('btn-tour');
  if (tourBtn) {
    tourBtn.addEventListener('click', startTour);
  }

  const exitBtn = document.getElementById('tour-exit');
  if (exitBtn) {
    exitBtn.addEventListener('click', exitTour);
  }

  const prevBtn = document.getElementById('tour-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => navigateTour(-1));
  }

  const nextBtn = document.getElementById('tour-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => navigateTour(1));
  }
}

function startTour() {
  isTourActive = true;
  tourStopIndex = 0;
  tourFollowTarget = null;
  tourTransitioning = false;
  document.getElementById('tour-overlay').classList.remove('hidden');
  document.getElementById('info-panel').classList.add('hidden');
  goToTourStop(0);
}

function exitTour() {
  isTourActive = false;
  tourFollowTarget = null;
  tourTransitioning = false;
  if (tourAutoTimer) {
    clearTimeout(tourAutoTimer);
    tourAutoTimer = null;
  }
  document.getElementById('tour-overlay').classList.add('hidden');
  resetCamera();
}

function navigateTour(direction) {
  if (tourAutoTimer) {
    clearTimeout(tourAutoTimer);
    tourAutoTimer = null;
  }
  const newIndex = tourStopIndex + direction;
  if (newIndex < 0 || newIndex >= tourStops.length) return;
  tourStopIndex = newIndex;
  goToTourStop(tourStopIndex);
}

function goToTourStop(index) {
  const stop = tourStops[index];
  if (!stop) return;

  // Update UI
  document.getElementById('tour-title').textContent = stop.name;
  document.getElementById('tour-narration').textContent = stop.narration;
  document.getElementById('tour-progress').textContent = `${index + 1} / ${tourStops.length}`;

  // Disable prev/next at boundaries
  const prevBtn = document.getElementById('tour-prev');
  const nextBtn = document.getElementById('tour-next');
  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) nextBtn.textContent = index === tourStops.length - 1 ? 'Finish ✓' : 'Next ▶';

  if (index === tourStops.length - 1) {
    if (nextBtn) {
      nextBtn.onclick = exitTour;
    }
  } else {
    if (nextBtn) {
      nextBtn.onclick = () => navigateTour(1);
    }
  }

  // Set follow target and distance
  tourFollowDistance = stop.cameraDistance;

  if (stop.customPosition) {
    // Static position (e.g. asteroid belt) — no follow, just fly there
    tourFollowTarget = null;
    const targetPos = stop.customPosition();
    const cameraPos = targetPos.clone().add(new THREE.Vector3(stop.cameraDistance, stop.cameraDistance * 0.5, stop.cameraDistance));
    tourTransitioning = true;
    animateCamera(cameraPos, targetPos, 2500, () => {
      tourTransitioning = false;
    });
  } else if (stop.target) {
    const targetEntry = stop.target();
    if (targetEntry) {
      const obj = targetEntry.group || targetEntry;
      tourFollowTarget = obj;

      // Get current planet position and fly the camera there
      const planetPos = new THREE.Vector3();
      obj.getWorldPosition(planetPos);
      const d = stop.cameraDistance;
      const cameraPos = planetPos.clone().add(new THREE.Vector3(d, d * 0.4, d));

      tourTransitioning = true;
      animateCamera(cameraPos, planetPos, 2500, () => {
        tourTransitioning = false;
        // Now continuous tracking takes over in the animate loop
      });
    }
  }

  // Auto-advance after 12 seconds (enough time to read + enjoy the view)
  if (tourAutoTimer) clearTimeout(tourAutoTimer);
  if (index < tourStops.length - 1) {
    tourAutoTimer = setTimeout(() => {
      if (isTourActive) {
        tourStopIndex++;
        goToTourStop(tourStopIndex);
      }
    }, 12000);
  }
}

// Called every frame from animate() to keep the camera locked on the orbiting planet
function updateTourCamera() {
  if (!tourFollowTarget) return;

  const planetPos = new THREE.Vector3();
  tourFollowTarget.getWorldPosition(planetPos);

  // Desired camera position: offset from the planet
  const d = tourFollowDistance;
  const desiredCamPos = planetPos.clone().add(new THREE.Vector3(d, d * 0.4, d));

  // Smoothly lerp camera to follow the planet (responsive but not jerky)
  camera.position.lerp(desiredCamPos, 0.08);
  controls.target.lerp(planetPos, 0.08);
}

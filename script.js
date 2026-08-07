import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { PLANETS, DWARF_PLANETS, SUN_DATA, MOON_DATA } from './planetData.js';
import {
  createStarfield,
  createMilkyWay,
  createConstellations,
  createKuiperBelt,
  createOortCloud,
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
let showKuiperBelt = true;
let showConstellations = false;
let isMeasuring = false;
let measureSelection = [];
let measureLineMesh = null;
let isEclipseMode = false;
let eclipseType = null;
let previousSimulationSpeed = 1.0;
let kuiperBelt, oortCloud, constellations;

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

// Mini-map (Enhanced Radar HUD)
let minimapCanvas = null;
let minimapCtx = null;
let minimapZoom = 1.0;
let minimapPanX = 0;
let minimapPanY = 0;
let minimapHoveredBody = null;
var MINIMAP_MAX_DIST = 100;
var MINIMAP_ZOOM_MIN = 0.35;
var MINIMAP_ZOOM_MAX = 14;
var mmColorMap = {
  'Sun': '#ffcc33', 'Mercury': '#8c7e6d', 'Venus': '#e8cda0', 'Earth': '#4a90d9',
  'Mars': '#c1440e', 'Jupiter': '#c88b3a', 'Saturn': '#f5deb3', 'Uranus': '#73c2d0',
  'Neptune': '#5577dd', 'Pluto': '#c8b496', 'Ceres': '#9a9a8a', 'Eris': '#e8e8e0'
};
var mmSizeMap = {
  'Sun': 5, 'Jupiter': 4.2, 'Saturn': 3.8, 'Neptune': 3.2, 'Uranus': 3.2,
  'Earth': 3, 'Venus': 2.6, 'Mars': 2.3, 'Mercury': 2, 'Pluto': 1.7, 'Eris': 1.7, 'Ceres': 1.4
};

// Ambient sound
let audioCtx = null;
let ambientGain = null;
let ambientOscillators = [];
let isSoundOn = false;

// Scale Toggle (Visual ↔ Realistic)
let isRealisticScale = false;
let scaleTransitionProgress = 0; // 0 = visual, 1 = realistic
let scaleTransitioning = false;

// Real radii in km — used to compute realistic proportions
var REAL_RADII = {
  'Sun': 696340, 'Mercury': 2440, 'Venus': 6052, 'Earth': 6371,
  'Mars': 3390, 'Jupiter': 69911, 'Saturn': 58232, 'Uranus': 25362,
  'Neptune': 24622, 'Pluto': 1189, 'Ceres': 473, 'Eris': 1163,
  'Moon': 1737, 'Io': 1822, 'Europa': 1561, 'Ganymede': 2634,
  'Callisto': 2410, 'Titan': 2575, 'Enceladus': 252, 'Mimas': 198,
  'Rhea': 764, 'Triton': 1353, 'Miranda': 236, 'Ariel': 579,
  'Umbriel': 585, 'Titania': 789, 'Charon': 606
};
var EARTH_REAL_R = 6371;
var EARTH_REF_SIZE = 0.5; // Earth's target visual radius in realistic mode
var SUN_SCALE_CAP = 2.0;  // Cap Sun scale to prevent it from eating planets

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
  setupMinimapInteraction();

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

  const milkyWay = createMilkyWay(25000);
  scene.add(milkyWay);
  
  kuiperBelt = createKuiperBelt(8000);
  scene.add(kuiperBelt);
  
  oortCloud = createOortCloud(5000);
  scene.add(oortCloud);
  
  constellations = createConstellations(40);
  constellations.visible = showConstellations;
  scene.add(constellations);
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
  
  populateMeasureDatalist();
  setupMeasurePanelDrag();
  setupEclipsePanelDrag();

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
      event.target.closest('#planet-search-wrapper') || event.target.closest('#minimap-container') ||
      event.target.closest('#measure-panel') || event.target.closest('#eclipse-panel')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getClickableObjects(), true);

  if (intersects.length > 0) {
    const found = resolveIntersection(intersects[0].object);
    if (found) {
      if (isMeasuring) {
        handleMeasureSelection(found);
      } else {
        selectPlanet(found.data, found.object);
      }
    }
  } else {
    if (!isMeasuring) {
      if (hoveredPlanet) {
        hoveredPlanet.material.emissiveIntensity = 0;
      }
      hoveredPlanet = null;
      const infoPanel = document.getElementById('info-panel');
      if (infoPanel) infoPanel.classList.add('hidden');
      selectedPlanet = null;
    }
  }
}

function onDoubleClick(event) {
  if (event.target.closest('#control-panel') || event.target.closest('#info-panel') ||
      event.target.closest('#time-travel-panel') || event.target.closest('#comparison-panel') ||
      event.target.closest('#stats-panel') || event.target.closest('#tour-overlay') ||
      event.target.closest('#minimap-container') || event.target.closest('#measure-panel') ||
      event.target.closest('#eclipse-panel')) {
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
  const panelHeader = document.getElementById('control-panel-header');
  if (panelHeader) {
    panelHeader.addEventListener('click', () => {
      document.getElementById('control-panel').classList.toggle('collapsed');
    });
  }

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
  
  const kuiperBtn = document.getElementById('toggle-kuiper');
  if (kuiperBtn) kuiperBtn.addEventListener('click', toggleKuiperBelt);
  
  const constellationsBtn = document.getElementById('toggle-constellations');
  if (constellationsBtn) constellationsBtn.addEventListener('click', toggleConstellations);

  const measureBtn = document.getElementById('btn-measure');
  if (measureBtn) measureBtn.addEventListener('click', toggleMeasureMode);
  
  const closeMeasureBtn = document.getElementById('close-measure');
  if (closeMeasureBtn) closeMeasureBtn.addEventListener('click', () => {
    if (isMeasuring) toggleMeasureMode();
  });
  
  const clearMeasureBtn = document.getElementById('btn-measure-clear');
  if (clearMeasureBtn) clearMeasureBtn.addEventListener('click', clearMeasurement);

  const eclipseBtn = document.getElementById('btn-eclipse');
  if (eclipseBtn) eclipseBtn.addEventListener('click', toggleEclipsePanel);
  
  const closeEclipseBtn = document.getElementById('close-eclipse');
  if (closeEclipseBtn) closeEclipseBtn.addEventListener('click', toggleEclipsePanel);
  
  const btnSolar = document.getElementById('btn-solar-eclipse');
  if (btnSolar) btnSolar.addEventListener('click', () => simulateEclipse('solar'));
  
  const btnLunar = document.getElementById('btn-lunar-eclipse');
  if (btnLunar) btnLunar.addEventListener('click', () => simulateEclipse('lunar'));
  
  const btnExitEclipse = document.getElementById('btn-exit-eclipse');
  if (btnExitEclipse) btnExitEclipse.addEventListener('click', exitEclipse);

  const target1Input = document.getElementById('measure-target-1');
  const target2Input = document.getElementById('measure-target-2');
  if (target1Input) {
    target1Input.addEventListener('change', (e) => {
      const val = e.target.value;
      if (measureSelection.length >= 1) clearMeasurement();
      if (!val) return;
      const found = findBodyByName(val);
      if (found) {
        handleMeasureSelection(found);
      } else {
        e.target.value = '';
      }
    });
  }
  if (target2Input) {
    target2Input.addEventListener('change', (e) => {
      const val = e.target.value;
      if (measureSelection.length === 2) {
        const firstFound = measureSelection[0];
        clearMeasurement();
        handleMeasureSelection(firstFound);
      }
      if (!val) return;
      const found = findBodyByName(val);
      if (found) {
        handleMeasureSelection(found);
      } else {
        e.target.value = '';
      }
    });
  }

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

  // Scale Toggle
  const scaleBtn = document.getElementById('btn-scale-toggle');
  if (scaleBtn) scaleBtn.addEventListener('click', toggleScaleMode);

  // Quiz Mode
  const quizBtn = document.getElementById('btn-quiz');
  if (quizBtn) quizBtn.addEventListener('click', startQuiz);
  
  document.getElementById('close-quiz').addEventListener('click', () => {
    document.getElementById('quiz-panel').classList.add('hidden');
    quizActive = false;
  });
  
  document.getElementById('btn-quiz-next').addEventListener('click', nextQuizQuestion);
  document.getElementById('btn-quiz-restart').addEventListener('click', startQuiz);
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
      
      if (kuiperBelt && showKuiperBelt) {
        kuiperBelt.rotation.y -= delta * 0.01 * simulationSpeed;
      }
      if (oortCloud && showKuiperBelt) {
        oortCloud.rotation.y += delta * 0.005 * simulationSpeed;
      }
    }

    // Shooting stars
    updateShootingStars(delta, elapsed);
    
    // Measurement Line Updates
    if (isMeasuring && measureSelection.length === 2) {
      updateMeasurement();
    }

    if (stars) {
      stars.rotation.y += delta * 0.002;
    }
    if (constellations) {
      constellations.rotation.y += delta * 0.002;
    }
  }

  if (scaleTransitioning) updateScaleTransition(delta);

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

function toggleKuiperBelt() {
  showKuiperBelt = !showKuiperBelt;
  if (kuiperBelt) kuiperBelt.visible = showKuiperBelt;
  if (oortCloud) oortCloud.visible = showKuiperBelt;
  
  const btn = document.getElementById('toggle-kuiper');
  if (btn) {
    btn.textContent = showKuiperBelt ? 'ON' : 'OFF';
    btn.classList.toggle('active', showKuiperBelt);
  }
}

function toggleConstellations() {
  showConstellations = !showConstellations;
  if (constellations) constellations.visible = showConstellations;
  
  const btn = document.getElementById('toggle-constellations');
  if (btn) {
    btn.textContent = showConstellations ? 'ON' : 'OFF';
    btn.classList.toggle('active', showConstellations);
  }
}

// ===================================================
// MEASUREMENT TOOL
// ===================================================

function toggleMeasureMode() {
  isMeasuring = !isMeasuring;
  const btn = document.getElementById('btn-measure');
  if (btn) btn.classList.toggle('active', isMeasuring);
  
  const panel = document.getElementById('measure-panel');
  if (panel) {
    if (isMeasuring) {
      panel.classList.remove('hidden');
      clearMeasurement();
    } else {
      panel.classList.add('hidden');
      clearMeasurement();
    }
  }
}

function handleMeasureSelection(found) {
  if (measureSelection.length >= 2) return;
  
  // Prevent selecting the same body twice
  if (measureSelection.length === 1 && measureSelection[0].object === found.object) return;

  measureSelection.push(found);
  
  const target1 = document.getElementById('measure-target-1');
  const target2 = document.getElementById('measure-target-2');
  
  if (measureSelection.length === 1) {
    target1.value = found.data ? found.data.name : found.name;
    target1.classList.remove('empty');
    target1.classList.remove('active-selection');
    target2.disabled = false;
    target2.classList.add('active-selection');
    document.getElementById('measure-instruction').textContent = "Select the second celestial body...";
  } else if (measureSelection.length === 2) {
    target2.value = found.data ? found.data.name : found.name;
    target2.classList.remove('empty');
    target2.classList.remove('active-selection');
    document.getElementById('measure-instruction').textContent = "Measurement complete.";
    document.getElementById('btn-measure-clear').disabled = false;
    
    const material = new THREE.LineDashedMaterial({
      color: 0x42f5b3,
      linewidth: 2,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.8
    });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)
    ]);
    measureLineMesh = new THREE.Line(geometry, material);
    measureLineMesh.computeLineDistances();
    scene.add(measureLineMesh);
    
    document.getElementById('measure-result').classList.remove('hidden');
    updateMeasurement();
  }
}

function clearMeasurement() {
  measureSelection = [];
  if (measureLineMesh) {
    scene.remove(measureLineMesh);
    measureLineMesh.geometry.dispose();
    measureLineMesh.material.dispose();
    measureLineMesh = null;
  }
  
  const target1 = document.getElementById('measure-target-1');
  const target2 = document.getElementById('measure-target-2');
  if (target1) {
    target1.value = "";
    target1.className = "measure-target-input empty active-selection";
    target1.disabled = false;
  }
  if (target2) {
    target2.value = "";
    target2.className = "measure-target-input empty";
    target2.disabled = true;
  }
  
  const instruction = document.getElementById('measure-instruction');
  if (instruction) instruction.textContent = "Select the first celestial body...";
  
  const result = document.getElementById('measure-result');
  if (result) result.classList.add('hidden');
  
  const clearBtn = document.getElementById('btn-measure-clear');
  if (clearBtn) clearBtn.disabled = true;
}

function updateMeasurement() {
  if (!isMeasuring || measureSelection.length !== 2 || !measureLineMesh) return;
  
  const pos1 = new THREE.Vector3();
  const pos2 = new THREE.Vector3();
  
  measureSelection[0].object.getWorldPosition(pos1);
  measureSelection[1].object.getWorldPosition(pos2);
  
  measureLineMesh.geometry.setFromPoints([pos1, pos2]);
  measureLineMesh.computeLineDistances();
  
  // Calculate distance in millions of km (1 unit ~ 9.97 million km)
  const distUnits = pos1.distanceTo(pos2);
  const distMillionsKm = distUnits * 9.97;
  
  // Format the display
  let displayStr = "";
  if (distMillionsKm < 1) {
    displayStr = (distMillionsKm * 1000000).toLocaleString(undefined, {maximumFractionDigits: 0}) + " km";
  } else {
    displayStr = distMillionsKm.toLocaleString(undefined, {maximumFractionDigits: 2}) + " Million km";
  }
  
  const valEl = document.getElementById('measure-distance-value');
  if (valEl) valEl.textContent = displayStr;
}

function findBodyByName(name) {
  const query = name.toLowerCase().trim();
  const clickables = getClickableObjects();
  for (const obj of clickables) {
    const found = resolveIntersection(obj);
    if (found) {
      const foundName = (found.data ? found.data.name : found.name).toLowerCase();
      if (foundName === query) return found;
    }
  }
  return null;
}

function populateMeasureDatalist() {
  const datalist = document.getElementById('celestial-bodies-list');
  if (!datalist) return;
  datalist.innerHTML = '';
  
  const clickables = getClickableObjects();
  const names = new Set();
  
  for (const obj of clickables) {
    const found = resolveIntersection(obj);
    if (found) {
      const name = found.data ? found.data.name : found.name;
      if (name) names.add(name);
    }
  }
  
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    datalist.appendChild(opt);
  });
}

function setupMeasurePanelDrag() {
  const panel = document.getElementById('measure-panel');
  const header = document.getElementById('measure-panel-header');
  if (!panel || !header) return;
  
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    panel.style.transform = 'none';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// ===================================================
// ECLIPSE SIMULATOR
// ===================================================
let eclipseVisuals = []; // All THREE objects added during eclipse
let eclipseLabels = [];  // All CSS2DObjects added

function toggleEclipsePanel() {
  const panel = document.getElementById('eclipse-panel');
  if (panel) {
    panel.classList.toggle('hidden');
    const btn = document.getElementById('btn-eclipse');
    if (btn) btn.classList.toggle('active', !panel.classList.contains('hidden'));
  }
}

function simulateEclipse(type) {
  // Clean up any previous eclipse visuals
  removeEclipseVisuals();
  
  isEclipseMode = true;
  eclipseType = type;
  
  // Save and pause time
  if (simulationSpeed !== 0) {
    previousSimulationSpeed = simulationSpeed;
  }
  simulationSpeed = 0;
  isPaused = true;
  const speedDisplay = document.getElementById('speed-display');
  if (speedDisplay) speedDisplay.textContent = 'Speed: PAUSED (Eclipse)';
  
  const earthEntry = planetMeshes.find(p => p.data.name === 'Earth');
  if (!earthEntry || !moonOrbit || !moon) return;
  
  const SUN_R = 4;
  const EARTH_R = 1.0;
  const MOON_R = 0.27;
  const EARTH_DIST = earthEntry.data.distance; // 15
  const MOON_ORBIT_R = 2.5;
  
  // Place Earth on the +X axis so Sun is at origin and alignment is along X
  earthEntry.angle = 0;
  earthEntry.group.position.set(EARTH_DIST, 0, 0);
  
  if (type === 'solar') {
    // Moon between Earth and Sun (toward Sun from Earth)
    moonOrbit.userData.angle = Math.PI;
    moonOrbit.children[0].position.set(-MOON_ORBIT_R, 0, 0);
  } else {
    // Moon behind Earth (away from Sun)
    moonOrbit.userData.angle = 0;
    moonOrbit.children[0].position.set(MOON_ORBIT_R, 0, 0);
  }
  
  // Force scene graph update to get correct world positions
  scene.updateMatrixWorld(true);
  
  const sunPos = new THREE.Vector3(0, 0, 0);
  const earthPos = new THREE.Vector3();
  earthEntry.group.getWorldPosition(earthPos);
  const moonPos = new THREE.Vector3();
  moon.getWorldPosition(moonPos);
  
  // ---- DRAW SHADOW DIAGRAM ----
  if (type === 'solar') {
    drawEclipseDiagram(sunPos, SUN_R, moonPos, MOON_R, earthPos, EARTH_R);
  } else {
    drawEclipseDiagram(sunPos, SUN_R, earthPos, EARTH_R, moonPos, MOON_R);
  }
  
  // ---- ADD LABELS ----
  addEclipseLabel('SUN', sunPos, 0, SUN_R + 1.5);
  addEclipseLabel('EARTH', earthPos, 0, EARTH_R + 1.0);
  addEclipseLabel('MOON', moonPos, 0, MOON_R + 0.8);
  
  // ---- CAMERA: fixed side view like the reference diagram ----
  const farX = type === 'lunar' ? moonPos.x : earthPos.x;
  const midX = (sunPos.x + farX) / 2;
  const spanX = Math.abs(farX - sunPos.x);
  const camZ = spanX * 1.1; // far enough to see everything
  
  // Stop auto-rotation but keep user controls (pan/zoom/rotate) enabled
  controls.autoRotate = false;
  
  // Set camera directly first for immediate effect
  camera.position.set(midX, 2, camZ);
  controls.target.set(midX, 0, 0);
  controls.update();
  
  // Update UI buttons
  const btnSolar = document.getElementById('btn-solar-eclipse');
  const btnLunar = document.getElementById('btn-lunar-eclipse');
  const btnExit = document.getElementById('btn-exit-eclipse');
  if (btnSolar) btnSolar.disabled = true;
  if (btnLunar) btnLunar.disabled = true;
  if (btnExit) {
    btnExit.disabled = false;
    btnExit.style.pointerEvents = 'auto';
  }
  
  // Show educational info
  const infoDiv = document.getElementById('eclipse-info');
  const typeLabel = document.getElementById('eclipse-type-label');
  const descEl = document.getElementById('eclipse-description');
  
  if (infoDiv && typeLabel && descEl) {
    infoDiv.classList.remove('hidden');
    if (type === 'solar') {
      typeLabel.textContent = '☀️ Total Solar Eclipse';
      descEl.textContent = 'The Moon passes between the Sun and Earth. The dark inner cone (Umbra) is the region of total eclipse. The lighter outer cone (Penumbra) sees a partial eclipse.';
    } else {
      typeLabel.textContent = '🌒 Total Lunar Eclipse';
      descEl.textContent = 'Earth passes between the Sun and Moon. Earth\'s shadow darkens the Moon, turning it copper-red ("Blood Moon") as only red wavelengths bend through our atmosphere.';
    }
  }
}

/**
 * Draw the eclipse diagram using only lines and manually-built BufferGeometry triangles.
 * No ShapeGeometry (which can freeze on degenerate shapes).
 */
function drawEclipseDiagram(sunPos, sunR, blockerPos, blockerR, targetPos, targetR) {
  const sx = sunPos.x;
  const bx = blockerPos.x;
  const tx = targetPos.x;
  const extendX = tx + Math.abs(tx - bx) * 1.5;
  
  const dashedMat = new THREE.LineDashedMaterial({
    color: 0xcccccc,
    dashSize: 0.3,
    gapSize: 0.15,
    transparent: true,
    opacity: 0.6
  });
  
  // UMBRA cross-lines (Sun top → Blocker bottom, Sun bottom → Blocker top)
  const u1Start = new THREE.Vector3(sx, sunR, 0);
  const u1Through = new THREE.Vector3(bx, -blockerR, 0);
  const u1Dir = new THREE.Vector3().subVectors(u1Through, u1Start).normalize();
  const u1End = vecAtX(u1Start, u1Dir, extendX);
  
  const u2Start = new THREE.Vector3(sx, -sunR, 0);
  const u2Through = new THREE.Vector3(bx, blockerR, 0);
  const u2Dir = new THREE.Vector3().subVectors(u2Through, u2Start).normalize();
  const u2End = vecAtX(u2Start, u2Dir, extendX);
  
  addEclipseLine([u1Start, u1End], dashedMat);
  addEclipseLine([u2Start, u2End], dashedMat);
  
  // PENUMBRA same-side lines (Sun top → Blocker top, Sun bottom → Blocker bottom)
  const p1Start = new THREE.Vector3(sx, sunR, 0);
  const p1Through = new THREE.Vector3(bx, blockerR, 0);
  const p1Dir = new THREE.Vector3().subVectors(p1Through, p1Start).normalize();
  const p1End = vecAtX(p1Start, p1Dir, extendX);
  
  const p2Start = new THREE.Vector3(sx, -sunR, 0);
  const p2Through = new THREE.Vector3(bx, -blockerR, 0);
  const p2Dir = new THREE.Vector3().subVectors(p2Through, p2Start).normalize();
  const p2End = vecAtX(p2Start, p2Dir, extendX);
  
  addEclipseLine([p1Start, p1End], dashedMat);
  addEclipseLine([p2Start, p2End], dashedMat);
  
  // Find umbra crossing point
  const cross = intersect2D(u1Start, u1Dir, u2Start, u2Dir);
  
  // UMBRA filled triangle (dark cone from blocker to crossing point)
  if (cross && cross.x > bx) {
    addFilledTriangle(
      bx, blockerR, 0,
      bx, -blockerR, 0,
      cross.x, cross.y, 0,
      0x000000, 0.45
    );
    
    // Umbra label
    const umLabelX = (bx + cross.x) / 2;
    addEclipseLabel('Umbra', new THREE.Vector3(umLabelX, -blockerR - 0.8, 0), 0, 0, '#ff6b6b');
  }
  
  // PENUMBRA filled areas (lighter strips between pen lines and umbra lines)
  const penTopAtExt = vecAtX(p1Start, p1Dir, extendX);
  const umbraTopAtExt = vecAtX(u1Start, u1Dir, extendX);
  const penBotAtExt = vecAtX(p2Start, p2Dir, extendX);
  const umbraBotAtExt = vecAtX(u2Start, u2Dir, extendX);
  
  // Top penumbra strip
  addFilledTriangle(
    bx, blockerR, 0,
    penTopAtExt.x, penTopAtExt.y, 0,
    umbraTopAtExt.x, umbraTopAtExt.y, 0,
    0x1a1a4a, 0.2
  );
  
  // Bottom penumbra strip
  addFilledTriangle(
    bx, -blockerR, 0,
    penBotAtExt.x, penBotAtExt.y, 0,
    umbraBotAtExt.x, umbraBotAtExt.y, 0,
    0x1a1a4a, 0.2
  );
  
  // Penumbra label
  const penLabelX = (bx + extendX) / 2;
  addEclipseLabel('Penumbra', new THREE.Vector3(penLabelX, -blockerR - 2.0, 0), 0, 0, '#ff9f43');
}

function vecAtX(origin, dir, x) {
  if (Math.abs(dir.x) < 0.0001) return origin.clone();
  const t = (x - origin.x) / dir.x;
  return new THREE.Vector3(origin.x + dir.x * t, origin.y + dir.y * t, 0);
}

function intersect2D(p1, d1, p2, d2) {
  const det = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(det) < 0.0001) return null;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / det;
  return new THREE.Vector3(p1.x + d1.x * t, p1.y + d1.y * t, 0);
}

function addFilledTriangle(x1, y1, z1, x2, y2, z2, x3, y3, z3, color, opacity) {
  const vertices = new Float32Array([x1, y1, z1, x2, y2, z2, x3, y3, z3]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  eclipseVisuals.push(mesh);
}

function addEclipseLine(points, material) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material.clone());
  line.computeLineDistances();
  scene.add(line);
  eclipseVisuals.push(line);
}

function addEclipseLabel(text, position, offsetX, offsetY, color) {
  const div = document.createElement('div');
  div.className = 'eclipse-diagram-label';
  div.textContent = text;
  if (color) div.style.color = color;
  const label = new CSS2DObject(div);
  label.position.set(position.x + (offsetX || 0), position.y + (offsetY || 0), position.z);
  scene.add(label);
  eclipseVisuals.push(label);
  eclipseLabels.push({ object: label, element: div });
}

function removeEclipseVisuals() {
  eclipseVisuals.forEach(obj => {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  });
  eclipseVisuals = [];
  
  eclipseLabels.forEach(l => {
    if (l.element && l.element.parentNode) {
      l.element.parentNode.removeChild(l.element);
    }
  });
  eclipseLabels = [];
}

function exitEclipse() {
  removeEclipseVisuals();
  
  isEclipseMode = false;
  eclipseType = null;
  
  simulationSpeed = previousSimulationSpeed || 1;
  isPaused = false;
  const speedDisplay = document.getElementById('speed-display');
  if (speedDisplay) speedDisplay.textContent = `Speed: ${simulationSpeed}x`;
  
  const btnSolar = document.getElementById('btn-solar-eclipse');
  const btnLunar = document.getElementById('btn-lunar-eclipse');
  const btnExit = document.getElementById('btn-exit-eclipse');
  if (btnSolar) btnSolar.disabled = false;
  if (btnLunar) btnLunar.disabled = false;
  if (btnExit) btnExit.disabled = true;
  
  // Hide info
  const infoDiv = document.getElementById('eclipse-info');
  if (infoDiv) infoDiv.classList.add('hidden');
  
  // Reset camera to a nice overview — set directly to avoid TWEEN/OrbitControls conflicts
  camera.position.set(0, 25, 40);
  controls.target.set(0, 0, 0);
  controls.update();
}

function setupEclipsePanelDrag() {
  const panel = document.getElementById('eclipse-panel');
  const header = document.getElementById('eclipse-panel-header');
  if (!panel || !header) return;
  
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    panel.style.transform = 'none';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
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
// QUIZ MODE (Interactive Trivia)
// ===================================================
let quizActive = false;
let quizScore = 0;
let quizQuestionCount = 0;
const QUIZ_MAX_QUESTIONS = 10;
let quizCurrentAnswer = -1;
let quizOptionsBtns = [];

function startQuiz() {
  quizActive = true;
  quizScore = 0;
  quizQuestionCount = 0;
  
  document.getElementById('quiz-panel').classList.remove('hidden');
  document.getElementById('quiz-content').classList.remove('hidden');
  document.getElementById('quiz-end-screen').classList.add('hidden');
  
  const optionsContainer = document.getElementById('quiz-options');
  if (optionsContainer.children.length === 0) {
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.onclick = () => checkQuizAnswer(i);
      optionsContainer.appendChild(btn);
      quizOptionsBtns.push(btn);
    }
  }
  
  nextQuizQuestion();
}

function nextQuizQuestion() {
  if (quizQuestionCount >= QUIZ_MAX_QUESTIONS) {
    endQuiz();
    return;
  }
  
  quizQuestionCount++;
  document.getElementById('quiz-score').textContent = `Score: ${quizScore}/${QUIZ_MAX_QUESTIONS} (Q: ${quizQuestionCount})`;
  
  document.getElementById('quiz-feedback').classList.add('hidden');
  document.getElementById('btn-quiz-next').classList.add('hidden');
  
  quizOptionsBtns.forEach(btn => {
    btn.classList.remove('correct', 'wrong');
    btn.disabled = false;
  });
  
  generateQuizQuestion();
}

function generateQuizQuestion() {
  const allBodies = [...PLANETS, ...DWARF_PLANETS];
  const questionTypes = ['moons', 'radius', 'temperature', 'orbitalPeriod', 'rotationPeriod', 'funFact', 'distance'];
  const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  const correctBody = allBodies[Math.floor(Math.random() * allBodies.length)];
  
  let questionText = '';
  let correctValue = '';
  
  switch(type) {
    case 'moons':
      questionText = `How many moons does ${correctBody.name} have?`;
      correctValue = correctBody.moons.toString();
      break;
    case 'radius':
      questionText = `Which celestial body has a diameter of roughly ${correctBody.diameter}?`;
      correctValue = correctBody.name;
      break;
    case 'temperature':
      questionText = `Which body has an average temperature of ${correctBody.temperature}?`;
      correctValue = correctBody.name;
      break;
    case 'orbitalPeriod':
      questionText = `Which celestial body takes ${correctBody.orbitalPeriod} to orbit the Sun?`;
      correctValue = correctBody.name;
      break;
    case 'rotationPeriod':
      questionText = `Which body has a rotation period (day length) of ${correctBody.rotationPeriod}?`;
      correctValue = correctBody.name;
      break;
    case 'funFact':
      questionText = `"${correctBody.funFact}" Which body is this?`;
      correctValue = correctBody.name;
      break;
    case 'distance':
      questionText = `Which body is approximately ${correctBody.distanceFromSun} from the Sun?`;
      correctValue = correctBody.name;
      break;
  }
  
  document.getElementById('quiz-question').textContent = questionText;
  
  let options = [correctValue];
  let safetyCounter = 0;
  while(options.length < 4 && safetyCounter < 100) {
    safetyCounter++;
    let wrongBody = allBodies[Math.floor(Math.random() * allBodies.length)];
    let wrongValue = (type === 'moons') ? wrongBody.moons.toString() : wrongBody.name;
    
    if (!options.includes(wrongValue)) {
      options.push(wrongValue);
    }
  }
  
  options.sort(() => Math.random() - 0.5);
  quizCurrentAnswer = options.indexOf(correctValue);
  
  options.forEach((opt, idx) => {
    if (quizOptionsBtns[idx]) quizOptionsBtns[idx].textContent = opt;
  });
}

function checkQuizAnswer(selectedIndex) {
  quizOptionsBtns.forEach(btn => btn.disabled = true);
  
  const feedback = document.getElementById('quiz-feedback');
  const feedbackIcon = document.getElementById('quiz-feedback-icon');
  const feedbackText = document.getElementById('quiz-feedback-text');
  
  feedback.classList.remove('hidden', 'correct', 'wrong');
  
  if (selectedIndex === quizCurrentAnswer) {
    quizScore++;
    quizOptionsBtns[selectedIndex].classList.add('correct');
    feedback.classList.add('correct');
    feedbackIcon.textContent = '✅';
    feedbackText.textContent = 'Correct!';
    document.getElementById('quiz-score').textContent = `Score: ${quizScore}/${QUIZ_MAX_QUESTIONS} (Q: ${quizQuestionCount})`;
  } else {
    quizOptionsBtns[selectedIndex].classList.add('wrong');
    quizOptionsBtns[quizCurrentAnswer].classList.add('correct');
    feedback.classList.add('wrong');
    feedbackIcon.textContent = '❌';
    feedbackText.textContent = 'Incorrect!';
  }
  
  document.getElementById('btn-quiz-next').classList.remove('hidden');
}

function endQuiz() {
  document.getElementById('quiz-content').classList.add('hidden');
  const endScreen = document.getElementById('quiz-end-screen');
  endScreen.classList.remove('hidden');
  
  document.getElementById('quiz-final-score').textContent = `${quizScore}/${QUIZ_MAX_QUESTIONS}`;
  
  const msgEl = document.getElementById('quiz-final-msg');
  if (quizScore === QUIZ_MAX_QUESTIONS) msgEl.textContent = 'Perfect score! You are a master of the Solar System!';
  else if (quizScore >= 7) msgEl.textContent = 'Great job! You know your space facts well.';
  else if (quizScore >= 4) msgEl.textContent = 'Good effort! Keep exploring to learn more.';
  else msgEl.textContent = 'Space is vast and full of mysteries! Take the Guided Tour to learn more.';
}

// ===================================================
// SCALE TOGGLE (Visual ↔ Realistic Proportions)
// ===================================================

function getRealisticScale(name, visualRadius) {
  const real = REAL_RADII[name];
  if (!real) return 1;
  let s = (real / EARTH_REAL_R) * EARTH_REF_SIZE / visualRadius;
  if (name === 'Sun') s = Math.min(s, SUN_SCALE_CAP);
  return s;
}

function toggleScaleMode() {
  isRealisticScale = !isRealisticScale;
  scaleTransitioning = true;

  const btn = document.getElementById('btn-scale-toggle');
  const indicator = document.getElementById('scale-indicator');
  const modeText = document.getElementById('scale-mode-text');

  if (isRealisticScale) {
    btn.classList.add('active');
    btn.textContent = '📐 Visual Scale';
    modeText.textContent = 'Realistic Proportions';
  } else {
    btn.classList.remove('active');
    btn.textContent = '📐 Realistic Scale';
    modeText.textContent = 'Visual Proportions';
  }

  // Show indicator briefly
  indicator.classList.add('visible');
  clearTimeout(toggleScaleMode._hideTimer);
  toggleScaleMode._hideTimer = setTimeout(() => {
    indicator.classList.remove('visible');
  }, 2500);
}

function updateScaleTransition(delta) {
  const target = isRealisticScale ? 1 : 0;
  const speed = 1.5; // transition completes in ~0.67 seconds

  if (Math.abs(scaleTransitionProgress - target) < 0.002) {
    scaleTransitionProgress = target;
    scaleTransitioning = false;
  } else {
    scaleTransitionProgress += (target - scaleTransitionProgress) * Math.min(speed * delta * 5, 0.15);
  }

  const t = easeInOutCubic(scaleTransitionProgress);

  // --- Sun ---
  const sunScale = lerpScale(1, getRealisticScale('Sun', 4), t);
  if (sun) sun.scale.setScalar(sunScale);
  if (sunGlow) sunGlow.scale.setScalar(1.5 * sunScale);
  if (outerGlow) outerGlow.scale.setScalar(2.0 * sunScale);

  // --- Planets ---
  planetMeshes.forEach(p => {
    const rs = getRealisticScale(p.data.name, p.data.radius);
    const s = lerpScale(1, rs, t);
    p.mesh.scale.setScalar(s);
  });

  // --- Dwarf Planets ---
  dwarfPlanetMeshes.forEach(p => {
    const rs = getRealisticScale(p.data.name, p.data.radius);
    const s = lerpScale(1, rs, t);
    p.mesh.scale.setScalar(s);
  });

  // --- Earth's Moon ---
  if (moon) {
    const rs = getRealisticScale('Moon', 0.27);
    moon.scale.setScalar(lerpScale(1, rs, t));
  }

  // --- Gas giant moons ---
  gasGiantsMoons.forEach(m => {
    const rs = getRealisticScale(m.data.name, m.data.radius);
    m.mesh.scale.setScalar(lerpScale(1, rs, t));
  });
}

function lerpScale(from, to, t) {
  return from + (to - from) * t;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ===================================================
// ENHANCED MINI-MAP (Sci-Fi Radar HUD)
// ===================================================


function mmCol(name) { return mmColorMap[name] || '#aaaaaa'; }
function mmSz(name) { return (mmSizeMap[name] || 1.5) * Math.min(minimapZoom * 0.3 + 0.7, 1.6); }
function hexRGBA(hex, a) {
  if (!hex || hex[0] !== '#') return `rgba(180,180,180,${a})`;
  return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
}

function worldToMM(wx, wz) {
  const W = minimapCanvas.width;
  const s = (W / 2 - 15) / MINIMAP_MAX_DIST * minimapZoom;
  return { x: W / 2 + minimapPanX + wx * s, y: W / 2 + minimapPanY + wz * s };
}

function mmToWorld(sx, sy) {
  const W = minimapCanvas.width;
  const s = (W / 2 - 15) / MINIMAP_MAX_DIST * minimapZoom;
  return { x: (sx - W / 2 - minimapPanX) / s, z: (sy - W / 2 - minimapPanY) / s };
}

// --- Minimap Interaction Setup ---
function setupMinimapInteraction() {
  const cv = document.getElementById('minimap');
  if (!cv) return;
  minimapCanvas = cv;
  minimapCtx = cv.getContext('2d');

  let isDown = false, sX = 0, sY = 0, wasDrag = false;

  // Mouse-wheel zoom (toward cursor)
  cv.addEventListener('wheel', e => {
    e.preventDefault(); e.stopPropagation();
    const rect = cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width * cv.width;
    const my = (e.clientY - rect.top) / rect.height * cv.height;
    const f = e.deltaY > 0 ? 0.85 : 1.18;
    const nz = Math.max(MINIMAP_ZOOM_MIN, Math.min(MINIMAP_ZOOM_MAX, minimapZoom * f));
    const r = nz / minimapZoom;
    const cx = cv.width / 2, cy = cv.height / 2;
    minimapPanX = mx - cx - (mx - cx - minimapPanX) * r;
    minimapPanY = my - cy - (my - cy - minimapPanY) * r;
    minimapZoom = nz;
    const el = document.getElementById('minimap-zoom-level');
    if (el) el.textContent = nz.toFixed(1) + '×';
  }, { passive: false });

  // Drag to pan / click to focus
  cv.addEventListener('mousedown', e => {
    isDown = true; wasDrag = false; sX = e.clientX; sY = e.clientY; e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (isDown) {
      const dx = e.clientX - sX, dy = e.clientY - sY;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        wasDrag = true;
        const rect = cv.getBoundingClientRect();
        minimapPanX += dx / rect.width * cv.width;
        minimapPanY += dy / rect.height * cv.height;
        sX = e.clientX; sY = e.clientY;
        cv.style.cursor = 'grabbing';
      }
    }
    // Hover detection
    if (minimapCanvas) {
      const rect = cv.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const mx = (e.clientX - rect.left) / rect.width * cv.width;
        const my = (e.clientY - rect.top) / rect.height * cv.height;
        minimapHoveredBody = getMMBodyAt(mx, my);
        if (!isDown) cv.style.cursor = minimapHoveredBody ? 'pointer' : 'crosshair';
      } else {
        minimapHoveredBody = null;
      }
    }
  });

  window.addEventListener('mouseup', e => {
    if (isDown && !wasDrag) {
      const rect = cv.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const mx = (e.clientX - rect.left) / rect.width * cv.width;
        const my = (e.clientY - rect.top) / rect.height * cv.height;
        handleMMClick(mx, my);
      }
    }
    isDown = false;
    cv.style.cursor = minimapHoveredBody ? 'pointer' : 'crosshair';
  });

  // Double-click resets zoom/pan
  cv.addEventListener('dblclick', e => {
    e.preventDefault();
    minimapZoom = 1; minimapPanX = 0; minimapPanY = 0;
    const el = document.getElementById('minimap-zoom-level');
    if (el) el.textContent = '1.0×';
  });

  cv.addEventListener('contextmenu', e => e.preventDefault());
}

// --- Hit detection ---
function getMMBodyAt(mx, my) {
  const hr = Math.max(6, 8 / Math.sqrt(minimapZoom));
  const sp = worldToMM(0, 0);
  if (Math.hypot(mx - sp.x, my - sp.y) < hr + 2) return { name: 'Sun', type: 'sun' };
  for (const p of planetMeshes) {
    const pos = worldToMM(p.group.position.x, p.group.position.z);
    if (Math.hypot(mx - pos.x, my - pos.y) < hr) return { name: p.data.name, type: 'planet', entry: p };
  }
  if (showDwarfPlanets) {
    for (const p of dwarfPlanetMeshes) {
      const pos = worldToMM(p.group.position.x, p.group.position.z);
      if (Math.hypot(mx - pos.x, my - pos.y) < hr) return { name: p.data.name, type: 'dwarf', entry: p };
    }
  }
  return null;
}

// --- Click to focus / teleport ---
function handleMMClick(mx, my) {
  const body = getMMBodyAt(mx, my);
  if (body) {
    if (body.type === 'sun') { focusPlanet(sun); }
    else if (body.entry) { focusPlanet(body.entry.group); }
    return;
  }
  // Click on empty space → fly camera there
  const w = mmToWorld(mx, my);
  const tgt = new THREE.Vector3(w.x, 0, w.z);
  animateCamera(tgt.clone().add(new THREE.Vector3(0, 25, 25)), tgt);
}

// --- Main draw (called every frame) ---
function updateMinimap() {
  if (!minimapCanvas) {
    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
  }
  if (!minimapCtx) return;

  const ctx = minimapCtx;
  const W = minimapCanvas.width, H = minimapCanvas.height;
  const elapsed = clock ? clock.getElapsedTime() : 0;

  ctx.clearRect(0, 0, W, H);
  ctx.save();

  // Clip to rounded rect
  const cr = 8;
  ctx.beginPath();
  ctx.moveTo(cr, 0); ctx.lineTo(W - cr, 0); ctx.quadraticCurveTo(W, 0, W, cr);
  ctx.lineTo(W, H - cr); ctx.quadraticCurveTo(W, H, W - cr, H);
  ctx.lineTo(cr, H); ctx.quadraticCurveTo(0, H, 0, H - cr);
  ctx.lineTo(0, cr); ctx.quadraticCurveTo(0, 0, cr, 0);
  ctx.closePath(); ctx.clip();

  // Background gradient
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, '#080e1c'); bg.addColorStop(0.6, '#040814'); bg.addColorStop(1, '#02050f');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Draw layers
  drawMMGrid(ctx, W, H);
  drawMMOrbits(ctx, W);
  drawMMRings(ctx, W);
  drawMMSweep(ctx, W, elapsed);
  drawMMComets(ctx, W);
  drawMMBodies(ctx, W, elapsed);
  drawMMCamera(ctx, W);
  drawMMCorners(ctx, W, H);
  if (minimapHoveredBody) drawMMLabel(ctx, W);

  ctx.restore();
}

// --- Grid overlay ---
function drawMMGrid(ctx, W, H) {
  let step = 22 * minimapZoom;
  if (step < 12) step *= 2; if (step < 12) step *= 2;
  if (step > 70) step /= 2; if (step > 70) step /= 2;

  ctx.strokeStyle = 'rgba(40, 80, 130, 0.05)';
  ctx.lineWidth = 0.5;
  const ox = (W / 2 + minimapPanX) % step;
  const oy = (H / 2 + minimapPanY) % step;
  for (let x = ox; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = oy; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Origin crosshair (Sun)
  const o = worldToMM(0, 0);
  ctx.strokeStyle = 'rgba(50, 200, 160, 0.06)';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke();
}

// --- Orbit lines ---
function drawMMOrbits(ctx, W) {
  const o = worldToMM(0, 0);
  const s = (W / 2 - 15) / MINIMAP_MAX_DIST * minimapZoom;

  ctx.lineWidth = 0.5;
  planetMeshes.forEach(p => {
    const r = p.data.distance * s;
    if (r < 2 || r > W * 3) return;
    ctx.strokeStyle = 'rgba(60, 100, 160, 0.1)';
    ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.stroke();
  });

  if (showDwarfPlanets) {
    ctx.setLineDash([2, 4]);
    dwarfPlanetMeshes.forEach(p => {
      const r = p.data.distance * s;
      if (r < 2 || r > W * 3) return;
      ctx.strokeStyle = 'rgba(200, 180, 150, 0.06)';
      ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.setLineDash([]);
  }
}

// --- AU distance reference rings ---
function drawMMRings(ctx, W) {
  const o = worldToMM(0, 0);
  const s = (W / 2 - 15) / MINIMAP_MAX_DIST * minimapZoom;

  // Reference rings at key orbital distances with AU labels
  const rings = [
    { d: 15, l: '1 AU' },   // Earth orbit
    { d: 30, l: '~5 AU' },  // Jupiter region
    { d: 65, l: '~30 AU' }, // Neptune region
  ];

  ctx.font = '7px "Courier New",monospace';
  ctx.textAlign = 'left';

  rings.forEach(ring => {
    const r = ring.d * s;
    if (r < 8 || r > W * 2) return;
    ctx.strokeStyle = 'rgba(50, 200, 160, 0.08)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Label at ~45° angle
    if (r > 18 && r < W) {
      ctx.fillStyle = 'rgba(50, 200, 160, 0.22)';
      const lx = o.x + r * 0.71 + 3;
      const ly = o.y - r * 0.71 - 2;
      if (lx > 5 && lx < W - 30 && ly > 5 && ly < W - 5) ctx.fillText(ring.l, lx, ly);
    }
  });
}

// --- Animated radar sweep ---
function drawMMSweep(ctx, W, elapsed) {
  const angle = elapsed * 0.35;
  const o = worldToMM(0, 0);
  const maxR = W * 1.5;

  // Fading trail sector
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    ctx.fillStyle = `rgba(50, 220, 160, ${0.035 * (1 - t * t)})`;
    ctx.beginPath(); ctx.moveTo(o.x, o.y);
    ctx.arc(o.x, o.y, maxR, angle - Math.PI * 0.25 * (i + 1) / 12, angle - Math.PI * 0.25 * i / 12);
    ctx.closePath(); ctx.fill();
  }

  // Leading sweep line
  ctx.strokeStyle = 'rgba(50, 220, 160, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(o.x, o.y);
  ctx.lineTo(o.x + Math.cos(angle) * maxR, o.y + Math.sin(angle) * maxR);
  ctx.stroke();
}

// --- Comet positions & motion trails ---
function drawMMComets(ctx, W) {
  comets.forEach(c => {
    const pos = worldToMM(c.group.position.x, c.group.position.z);
    if (pos.x < -15 || pos.x > W + 15 || pos.y < -15 || pos.y > W + 15) return;

    // Velocity trail (opposite to travel direction)
    const tLen = 10;
    const dx = -Math.cos(c.angle) * tLen;
    const dy = -Math.sin(c.angle) * tLen;
    const tg = ctx.createLinearGradient(pos.x, pos.y, pos.x + dx, pos.y + dy);
    tg.addColorStop(0, 'rgba(136, 221, 255, 0.5)'); tg.addColorStop(1, 'rgba(136, 221, 255, 0)');
    ctx.strokeStyle = tg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(pos.x + dx, pos.y + dy); ctx.stroke();

    // Glow + dot
    ctx.fillStyle = 'rgba(136, 221, 255, 0.12)';
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#88ddff';
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2); ctx.fill();
  });
}

// --- Celestial bodies (Sun, planets, dwarf planets) ---
function drawMMBodies(ctx, W, elapsed) {
  // Sun
  const sp = worldToMM(0, 0);
  if (sp.x > -15 && sp.x < W + 15 && sp.y > -15 && sp.y < W + 15) {
    const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 14);
    sg.addColorStop(0, 'rgba(255, 200, 50, 0.35)'); sg.addColorStop(0.4, 'rgba(255, 150, 30, 0.1)'); sg.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.arc(sp.x, sp.y, mmSz('Sun'), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffaa'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2); ctx.fill();

    // Pulsing ring if selected
    if (selectedPlanet && selectedPlanet.name === 'Sun') {
      const p = 1 + 0.3 * Math.sin(elapsed * 3);
      ctx.strokeStyle = `rgba(255, 200, 50, ${0.5 * p})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, mmSz('Sun') + 4 + p * 2, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Shared draw function for planets & dwarf planets
  const drawBody = (p, isDwarf) => {
    const pos = worldToMM(p.group.position.x, p.group.position.z);
    if (pos.x < -15 || pos.x > W + 15 || pos.y < -15 || pos.y > W + 15) return;
    const col = mmCol(p.data.name), sz = mmSz(p.data.name);

    // Glow
    ctx.fillStyle = hexRGBA(col, isDwarf ? 0.1 : 0.14);
    ctx.beginPath(); ctx.arc(pos.x, pos.y, sz + 4, 0, Math.PI * 2); ctx.fill();
    // Dot
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, sz, 0, Math.PI * 2); ctx.fill();

    // Selection ring (pulsing)
    if (selectedPlanet && selectedPlanet.name === p.data.name) {
      const pulse = 1 + 0.3 * Math.sin(elapsed * 3);
      ctx.strokeStyle = hexRGBA(col, 0.55 * pulse); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, sz + 4 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
    }
  };

  planetMeshes.forEach(p => drawBody(p, false));
  if (showDwarfPlanets) dwarfPlanetMeshes.forEach(p => drawBody(p, true));
}

// --- Camera position & frustum cone ---
function drawMMCamera(ctx, W) {
  const cp = worldToMM(camera.position.x, camera.position.z);
  const tp = worldToMM(controls.target.x, controls.target.z);
  const dx = tp.x - cp.x, dy = tp.y - cp.y;
  const angle = Math.atan2(dy, dx);
  const dist = Math.min(Math.hypot(dx, dy), 55);
  const fov = camera.fov * 0.5 * Math.PI / 180 * Math.min(camera.aspect, 1.5);

  // Frustum fill
  ctx.fillStyle = 'rgba(100, 200, 255, 0.03)';
  ctx.beginPath(); ctx.moveTo(cp.x, cp.y);
  ctx.arc(cp.x, cp.y, dist, angle - fov, angle + fov);
  ctx.closePath(); ctx.fill();

  // Frustum edge lines
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.12)'; ctx.lineWidth = 0.7;
  [angle - fov, angle + fov].forEach(a => {
    ctx.beginPath(); ctx.moveTo(cp.x, cp.y);
    ctx.lineTo(cp.x + Math.cos(a) * dist, cp.y + Math.sin(a) * dist); ctx.stroke();
  });

  // View direction (dashed line to target)
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)'; ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 3]);
  ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(tp.x, tp.y); ctx.stroke();
  ctx.setLineDash([]);

  // Target crosshair
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(tp.x - 4, tp.y); ctx.lineTo(tp.x + 4, tp.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tp.x, tp.y - 4); ctx.lineTo(tp.x, tp.y + 4); ctx.stroke();

  // Camera dot glow
  ctx.fillStyle = 'rgba(100, 200, 255, 0.18)';
  ctx.beginPath(); ctx.arc(cp.x, cp.y, 6, 0, Math.PI * 2); ctx.fill();
  // Camera dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cp.x, cp.y, 2.5, 0, Math.PI * 2); ctx.fill();
}

// --- Sci-fi corner brackets ---
function drawMMCorners(ctx, W, H) {
  const len = 14, g = 3;
  ctx.strokeStyle = 'rgba(50, 200, 160, 0.2)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(g, g + len); ctx.lineTo(g, g); ctx.lineTo(g + len, g); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - g - len, g); ctx.lineTo(W - g, g); ctx.lineTo(W - g, g + len); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(g, H - g - len); ctx.lineTo(g, H - g); ctx.lineTo(g + len, H - g); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - g - len, H - g); ctx.lineTo(W - g, H - g); ctx.lineTo(W - g, H - g - len); ctx.stroke();
}

// --- Hover tooltip label ---
function drawMMLabel(ctx, W) {
  let pos;
  if (minimapHoveredBody.type === 'sun') pos = worldToMM(0, 0);
  else if (minimapHoveredBody.entry) pos = worldToMM(minimapHoveredBody.entry.group.position.x, minimapHoveredBody.entry.group.position.z);
  else return;

  const name = minimapHoveredBody.name;
  const col = mmCol(name);
  ctx.font = 'bold 9px "Courier New",monospace';
  const tw = ctx.measureText(name).width;
  let px = pos.x + 10, py = pos.y - 6;
  // Keep tooltip inside canvas
  if (px + tw + 10 > W) px = pos.x - tw - 18;
  if (py < 14) py = pos.y + 14;

  // Background box
  ctx.fillStyle = 'rgba(5, 12, 28, 0.88)';
  ctx.fillRect(px - 4, py - 10, tw + 8, 14);
  ctx.strokeStyle = hexRGBA(col, 0.35); ctx.lineWidth = 0.5;
  ctx.strokeRect(px - 4, py - 10, tw + 8, 14);

  // Text
  ctx.fillStyle = col;
  ctx.fillText(name, px, py);

  // Hover ring on the body
  const sz = mmSz(name);
  ctx.strokeStyle = hexRGBA(col, 0.5); ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.arc(pos.x, pos.y, sz + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
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

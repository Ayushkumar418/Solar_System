import * as THREE from 'three';

export function createStarfield(count = 8000) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkleOffsets = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = 400 + Math.random() * 600;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    const colorChoice = Math.random();
    if (colorChoice < 0.6) {
      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
    } else if (colorChoice < 0.75) {
      colors[i3] = 0.85;
      colors[i3 + 1] = 0.92;
      colors[i3 + 2] = 1;
    } else if (colorChoice < 0.9) {
      colors[i3] = 1;
      colors[i3 + 1] = 0.97;
      colors[i3 + 2] = 0.85;
    } else {
      colors[i3] = 1;
      colors[i3 + 1] = 0.85;
      colors[i3 + 2] = 0.75;
    }

    sizes[i] = 0.3 + Math.random() * 1.8;
    twinkleOffsets[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('twinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      baseSize: { value: 1.2 }
    },
    vertexShader: `
      attribute float size;
      attribute float twinkleOffset;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float time;
      uniform float baseSize;
      
      void main() {
        vColor = color;
        vTwinkle = twinkleOffset;
        
        float twinkle = 0.7 + 0.3 * sin(time * 2.0 + twinkleOffset * 6.28);
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * baseSize * twinkle * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha *= alpha;
        
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.userData.updateTime = (time) => {
    material.uniforms.time.value = time;
  };

  return points;
}

export function createMilkyWay(count = 25000) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = 450 + Math.random() * 400; // slightly inside/outside the starfield
    const theta = Math.random() * Math.PI * 2;
    
    // Gaussian-like distribution around the equator (phi = PI/2)
    let rand = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; 
    const phi = (Math.PI / 2) + rand * 0.35; 

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    // Deep blues, purples, faint whites to simulate nebula gas/dense stars
    const colorChoice = Math.random();
    if (colorChoice < 0.4) {
      colors[i3] = 0.5; colors[i3 + 1] = 0.7; colors[i3 + 2] = 1.0;
    } else if (colorChoice < 0.7) {
      colors[i3] = 0.8; colors[i3 + 1] = 0.5; colors[i3 + 2] = 0.9;
    } else {
      colors[i3] = 0.9; colors[i3 + 1] = 0.9; colors[i3 + 2] = 0.8;
    }

    sizes[i] = 1.5 + Math.random() * 4.0; // Nebulous blobs
    
    const intensity = 1.0 - Math.abs(rand); 
    alphas[i] = 0.02 + intensity * 0.12; 
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float a = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(vColor, vAlpha * a * a);
      }
    `,
    transparent: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  
  // Tilt the Milky Way 
  points.rotation.x = Math.PI / 3; 
  points.rotation.y = Math.PI / 4; 

  return points;
}

export function createSunGlow() {
  const geometry = new THREE.SphereGeometry(3.5, 32, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      glowColor: { value: new THREE.Color(0xffaa33) },
      viewVector: { value: new THREE.Vector3(0, 0, 1) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      uniform vec3 viewVector;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vPositionNormal), 3.0);
        float pulse = 1.0 + 0.15 * sin(time * 1.5);
        gl_FragColor = vec4(glowColor, intensity * pulse * 0.6);
      }
    `,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.updateTime = (time) => {
    material.uniforms.time.value = time;
  };

  return mesh;
}

function createNoiseTexture(width, height, scale, octaves) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      let amplitude = 1;
      let frequency = scale;
      let maxValue = 0;

      for (let i = 0; i < octaves; i++) {
        const sampleX = x * frequency;
        const sampleY = y * frequency;
        const noise = pseudoRandom(sampleX, sampleY);
        value += noise * amplitude;
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      value /= maxValue;
      const idx = (y * width + x) * 4;
      data[idx] = value * 255;
      data[idx + 1] = value * 255;
      data[idx + 2] = value * 255;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function pseudoRandom(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function createCanvasTexture(width, height, drawFunc) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFunc(ctx, width, height);
  return new THREE.CanvasTexture(canvas);
}

export function createEarthTexture() {
  return createCanvasTexture(1024, 512, (ctx, w, h) => {
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, h);
    oceanGradient.addColorStop(0, '#1a4a7a');
    oceanGradient.addColorStop(0.3, '#2a6aa0');
    oceanGradient.addColorStop(0.5, '#1a5a90');
    oceanGradient.addColorStop(0.7, '#2a6aa0');
    oceanGradient.addColorStop(1, '#1a4a7a');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, w, h);

    const landColor = '#2d5a1e';
    const landDark = '#1a3a10';
    const landLight = '#3a7a2a';

    function drawContinent(x, y, width, height, irregularity) {
      ctx.fillStyle = landColor;
      ctx.beginPath();
      const points = [];
      const numPoints = 20;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radius = (width / 2) + (Math.random() - 0.5) * irregularity;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * (height / 2) + (Math.random() - 0.5) * irregularity;
        points.push({ x: px, y: py });
      }
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i + 1 < points.length ? i + 1 : 0].x) / 2;
        const yc = (points[i].y + points[i + 1 < points.length ? i + 1 : 0].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = landDark;
      for (let i = 0; i < 5; i++) {
        const patchX = x + (Math.random() - 0.5) * width * 0.6;
        const patchY = y + (Math.random() - 0.5) * height * 0.6;
        ctx.beginPath();
        ctx.arc(patchX, patchY, 5 + Math.random() * 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = landLight;
      for (let i = 0; i < 3; i++) {
        const patchX = x + (Math.random() - 0.5) * width * 0.5;
        const patchY = y + (Math.random() - 0.5) * height * 0.5;
        ctx.beginPath();
        ctx.arc(patchX, patchY, 3 + Math.random() * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawContinent(w * 0.15, h * 0.3, w * 0.15, h * 0.25, 30);
    drawContinent(w * 0.4, h * 0.25, w * 0.12, h * 0.2, 25);
    drawContinent(w * 0.65, h * 0.35, w * 0.2, h * 0.3, 35);
    drawContinent(w * 0.85, h * 0.55, w * 0.1, h * 0.15, 20);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 15; i++) {
      const cloudX = Math.random() * w;
      const cloudY = Math.random() * h;
      const cloudWidth = 30 + Math.random() * 80;
      const cloudHeight = 10 + Math.random() * 20;
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, cloudWidth, cloudHeight, Math.random() * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const poleHeight = h * 0.08;
    ctx.fillRect(0, 0, w, poleHeight);
    ctx.fillRect(0, h - poleHeight, w, poleHeight);
  });
}

export function createEarthCloudTexture() {
  return createCanvasTexture(1024, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * w;
      const y = h * 0.2 + Math.random() * h * 0.6;
      const width = 20 + Math.random() * 60;
      const height = 5 + Math.random() * 15;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, Math.random() * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const y = h * 0.3 + Math.random() * h * 0.4;
      const width = 40 + Math.random() * 100;
      const height = 8 + Math.random() * 20;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, Math.random() * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function createMarsTexture() {
  return createCanvasTexture(1024, 512, (ctx, w, h) => {
    const baseGradient = ctx.createLinearGradient(0, 0, 0, h);
    baseGradient.addColorStop(0, '#8b4513');
    baseGradient.addColorStop(0.3, '#a0522d');
    baseGradient.addColorStop(0.5, '#cd5c5c');
    baseGradient.addColorStop(0.7, '#a0522d');
    baseGradient.addColorStop(1, '#8b4513');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#6b3a1f';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 10 + Math.random() * 30;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#d2691e';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 5 + Math.random() * 15;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffe4c4';
    const poleHeight = h * 0.06;
    ctx.fillRect(0, 0, w, poleHeight);
    ctx.fillRect(0, h - poleHeight, w, poleHeight);
  });
}

export function createJupiterTexture() {
  return createCanvasTexture(1024, 512, (ctx, w, h) => {
    const colors = [
      '#d4a574', '#c49464', '#b48454', '#a47444',
      '#e4b584', '#d4a574', '#c49464', '#b48454',
      '#d4a574', '#c49464'
    ];

    const bandHeight = h / colors.length;
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * bandHeight, w, bandHeight + 1);
    });

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x += 3) {
        const noise = pseudoRandom(x * 0.01, y * 0.02);
        if (noise > 0.7) {
          ctx.fillStyle = `rgba(180, 130, 80, ${noise * 0.3})`;
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }

    ctx.fillStyle = '#c94a3a';
    ctx.beginPath();
    ctx.ellipse(w * 0.65, h * 0.35, 25, 15, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b83a2a';
    ctx.beginPath();
    ctx.ellipse(w * 0.65, h * 0.35, 20, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function createSaturnTexture() {
  return createCanvasTexture(1024, 512, (ctx, w, h) => {
    const colors = [
      '#f5deb3', '#e8d0a0', '#dbc090', '#d0b080',
      '#f0d8a8', '#e5c898', '#dab888', '#d0a878',
      '#f5deb3', '#e8d0a0'
    ];

    const bandHeight = h / colors.length;
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, i * bandHeight, w, bandHeight + 1);
    });

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x += 2) {
        const noise = pseudoRandom(x * 0.015, y * 0.025);
        if (noise > 0.6) {
          ctx.fillStyle = `rgba(200, 180, 140, ${noise * 0.25})`;
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }
  });
}

export function createSaturnRingTexture() {
  return createCanvasTexture(1024, 64, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(210, 180, 140, 0.1)');
    gradient.addColorStop(0.1, 'rgba(210, 180, 140, 0.8)');
    gradient.addColorStop(0.2, 'rgba(180, 150, 110, 0.6)');
    gradient.addColorStop(0.3, 'rgba(210, 180, 140, 0.9)');
    gradient.addColorStop(0.4, 'rgba(160, 130, 90, 0.5)');
    gradient.addColorStop(0.5, 'rgba(210, 180, 140, 0.7)');
    gradient.addColorStop(0.6, 'rgba(190, 160, 120, 0.8)');
    gradient.addColorStop(0.7, 'rgba(210, 180, 140, 0.6)');
    gradient.addColorStop(0.8, 'rgba(170, 140, 100, 0.4)');
    gradient.addColorStop(0.9, 'rgba(210, 180, 140, 0.7)');
    gradient.addColorStop(1, 'rgba(210, 180, 140, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let x = 0; x < w; x++) {
      const noise = pseudoRandom(x * 0.1, 0);
      if (noise > 0.7) {
        ctx.fillStyle = `rgba(150, 120, 80, 0.5)`;
        ctx.fillRect(x, 0, 1, h);
      }
    }
  });
}

export function createUranusRingTexture() {
  return createCanvasTexture(512, 32, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(100, 150, 170, 0.05)');
    gradient.addColorStop(0.15, 'rgba(100, 150, 170, 0.5)');
    gradient.addColorStop(0.3, 'rgba(80, 130, 150, 0.3)');
    gradient.addColorStop(0.5, 'rgba(100, 150, 170, 0.6)');
    gradient.addColorStop(0.7, 'rgba(90, 140, 160, 0.4)');
    gradient.addColorStop(0.85, 'rgba(100, 150, 170, 0.5)');
    gradient.addColorStop(1, 'rgba(100, 150, 170, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let x = 0; x < w; x++) {
      const noise = pseudoRandom(x * 0.15, 1);
      if (noise > 0.6) {
        ctx.fillStyle = `rgba(70, 120, 140, 0.4)`;
        ctx.fillRect(x, 0, 1, h);
      }
    }
  });
}

export function createUranusTexture() {
  return createCanvasTexture(512, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#5f9ea0');
    gradient.addColorStop(0.3, '#7ec8c8');
    gradient.addColorStop(0.5, '#8fd8d8');
    gradient.addColorStop(0.7, '#7ec8c8');
    gradient.addColorStop(1, '#5f9ea0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x += 2) {
        const noise = pseudoRandom(x * 0.02, y * 0.03);
        if (noise > 0.6) {
          ctx.fillStyle = `rgba(100, 180, 180, ${noise * 0.2})`;
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }
  });
}

export function createNeptuneTexture() {
  return createCanvasTexture(512, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a3a6a');
    gradient.addColorStop(0.3, '#2a4a8a');
    gradient.addColorStop(0.5, '#3a5aaa');
    gradient.addColorStop(0.7, '#2a4a8a');
    gradient.addColorStop(1, '#1a3a6a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x += 2) {
        const noise = pseudoRandom(x * 0.015, y * 0.025);
        if (noise > 0.65) {
          ctx.fillStyle = `rgba(60, 90, 160, ${noise * 0.3})`;
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }

    ctx.fillStyle = 'rgba(80, 120, 200, 0.4)';
    ctx.beginPath();
    ctx.ellipse(w * 0.4, h * 0.4, 30, 15, 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function createMercuryTexture() {
  return createCanvasTexture(512, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#8c8c8c');
    gradient.addColorStop(0.3, '#a0a0a0');
    gradient.addColorStop(0.5, '#b0b0b0');
    gradient.addColorStop(0.7, '#a0a0a0');
    gradient.addColorStop(1, '#8c8c8c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#707070';
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 3 + Math.random() * 12;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#909090';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 2 + Math.random() * 6;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function createVenusTexture() {
  return createCanvasTexture(512, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#e8cda0');
    gradient.addColorStop(0.3, '#f0d8b0');
    gradient.addColorStop(0.5, '#f5e0c0');
    gradient.addColorStop(0.7, '#f0d8b0');
    gradient.addColorStop(1, '#e8cda0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x += 2) {
        const noise = pseudoRandom(x * 0.01, y * 0.015);
        if (noise > 0.55) {
          ctx.fillStyle = `rgba(200, 180, 140, ${noise * 0.3})`;
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }

    ctx.strokeStyle = 'rgba(180, 160, 120, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      const startY = Math.random() * h;
      ctx.moveTo(0, startY);
      for (let x = 0; x < w; x += 20) {
        ctx.lineTo(x, startY + Math.sin(x * 0.02) * 10);
      }
      ctx.stroke();
    }
  });
}

export function createComet(scene, position, velocity, color) {
  const cometGroup = new THREE.Group();

  const coreGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: color || 0xffffff,
    transparent: true,
    opacity: 0.9
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  cometGroup.add(core);

  const comaGeometry = new THREE.SphereGeometry(0.6, 16, 16);
  const comaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color || 0x88ccff) },
      viewVector: { value: new THREE.Vector3(0, 0, 1) }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, intensity * 0.6);
      }
    `,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
  const coma = new THREE.Mesh(comaGeometry, comaMaterial);
  cometGroup.add(coma);

  const tailLength = 8;
  const tailSegments = 30;
  const tailGeometry = new THREE.BufferGeometry();
  const tailPositions = new Float32Array(tailSegments * 3);
  const tailSizes = new Float32Array(tailSegments);
  const tailAlphas = new Float32Array(tailSegments);

  for (let i = 0; i < tailSegments; i++) {
    const t = i / tailSegments;
    tailPositions[i * 3] = 0;
    tailPositions[i * 3 + 1] = 0;
    tailPositions[i * 3 + 2] = t * tailLength;
    tailSizes[i] = (1 - t) * 0.5;
    tailAlphas[i] = (1 - t) * 0.8;
  }

  tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
  tailGeometry.setAttribute('size', new THREE.BufferAttribute(tailSizes, 1));
  tailGeometry.setAttribute('alpha', new THREE.BufferAttribute(tailAlphas, 1));

  const tailMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color || 0x88ccff) }
    },
    vertexShader: `
      attribute float size;
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying float vAlpha;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = (1.0 - dist * 2.0) * vAlpha;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const tail = new THREE.Points(tailGeometry, tailMaterial);
  cometGroup.add(tail);

  cometGroup.position.copy(position);

  scene.add(cometGroup);

  return {
    group: cometGroup,
    core: core,
    coma: coma,
    tail: tail,
    tailPositions: tailPositions,
    tailSegments: tailSegments,
    tailLength: tailLength,
    velocity: velocity || new THREE.Vector3(0, 0, -0.1),
    sunDistance: position.length()
  };
}

export function createPlutoTexture() {
  return createCanvasTexture(512, 256, (ctx, w, h) => {
    // Base tan/brown surface
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#a89880');
    gradient.addColorStop(0.3, '#c8b496');
    gradient.addColorStop(0.5, '#b8a488');
    gradient.addColorStop(0.7, '#c8b496');
    gradient.addColorStop(1, '#a89880');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Dark reddish patches
    ctx.fillStyle = '#8a6050';
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 10 + Math.random() * 25;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heart-shaped feature (Sputnik Planitia) — simplified as bright oval
    ctx.fillStyle = '#e8dcc8';
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.45, 35, 25, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f0e4d4';
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.45, 25, 18, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Polar caps
    ctx.fillStyle = 'rgba(230, 220, 200, 0.5)';
    ctx.fillRect(0, 0, w, h * 0.06);
    ctx.fillRect(0, h - h * 0.06, w, h * 0.06);
  });
}

export function createCeresTexture() {
  return createCanvasTexture(512, 256, (ctx, w, h) => {
    // Gray/brown base
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#7a7a70');
    gradient.addColorStop(0.3, '#8a8a80');
    gradient.addColorStop(0.5, '#9a9a8a');
    gradient.addColorStop(0.7, '#8a8a80');
    gradient.addColorStop(1, '#7a7a70');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Craters
    ctx.fillStyle = '#686860';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 2 + Math.random() * 8;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bright spots (Occator crater salt deposits)
    ctx.fillStyle = '#e8e8e0';
    ctx.beginPath();
    ctx.arc(w * 0.4, h * 0.35, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * 0.42, h * 0.37, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Additional surface variation
    for (let y2 = 0; y2 < h; y2++) {
      for (let x2 = 0; x2 < w; x2 += 3) {
        const noise = pseudoRandom(x2 * 0.02, y2 * 0.03);
        if (noise > 0.7) {
          ctx.fillStyle = `rgba(120, 120, 110, ${noise * 0.25})`;
          ctx.fillRect(x2, y2, 2, 1);
        }
      }
    }
  });
}

export function createErisTexture() {
  return createCanvasTexture(512, 256, (ctx, w, h) => {
    // Very bright, icy white/gray surface
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#d8d8d0');
    gradient.addColorStop(0.3, '#e8e8e0');
    gradient.addColorStop(0.5, '#f0f0e8');
    gradient.addColorStop(0.7, '#e8e8e0');
    gradient.addColorStop(1, '#d8d8d0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Subtle surface features
    ctx.fillStyle = '#c8c8c0';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 5 + Math.random() * 15;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Methane ice reflections
    ctx.fillStyle = 'rgba(240, 240, 235, 0.5)';
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const width = 15 + Math.random() * 30;
      const height = 8 + Math.random() * 15;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, Math.random() * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

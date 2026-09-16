export const bodyViewerHtml = `<!DOCTYPE html>
<!--
  body_viewer.html — Premium Procedural 3D Body Viewer
-->
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      overflow: hidden;
      height: 100%;
      background: radial-gradient(ellipse at 50% 20%, #1a1a3e 0%, #0d0d1f 50%, #050510 100%);
      font-family: -apple-system, 'SF Pro Display', 'Segoe UI', sans-serif;
    }
    canvas { display: block; touch-action: none; }
    #loading-overlay {
      position: fixed; inset: 0; z-index: 100;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: radial-gradient(ellipse at 50% 20%, #1a1a3e 0%, #0d0d1f 50%, #050510 100%);
      transition: opacity 0.8s ease, visibility 0.8s ease;
    }
    #loading-overlay.hidden { opacity: 0; visibility: hidden; pointer-events: none; }
    .loader-ring {
      width: 48px; height: 48px;
      border: 3px solid rgba(108, 99, 255, 0.15);
      border-top-color: #6C63FF;
      border-radius: 50%;
      animation: spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    .loader-text {
      margin-top: 16px;
      color: rgba(255,255,255,0.5);
      font-size: 13px; font-weight: 500;
      letter-spacing: 1.5px; text-transform: uppercase;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #bottom-fade {
      position: fixed; bottom: 0; left: 0; right: 0; height: 100px;
      background: linear-gradient(to top, rgba(5,5,16,0.9) 0%, transparent 100%);
      pointer-events: none; z-index: 10;
    }
    #hud {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      z-index: 20; display: flex; gap: 12px;
      opacity: 0; transition: opacity 0.6s ease 0.4s;
    }
    #hud.visible { opacity: 1; }
    .hud-pill {
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px; padding: 8px 16px;
      display: flex; align-items: center; gap: 8px;
      color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 500;
    }
    .hud-dot { width: 8px; height: 8px; border-radius: 50%; }
    .hud-dot.weight { background: #FF6B6B; box-shadow: 0 0 8px rgba(255,107,107,0.5); }
    .hud-dot.muscle { background: #6C63FF; box-shadow: 0 0 8px rgba(108,99,255,0.5); }
    .hud-value { color: rgba(255,255,255,0.95); font-weight: 600; }
  </style>
</head>
<body>
  <div id="loading-overlay">
    <div class="loader-ring"></div>
    <div class="loader-text">Initializing</div>
  </div>
  <div id="bottom-fade"></div>
  <div id="hud">
    <div class="hud-pill">
      <div class="hud-dot weight"></div>
      <span>Weight</span>
      <span class="hud-value" id="hud-weight">30%</span>
    </div>
    <div class="hud-pill">
      <div class="hud-dot muscle"></div>
      <span>Muscle</span>
      <span class="hud-value" id="hud-muscle">30%</span>
    </div>
  </div>

  <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>

  <script>
  (function() {
    'use strict';

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1e, 0.12);

    var camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.05, 4.2);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x050510, 1);
    document.body.appendChild(renderer.domElement);

    // Lighting
    var keyLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    keyLight.position.set(3, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -1;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);

    var fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    var rimLight = new THREE.DirectionalLight(0xcc88ff, 0.45);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);

    var bottomLight = new THREE.DirectionalLight(0x6C63FF, 0.15);
    bottomLight.position.set(0, -2, 1);
    scene.add(bottomLight);

    var hemiLight = new THREE.HemisphereLight(0x8888cc, 0x222244, 0.35);
    scene.add(hemiLight);

    // Ground
    var groundGeom = new THREE.CircleGeometry(3, 64);
    var groundMat = new THREE.MeshStandardMaterial({
      color: 0x111128, roughness: 0.85, metalness: 0.1, transparent: true, opacity: 0.6,
    });
    var ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    var ringGeom = new THREE.RingGeometry(0.9, 1.1, 64);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0x6C63FF, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
    });
    var ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);

    // Particles
    var PARTICLE_COUNT = 120;
    var particleGeom = new THREE.BufferGeometry();
    var pPositions = new Float32Array(PARTICLE_COUNT * 3);
    var pSizes = new Float32Array(PARTICLE_COUNT);
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      pPositions[i * 3]     = (Math.random() - 0.5) * 6;
      pPositions[i * 3 + 1] = Math.random() * 4;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      pSizes[i] = Math.random() * 3 + 1;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particleGeom.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

    var particleMat = new THREE.PointsMaterial({
      color: 0x6C63FF, size: 0.02, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    var particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // Orbit controls
    var isDragging = false;
    var prevX = 0;
    var rotationY = 0;
    var rotationVelocity = 0;
    var bodyGroup = new THREE.Group();
    scene.add(bodyGroup);

    renderer.domElement.addEventListener('pointerdown', function(e) {
      isDragging = true; prevX = e.clientX; rotationVelocity = 0;
    });
    renderer.domElement.addEventListener('pointermove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - prevX;
      rotationVelocity = dx * 0.007;
      rotationY += rotationVelocity;
      prevX = e.clientX;
    });
    renderer.domElement.addEventListener('pointerup', function() { isDragging = false; });
    renderer.domElement.addEventListener('pointercancel', function() { isDragging = false; });

    // Materials
    var skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.82, 0.68, 0.58), roughness: 0.48, metalness: 0.02,
    });
    var darkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.15, 0.15, 0.2), roughness: 0.65, metalness: 0.08,
    });
    var eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3, metalness: 0.0 });
    var eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.2, metalness: 0.1 });

    // Helpers
    function makeCapsule(rTop, rBot, h, rSeg, hSeg, mat) {
      var g = new THREE.CylinderGeometry(rTop, rBot, h, rSeg, hSeg, false);
      var m = new THREE.Mesh(g, mat);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    }
    function makeSphere(r, wS, hS, mat) {
      var g = new THREE.SphereGeometry(r, wS, hS);
      var m = new THREE.Mesh(g, mat);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    }
    function makeBox(w, h, d, mat) {
      var g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
      var m = new THREE.Mesh(g, mat);
      m.castShadow = true;
      return m;
    }

    // Base dimensions
    var B = {
      headR: 0.15,
      neckR: 0.058, neckH: 0.07,
      torsoW: 0.22, torsoH: 0.48, torsoD: 0.14,
      shoulderR: 0.068,
      upperArmR: 0.044, upperArmH: 0.28,
      lowerArmR: 0.036, lowerArmH: 0.26,
      handR: 0.032,
      hipW: 0.19,
      upperLegR: 0.063, upperLegH: 0.38,
      lowerLegR: 0.046, lowerLegH: 0.36,
      footH: 0.04, footL: 0.14, footW: 0.068,
    };

    // Create body parts
    var head = makeSphere(B.headR, 28, 22, skinMat);
    var neck = makeCapsule(B.neckR, B.neckR, B.neckH, 14, 1, skinMat);
    var torsoGeom = new THREE.SphereGeometry(1, 28, 22);
    var torso = new THREE.Mesh(torsoGeom, skinMat);
    torso.castShadow = true; torso.receiveShadow = true;
    var chestGeom = new THREE.SphereGeometry(1, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    var chest = new THREE.Mesh(chestGeom, skinMat);
    chest.castShadow = true;

    var shoulderL = makeSphere(B.shoulderR, 16, 12, skinMat);
    var shoulderR_m = makeSphere(B.shoulderR, 16, 12, skinMat);
    var upperArmL = makeCapsule(B.upperArmR, B.upperArmR * 0.88, B.upperArmH, 12, 2, skinMat);
    var upperArmR_m = makeCapsule(B.upperArmR, B.upperArmR * 0.88, B.upperArmH, 12, 2, skinMat);
    var lowerArmL = makeCapsule(B.lowerArmR, B.lowerArmR * 0.82, B.lowerArmH, 12, 2, skinMat);
    var lowerArmR_m = makeCapsule(B.lowerArmR, B.lowerArmR * 0.82, B.lowerArmH, 12, 2, skinMat);
    var handL = makeSphere(B.handR, 10, 8, skinMat);
    var handR_m = makeSphere(B.handR, 10, 8, skinMat);

    var hipsGeom = new THREE.SphereGeometry(1, 22, 16);
    var hips = new THREE.Mesh(hipsGeom, skinMat);
    hips.castShadow = true; hips.receiveShadow = true;

    var upperLegL = makeCapsule(B.upperLegR, B.upperLegR * 0.82, B.upperLegH, 14, 2, darkMat);
    var upperLegR_m = makeCapsule(B.upperLegR, B.upperLegR * 0.82, B.upperLegH, 14, 2, darkMat);
    var lowerLegL = makeCapsule(B.lowerLegR, B.lowerLegR * 0.78, B.lowerLegH, 12, 2, skinMat);
    var lowerLegR_m = makeCapsule(B.lowerLegR, B.lowerLegR * 0.78, B.lowerLegH, 12, 2, skinMat);
    var footL = makeBox(B.footW, B.footH, B.footL, darkMat);
    var footR_m = makeBox(B.footW, B.footH, B.footL, darkMat);

    var eyeWhiteL = makeSphere(0.025, 10, 8, eyeWhiteMat);
    var eyeWhiteR = makeSphere(0.025, 10, 8, eyeWhiteMat);
    var eyePupilL = makeSphere(0.013, 8, 6, eyePupilMat);
    var eyePupilR = makeSphere(0.013, 8, 6, eyePupilMat);
    var nose = makeSphere(0.022, 8, 6, skinMat);
    var earL = makeSphere(0.028, 8, 6, skinMat);
    var earR_m = makeSphere(0.028, 8, 6, skinMat);

    bodyGroup.add(
      head, neck, torso, chest,
      shoulderL, shoulderR_m,
      upperArmL, upperArmR_m, lowerArmL, lowerArmR_m,
      handL, handR_m,
      hips, upperLegL, upperLegR_m, lowerLegL, lowerLegR_m,
      footL, footR_m,
      eyeWhiteL, eyeWhiteR, eyePupilL, eyePupilR,
      nose, earL, earR_m
    );

    // State
    var targetWeight = 0.3;
    var targetMuscle = 0.3;
    var currentWeight = 0.3;
    var currentMuscle = 0.3;

    function postToRN(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (typeof data.weight === 'number') targetWeight = clamp01(data.weight);
        if (typeof data.muscle === 'number') targetMuscle = clamp01(data.muscle);
      } catch (e) {
        postToRN({ type: 'error', message: 'Bad message: ' + String(e) });
      }
    }

    function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    // Update body
    function updateBody(w, m) {
      var fatScale = 1 + w * 0.45;
      var bellyScale = 1 + w * 0.6;

      var headY = 1.72 + w * 0.02;
      head.position.set(0, headY, 0);
      head.scale.setScalar(1 + w * 0.04);

      var eyeSpread = 0.048;
      var eyeH = headY + 0.018;
      var eyeZ = B.headR * 0.86;
      eyeWhiteL.position.set(-eyeSpread, eyeH, eyeZ);
      eyeWhiteR.position.set(eyeSpread, eyeH, eyeZ);
      eyePupilL.position.set(-eyeSpread, eyeH, eyeZ + 0.015);
      eyePupilR.position.set(eyeSpread, eyeH, eyeZ + 0.015);

      nose.position.set(0, headY - 0.02, B.headR * 0.92);
      nose.scale.set(0.8, 0.7, 0.9);
      earL.position.set(-(B.headR * 0.95), headY + 0.01, 0);
      earR_m.position.set(B.headR * 0.95, headY + 0.01, 0);
      earL.scale.set(0.35, 0.7, 0.5);
      earR_m.scale.set(0.35, 0.7, 0.5);

      neck.position.set(0, headY - B.headR - B.neckH * 0.35, 0);
      var nkS = 1 + w * 0.15 + m * 0.18;
      neck.scale.set(nkS, 1, nkS);

      var torsoY = 1.28;
      torso.position.set(0, torsoY, 0);
      var tw = B.torsoW * fatScale * (1 + m * 0.18);
      var th = B.torsoH;
      var td = B.torsoD * bellyScale * (1 + m * 0.1);
      torso.scale.set(tw, th, td);

      chest.position.set(0, torsoY + th * 0.15, td * 0.15);
      var chestS = m * 0.06;
      chest.scale.set(tw * (0.6 + m * 0.15), chestS + 0.01, td * 0.3);
      chest.visible = m > 0.2;

      var shW = B.torsoW * fatScale * (1 + m * 0.28);
      var shY = torsoY + th * 0.42;
      var sr = B.shoulderR * (1 + m * 0.55 + w * 0.15);
      shoulderL.position.set(-shW - sr * 0.25, shY, 0);
      shoulderR_m.position.set(shW + sr * 0.25, shY, 0);
      shoulderL.scale.setScalar(sr / B.shoulderR);
      shoulderR_m.scale.setScalar(sr / B.shoulderR);

      var armX = shW + sr * 0.5;
      var uaR = B.upperArmR * (1 + m * 0.6 + w * 0.2);
      var uaH = B.upperArmH;
      upperArmL.position.set(-armX, shY - uaH * 0.55, 0);
      upperArmR_m.position.set(armX, shY - uaH * 0.55, 0);
      var uaScale = uaR / B.upperArmR;
      upperArmL.scale.set(uaScale, 1, uaScale);
      upperArmR_m.scale.set(uaScale, 1, uaScale);
      upperArmL.rotation.z = 0.1;
      upperArmR_m.rotation.z = -0.1;

      var laR = B.lowerArmR * (1 + m * 0.38 + w * 0.12);
      var laY = shY - uaH - B.lowerArmH * 0.45;
      lowerArmL.position.set(-armX, laY, 0);
      lowerArmR_m.position.set(armX, laY, 0);
      var laScale = laR / B.lowerArmR;
      lowerArmL.scale.set(laScale, 1, laScale);
      lowerArmR_m.scale.set(laScale, 1, laScale);
      lowerArmL.rotation.z = 0.06;
      lowerArmR_m.rotation.z = -0.06;

      var handY = laY - B.lowerArmH * 0.5 - B.handR;
      var handScale = 1 + w * 0.08 + m * 0.1;
      handL.position.set(-armX, handY, 0);
      handR_m.position.set(armX, handY, 0);
      handL.scale.setScalar(handScale);
      handR_m.scale.setScalar(handScale);

      var hipY = torsoY - th * 0.44;
      var hipW = B.hipW * fatScale * (1 + m * 0.1);
      var hipD = B.torsoD * (1 + w * 0.35);
      hips.position.set(0, hipY, 0);
      hips.scale.set(hipW, B.torsoH * 0.22, hipD);

      var legX = hipW * 0.55;
      var ulR = B.upperLegR * (1 + m * 0.48 + w * 0.25);
      var ulH = B.upperLegH;
      upperLegL.position.set(-legX, hipY - ulH * 0.55, 0);
      upperLegR_m.position.set(legX, hipY - ulH * 0.55, 0);
      var ulScale = ulR / B.upperLegR;
      upperLegL.scale.set(ulScale, 1, ulScale);
      upperLegR_m.scale.set(ulScale, 1, ulScale);

      var llR = B.lowerLegR * (1 + m * 0.32 + w * 0.15);
      var llY = hipY - ulH - B.lowerLegH * 0.45;
      lowerLegL.position.set(-legX, llY, 0);
      lowerLegR_m.position.set(legX, llY, 0);
      var llScale = llR / B.lowerLegR;
      lowerLegL.scale.set(llScale, 1, llScale);
      lowerLegR_m.scale.set(llScale, 1, llScale);

      var feetY = llY - B.lowerLegH * 0.5 - B.footH * 0.5;
      footL.position.set(-legX, feetY, B.footL * 0.15);
      footR_m.position.set(legX, feetY, B.footL * 0.15);
      var fS = 1 + w * 0.15;
      footL.scale.set(fS, 1, fS);
      footR_m.scale.set(fS, 1, fS);

      document.getElementById('hud-weight').textContent = Math.round(w * 100) + '%';
      document.getElementById('hud-muscle').textContent = Math.round(m * 100) + '%';
    }

    // Initialize
    updateBody(currentWeight, currentMuscle);
    bodyGroup.position.set(0, -0.85, 0);

    setTimeout(function() {
      document.getElementById('loading-overlay').classList.add('hidden');
      document.getElementById('hud').classList.add('visible');
    }, 600);

    // Animation
    var clock = new THREE.Clock();
    var AUTO_ROTATE_SPEED = 0.0025;

    function animate() {
      requestAnimationFrame(animate);
      var dt = clock.getDelta();
      var elapsed = clock.getElapsedTime();

      var lerpSpeed = 0.06;
      currentWeight += (targetWeight - currentWeight) * lerpSpeed;
      currentMuscle += (targetMuscle - currentMuscle) * lerpSpeed;
      updateBody(currentWeight, currentMuscle);

      if (!isDragging) {
        rotationVelocity *= 0.94;
        rotationY += rotationVelocity + AUTO_ROTATE_SPEED;
      }
      bodyGroup.rotation.y = rotationY;

      // Breathing
      bodyGroup.position.y = -0.85 + Math.sin(elapsed * 1.5) * 0.005;

      // Particles
      var pPos = particleGeom.attributes.position.array;
      for (var j = 0; j < PARTICLE_COUNT; j++) {
        pPos[j * 3 + 1] += 0.002;
        if (pPos[j * 3 + 1] > 4) pPos[j * 3 + 1] = 0;
        pPos[j * 3] += Math.sin(elapsed + j) * 0.0003;
      }
      particleGeom.attributes.position.needsUpdate = true;
      particleMat.opacity = 0.25 + Math.sin(elapsed * 0.5) * 0.1;

      // Ring glow
      ringMat.opacity = 0.06 + Math.sin(elapsed * 2) * 0.03;

      // Camera bob
      camera.position.y = 1.05 + Math.sin(elapsed * 0.8) * 0.01;
      camera.lookAt(0, 1.0, 0);

      renderer.render(scene, camera);
    }
    animate();

    // Resize
    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    postToRN({ type: 'ready' });
    postToRN({ type: 'loaded', hasMesh: true });
  })();
  </script>
</body>
</html>`;

(function hyperspeedInit() {
  if (!window.THREE) {
    return;
  }

  const mount = document.getElementById("hyperspeed-canvas");
  if (!mount) {
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020204, 0.04);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.z = 6;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  const starCount = 1800;
  const radius = 26;
  const depth = 900;
  const positions = new Float32Array(starCount * 3);
  const velocities = new Float32Array(starCount);

  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const spread = Math.pow(Math.random(), 0.58) * radius;
    positions[i3] = Math.cos(angle) * spread;
    positions[i3 + 1] = Math.sin(angle) * spread;
    positions[i3 + 2] = -Math.random() * depth;
    velocities[i] = 0.6 + Math.random() * 1.6;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0xcfabff,
    size: 0.08,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, pointsMaterial);
  scene.add(points);

  const clock = new THREE.Clock();

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.06);
    const positionArray = geometry.attributes.position.array;

    for (let i = 0; i < starCount; i += 1) {
      const zIndex = i * 3 + 2;
      positionArray[zIndex] += velocities[i] * dt * 68;

      if (positionArray[zIndex] > 18) {
        positionArray[zIndex] = -depth;
      }
    }

    geometry.attributes.position.needsUpdate = true;

    points.rotation.z += dt * 0.03;
    camera.position.x = Math.sin(performance.now() * 0.00012) * 0.28;
    camera.position.y = Math.cos(performance.now() * 0.00016) * 0.24;
    camera.lookAt(0, 0, -120);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", handleResize);
  animate();
})();

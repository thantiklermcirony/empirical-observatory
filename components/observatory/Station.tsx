'use client';
/* oxlint-disable react/react-compiler -- These imperative engine/browser effects synchronize external state; this app does not enable React Compiler. */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const rooms = [
  { id: 'tao', x: -4, z: 0, color: 0x79e6d5 },
  { id: 'behaviour', x: 3, z: -4, color: 0xf5bd77 },
  { id: 'quantum', x: 4, z: 4, color: 0xb4a5fa },
];
export default function Station({
  selected,
  onSelect,
  reducedMotion,
}: {
  selected: string;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    latest = useRef({ selected, onSelect, reducedMotion });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    latest.current = { selected, onSelect, reducedMotion };
  }, [selected, onSelect, reducedMotion]);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x060c12, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute(
      'aria-label',
      'Orbital station. Select a laboratory using the buttons below.',
    );
    renderer.domElement.setAttribute('role', 'img');
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x071018, 0.016);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 140);
    camera.position.set(18, 20, 27);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 18;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI * 0.43;
    controls.minPolarAngle = 0.3;
    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xb6d4e9, 1.25));
    const key = new THREE.DirectionalLight(0xc8e5ff, 3);
    key.position.set(4, 10, 7);
    scene.add(key);
    const amber = new THREE.DirectionalLight(0xecac67, 0.8);
    amber.position.set(-8, 2, -4);
    scene.add(amber);
    const hull = new THREE.MeshStandardMaterial({
        color: 0x172b38,
        metalness: 0.65,
        roughness: 0.55,
      }),
      floor = new THREE.MeshStandardMaterial({
        color: 0x233947,
        metalness: 0.4,
        roughness: 0.8,
      }),
      dark = new THREE.MeshStandardMaterial({
        color: 0x0a151f,
        metalness: 0.6,
        roughness: 0.4,
      });
    function box(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material,
    ) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      group.add(b);
      return b;
    }
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9.4, 0.6, 12),
      hull,
    );
    platform.position.y = -0.65;
    group.add(platform);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(9.25, 0.045, 6, 96),
      new THREE.MeshBasicMaterial({ color: 0x4b6c80 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.28;
    group.add(rim);
    const grid = new THREE.GridHelper(17, 34, 0x355264, 0x203b4b);
    grid.position.y = -0.3;
    group.add(grid);
    box(12, 0.18, 1.8, 0, -0.12, 0, floor);
    box(1.8, 0.18, 12, 0, -0.1, 0, floor);
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 1),
      new THREE.MeshStandardMaterial({
        color: 0x79e6d5,
        emissive: 0x1c837b,
        emissiveIntensity: 0.8,
        wireframe: true,
      }),
    );
    core.position.y = 1;
    group.add(core);
    const objects: THREE.Object3D[] = [],
      rings: THREE.Mesh[] = [];
    for (const r of rooms) {
      const deck = box(4.4, 0.3, 4.4, r.x, 0, r.z, floor);
      deck.userData.room = r.id;
      objects.push(deck);
      box(4.4, 1.5, 0.18, r.x, 0.7, r.z - 2.15, hull);
      box(0.18, 1.5, 4.4, r.x - 2.15, 0.7, r.z, hull);
      const lm = new THREE.MeshBasicMaterial({ color: r.color });
      box(4.2, 0.04, 0.06, r.x, 1.46, r.z - 2.02, lm);
      box(0.06, 0.04, 4.2, r.x - 2.02, 1.46, r.z, lm);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.18, 1.3, 0.35, 32),
        dark,
      );
      base.position.set(r.x, 0.35, r.z);
      base.userData.room = r.id;
      group.add(base);
      objects.push(base);
      const geometry =
        r.id === 'tao'
          ? new THREE.IcosahedronGeometry(0.85, 2)
          : r.id === 'quantum'
            ? new THREE.SphereGeometry(0.85, 18, 12)
            : new THREE.TorusKnotGeometry(0.55, 0.17, 70, 8);
      const instrument = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: r.color,
          emissive: r.color,
          emissiveIntensity: 0.35,
          wireframe: true,
        }),
      );
      instrument.position.set(r.x, 1.7, r.z);
      instrument.userData.room = r.id;
      group.add(instrument);
      objects.push(instrument);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.3, 0.022, 5, 64),
        lm,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(r.x, 0.61, r.z);
      ring.userData.room = r.id;
      group.add(ring);
      rings.push(ring);
      for (let k = 0; k < 3; k++) {
        box(0.65, 0.5, 0.4, r.x - 1.25 + k * 0.8, 0.48, r.z + 1.45, dark);
        box(0.5, 0.02, 0.26, r.x - 1.25 + k * 0.8, 0.745, r.z + 1.45, lm);
      }
      box(0.12, 2.6, 0.12, r.x + 2, 1.2, r.z - 2, hull);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      box(
        0.25,
        0.35,
        1.4,
        8.4 * Math.cos(a),
        -0.3,
        8.4 * Math.sin(a),
        dark,
      ).rotation.y = -a;
    }
    const sg = new THREE.BufferGeometry(),
      p = [];
    for (let i = 0; i < 250; i++) {
      const a = i * 2.39996323,
        b = ((i * 137) % 250) / 250;
      p.push(
        45 * Math.cos(a) * Math.sqrt(1 - b * b),
        45 * b - 5,
        45 * Math.sin(a) * Math.sqrt(1 - b * b),
      );
    }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    scene.add(
      new THREE.Points(
        sg,
        new THREE.PointsMaterial({
          color: 0xb9d2e6,
          size: 0.06,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    let raf = 0,
      elapsed = 0,
      last = performance.now(),
      down = { x: 0, y: 0 };
    const pointer = new THREE.Vector2(),
      ray = new THREE.Raycaster();
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const b = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        (-(e.clientY - b.top) / b.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(objects)[0];
      if (hit?.object.userData.room)
        latest.current.onSelect(hit.object.userData.room);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!latest.current.reducedMotion && !document.hidden) {
        elapsed += dt;
        core.rotation.y = elapsed * 0.13;
        for (const o of objects)
          if (o.position.y > 1) {
            o.rotation.y = elapsed * 0.09;
            o.position.y = 1.7 + Math.sin(elapsed * 0.7) * 0.08;
          }
      }
      rings.forEach((r) => {
        const s = r.userData.room === latest.current.selected;
        r.scale.setScalar(s ? 1.12 : 1);
        (r.material as THREE.MeshBasicMaterial).opacity = s ? 1 : 0.35;
        (r.material as THREE.MeshBasicMaterial).transparent = true;
      });
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      const mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh ||
          o instanceof THREE.Points ||
          o instanceof THREE.LineSegments
        ) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(
            (m: THREE.Material) => mats.add(m),
          );
        }
      });
      mats.forEach((m) => m.dispose());
      renderer.dispose();
      el.replaceChildren();
    };
  }, []);
  return (
    <div className="station-scene" ref={root}>
      {failed && (
        <p className="scene-fallback">
          Your device is using instrument view. All laboratories are available
          below.
        </p>
      )}
    </div>
  );
}

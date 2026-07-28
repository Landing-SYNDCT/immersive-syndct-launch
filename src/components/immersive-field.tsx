import { useEffect, useRef } from "react";

/**
 * "Inside the dome" — the site-wide immersive layer.
 *
 * A fixed full-viewport field of light dots (the isotipo's own visual language)
 * rendered as a single additive Points draw call: prism-tinted, depth-fogged,
 * twinkling, with a slow projector-beam sweep crossing the field. The camera
 * eases toward the pointer so moving the mouse reads as turning your head
 * under the dome; scrolling drifts the field past you with per-dot parallax.
 *
 * Perf: one draw call, no postprocessing, DPR capped, ~1400 dots on desktop /
 * ~550 on coarse pointers. three is dynamically imported (shared chunk with
 * the hero dome). prefers-reduced-motion renders one static frame. The canvas
 * is aria-hidden and pointer-events-none — pure atmosphere, content stays DOM.
 */

const PRISM = [
  { hex: 0xffffff, weight: 0.55 }, // white dots — the isotipo language
  { hex: 0x5472cb, weight: 0.15 }, // prism blue
  { hex: 0x6b54d8, weight: 0.12 }, // indigo, brightened for additive glow
  { hex: 0x8a3fd1, weight: 0.08 }, // violet, brightened
  { hex: 0xe5bd39, weight: 0.05 }, // yellow — distant stage lights
  { hex: 0xe5772a, weight: 0.05 }, // orange
];

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uTime;
  uniform float uScroll;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Slow ambient drift, unique per dot.
    p.x += sin(uTime * 0.05 + aPhase * 6.2831) * 0.5;
    p.y += cos(uTime * 0.04 + aPhase * 4.1) * 0.4;
    // Scroll parallax — deeper dots move slower.
    p.y += uScroll * (0.35 + aPhase * 0.9);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    gl_PointSize = aSize * (280.0 / max(dist, 1.0));

    float twinkle = 0.55 + 0.45 * sin(uTime * (0.25 + aPhase * 0.9) + aPhase * 31.0);
    float fog = smoothstep(30.0, 9.0, dist);

    // Projector beam sweeping across the dome every ~22s.
    float sweep = fract(uTime / 22.0) * 2.0 - 0.5;
    float band = smoothstep(0.22, 0.0, abs(p.x / 40.0 + 0.5 - sweep));

    vColor = aColor;
    vAlpha = (twinkle * 0.8 + band * 0.5) * fog;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.12, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function ImmersiveField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
      camera.position.z = 13;
      const rig = new THREE.Group();
      rig.add(camera);
      scene.add(rig);

      // --- Dot field ------------------------------------------------------
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const COUNT = coarse ? 550 : 1400;
      const positions = new Float32Array(COUNT * 3);
      const sizes = new Float32Array(COUNT);
      const colors = new Float32Array(COUNT * 3);
      const phases = new Float32Array(COUNT);

      const pick = () => {
        let r = Math.random();
        for (const c of PRISM) {
          if ((r -= c.weight) <= 0) return c.hex;
        }
        return 0xffffff;
      };
      const tmp = new THREE.Color();
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 44;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
        // Mostly fine grain, a few large soft bokeh dots — like the isotipo's
        // varied dot sizes.
        sizes[i] = Math.random() < 0.06 ? 0.5 + Math.random() * 0.7 : 0.08 + Math.random() * 0.22;
        tmp.setHex(pick());
        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
        phases[i] = Math.random();
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uTime: { value: 0 }, uScroll: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(geo, mat));

      // --- Presence: pointer = head-turn, scroll = drift ------------------
      const pointer = { x: 0, y: 0 };
      const onPointerMove = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      window.addEventListener("resize", resize);
      resize();

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let raf = 0;
      if (reducedMotion) {
        mat.uniforms.uTime.value = 7; // a pleasant static arrangement
        renderer.render(scene, camera);
      } else {
        const clock = new THREE.Clock();
        const tick = () => {
          mat.uniforms.uTime.value = clock.getElapsedTime();
          mat.uniforms.uScroll.value = window.scrollY * 0.004;
          // Ease toward the pointer — turning your head under the dome.
          rig.rotation.y += (pointer.x * -0.06 - rig.rotation.y) * 0.03;
          rig.rotation.x += (pointer.y * -0.04 - rig.rotation.x) * 0.03;
          renderer.render(scene, camera);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", resize);
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (disposed) cleanup();
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div ref={containerRef} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}

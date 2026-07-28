import isotipo from "@/assets/immersive-isotipo.png";
import { useEffect, useRef } from "react";

/**
 * Isometric geodesic dome rendered with three.js.
 *
 * three (~170kB gz) is dynamically imported inside useEffect so it never enters
 * the SSR bundle and ships as its own lazy chunk — the landing paints first and
 * the dome fades in when ready. A white dome with a subtle thin-film iridescent
 * sheen, faceted through flat shading plus a faint EdgesGeometry strut overlay;
 * the isotipo is projected onto the front of the shell as a DecalGeometry, and
 * the dome swings (rather than spins) so the logo never rotates out of view.
 *
 * Honors prefers-reduced-motion (renders a single static frame) and disposes
 * everything on unmount. If WebGL is unavailable the container just stays
 * empty — the CSS glow behind it acts as the fallback visual.
 */
export function HeroDome({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      const { RoomEnvironment } =
        await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { DecalGeometry } = await import("three/examples/jsm/geometries/DecalGeometry.js");
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return; // no WebGL — keep the CSS glow fallback
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.opacity = "0";
      renderer.domElement.style.transition = "opacity 1.2s ease";
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;

      // True isometric: equal distance on all three axes.
      const FRUSTUM = 1.5;
      const camera = new THREE.OrthographicCamera(-FRUSTUM, FRUSTUM, FRUSTUM, -FRUSTUM, 0.1, 100);
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);

      // --- Geodesic hemisphere -------------------------------------------
      // Rotate the icosahedron so a vertex sits at the +Y pole; with an even
      // number of edge segments (detail 3 → 4 segments) the subdivision puts a
      // clean vertex ring exactly on the equator, so cutting at y >= 0 leaves a
      // straight base edge instead of a jagged one.
      const RADIUS = 1.18;
      const ico = new THREE.IcosahedronGeometry(RADIUS, 3).toNonIndexed();
      const topVertex = new THREE.Vector3(1, (1 + Math.sqrt(5)) / 2, 0).normalize();
      const poleUp = new THREE.Quaternion().setFromUnitVectors(
        topVertex,
        new THREE.Vector3(0, 1, 0),
      );
      ico.applyQuaternion(poleUp);

      const src = ico.getAttribute("position");
      const kept: number[] = [];
      const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      for (let i = 0; i < src.count; i += 3) {
        for (let j = 0; j < 3; j++) v[j].fromBufferAttribute(src, i + j);
        if (v.every((p) => p.y >= -1e-3)) {
          for (const p of v) kept.push(p.x, Math.max(p.y, 0), p.z);
        }
      }
      const domeGeo = new THREE.BufferGeometry();
      domeGeo.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
      domeGeo.computeVertexNormals();

      const domeMat = new THREE.MeshPhysicalMaterial({
        color: 0xf2f2f5,
        metalness: 0.15,
        roughness: 0.32,
        flatShading: true,
        iridescence: 0.45,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [100, 700],
        envMapIntensity: 1.1,
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);

      const strutGeo = new THREE.EdgesGeometry(domeGeo, 1);
      const strutMat = new THREE.LineBasicMaterial({
        color: 0x0a0a10,
        transparent: true,
        opacity: 0.22,
      });
      const struts = new THREE.LineSegments(strutGeo, strutMat);

      // Isotipo decal projected onto the front of the shell, facing the camera.
      // Created while the dome is still untransformed (group offset comes later),
      // so the decal's world-space geometry lines up when both join the group.
      const logoTexture = new THREE.TextureLoader().load(isotipo);
      logoTexture.colorSpace = THREE.SRGBColorSpace;
      logoTexture.anisotropy = 4;
      dome.updateMatrixWorld();
      const decalDir = new THREE.Vector3(1, 1, 1).normalize();
      const decalPos = decalDir.clone().multiplyScalar(RADIUS);
      const decalEuler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), decalDir),
      );
      const decalSize = new THREE.Vector3(RADIUS * 1.35, RADIUS * 1.35, RADIUS * 0.9);
      const decalGeo = new DecalGeometry(dome, decalPos, decalEuler, decalSize);
      // The isotipo art is white — multiplying by a near-black material color
      // renders it dark against the white shell.
      const decalMat = new THREE.MeshStandardMaterial({
        map: logoTexture,
        color: 0x15151d,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        roughness: 0.6,
        metalness: 0,
      });
      const decal = new THREE.Mesh(decalGeo, decalMat);

      // Base platform + glowing brand ring.
      const baseGeo = new THREE.CylinderGeometry(RADIUS * 1.14, RADIUS * 1.22, 0.09, 64);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x0d0d13,
        metalness: 0.6,
        roughness: 0.4,
        envMapIntensity: 0.5,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = -0.045;

      const ringGeo = new THREE.TorusGeometry(RADIUS * 1.18, 0.012, 12, 96);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x7a5cff });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.012;

      const group = new THREE.Group();
      group.add(dome, struts, decal, base, ring);
      group.position.y = -0.42;
      scene.add(group);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
      keyLight.position.set(3, 6, 2);
      const coolFill = new THREE.PointLight(0x5472cb, 14, 12);
      coolFill.position.set(-3, 1.2, 2.5);
      const warmRim = new THREE.PointLight(0xbc391a, 7, 10);
      warmRim.position.set(2.5, 0.4, -2.5);
      scene.add(keyLight, coolFill, warmRim);

      const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        if (!width || !height) return;
        const aspect = width / height;
        camera.left = -FRUSTUM * aspect;
        camera.right = FRUSTUM * aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      resize();

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let raf = 0;
      if (!reducedMotion) {
        const clock = new THREE.Clock();
        const tick = () => {
          // Gentle swing instead of a full spin — keeps the logo facing front.
          group.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.18;
          renderer.render(scene, camera);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
      requestAnimationFrame(() => {
        renderer.domElement.style.opacity = "1";
      });

      cleanup = () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        for (const geo of [domeGeo, strutGeo, decalGeo, baseGeo, ringGeo, ico]) geo.dispose();
        for (const mat of [domeMat, strutMat, decalMat, baseMat, ringMat]) mat.dispose();
        logoTexture.dispose();
        envTexture.dispose();
        pmrem.dispose();
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

  return <div ref={containerRef} className={className} aria-hidden />;
}

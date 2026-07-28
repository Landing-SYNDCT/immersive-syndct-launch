import isotipo from "@/assets/immersive-isotipo.png";
import { useEffect, useRef } from "react";

/**
 * Isometric geodesic dome rendered with three.js.
 *
 * three (~170kB gz) is dynamically imported inside useEffect so it never enters
 * the SSR bundle and ships as its own lazy chunk — the landing paints first and
 * the dome fades in when ready. A transparent glass shell (iridescent at
 * glancing angles, structure carried by white struts) wearing a ring of five
 * glowing white partner logos as decals; scrolling or tapping rolls the dome
 * from one logo to the next, and it leans toward the pointer.
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

      // Glass shell — transparent, softly iridescent at glancing angles, with
      // the geodesic structure carried by glowing white struts.
      const domeMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
        iridescence: 0.55,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [100, 700],
        envMapIntensity: 1.3,
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);

      const strutGeo = new THREE.EdgesGeometry(domeGeo, 1);
      const strutMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
      });
      const struts = new THREE.LineSegments(strutGeo, strutMat);
      struts.renderOrder = 1;

      // Logo ring: five glowing white logos spaced 72° around the glass shell.
      // Every artwork is normalized to a white silhouette on a canvas, paired
      // with a blurred copy drawn additively as the glow halo. `crop` is a
      // source rect (fractions, top-origin) for art lost in a big canvas;
      // `cutout` marks art that is a transparent hole in an opaque plate.
      const LOGOS: {
        url: string;
        w: number;
        h: number;
        crop?: { x: number; y: number; w: number; h: number };
        cutout?: boolean;
      }[] = [
        { url: isotipo, w: 1.08, h: 1.08 }, // Immersive isotipo — front at rest
        {
          url: "/logo-technosur.png",
          w: 1.0,
          h: 0.43,
          crop: { x: 0.15, y: 0.36, w: 0.7, h: 0.2 },
        },
        { url: "/logo-underpass.png", w: 0.8, h: 0.8 },
        { url: "/logo-yawa.png", w: 1.08, h: 0.54 },
        { url: "/logos-syndct.png", w: 0.84, h: 0.68, cutout: true },
      ];
      const N = LOGOS.length;
      // Ring elevation: low enough that the latitude circle has room for all
      // five logos — higher rings shrink the circumference and neighbors
      // wrap over the dome's crown.
      const RING_Y = 0.6;
      const latCos = Math.sqrt(1 - RING_Y ** 2 / (2 + RING_Y ** 2));
      // Logos differ in width, so equally-spaced CENTERS read as uneven gaps.
      // Instead, place centers so every edge-to-edge gap around the ring is
      // identical: each logo's occupied azimuth comes from its chord width on
      // the latitude circle where the ring sits.
      const halfArc = LOGOS.map((l) => Math.asin(Math.min(0.999, l.w / (2 * latCos))));
      const gap = (Math.PI * 2 - halfArc.reduce((sum, h) => sum + 2 * h, 0)) / N;
      const notchRoll = [0];
      for (let i = 1; i < N; i++) {
        notchRoll.push(notchRoll[i - 1] + halfArc[i - 1] + gap + halfArc[i]);
      }
      // Roll angle for a continuous notch position q (taps can push q past
      // N-1; the ring wraps by whole turns).
      const rollAt = (q: number) => {
        const k = Math.floor(q);
        const f = q - k;
        const at = (n: number) => Math.floor(n / N) * Math.PI * 2 + notchRoll[((n % N) + N) % N];
        return at(k) + (at(k + 1) - at(k)) * f;
      };
      // DecalGeometry bakes the target's world transform into the geometry.
      // The decals build asynchronously — by then the real dome is inside the
      // moving group, which would double-apply that transform. Project against
      // an identity-transform stand-in sharing the same geometry instead.
      const decalTarget = new THREE.Mesh(domeGeo);
      decalTarget.updateMatrixWorld();
      const yAxis = new THREE.Vector3(0, 1, 0);
      const frontDir = new THREE.Vector3(1, RING_Y, 1).normalize();

      const loadImage = (url: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });

      // "Opaque plate with the mark cut out" → "white mark on transparent":
      // flood-fill the transparent region touching the borders (the outside),
      // then keep only the enclosed transparent holes as the mark.
      const cutoutToMark = (data: ImageData) => {
        const { width, height, data: px } = data;
        const outside = new Uint8Array(width * height);
        const queue: number[] = [];
        const push = (x: number, y: number) => {
          const i = y * width + x;
          if (!outside[i] && px[i * 4 + 3] < 10) {
            outside[i] = 1;
            queue.push(i);
          }
        };
        for (let x = 0; x < width; x++) {
          push(x, 0);
          push(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          push(0, y);
          push(width - 1, y);
        }
        while (queue.length) {
          const i = queue.pop()!;
          const x = i % width;
          const y = (i / width) | 0;
          if (x > 0) push(x - 1, y);
          if (x < width - 1) push(x + 1, y);
          if (y > 0) push(x, y - 1);
          if (y < height - 1) push(x, y + 1);
        }
        for (let i = 0; i < width * height; i++) {
          const hole = px[i * 4 + 3] < 10 && !outside[i];
          px[i * 4] = 255;
          px[i * 4 + 1] = 255;
          px[i * 4 + 2] = 255;
          px[i * 4 + 3] = hole ? 255 : 0;
        }
      };

      const HALO_PAD = 1.35;
      const decalDisposables: { dispose(): void }[] = [];
      // Async: images load and process off the critical path; decals attach to
      // the group as they become ready.
      const buildDecals = () =>
        Promise.all(
          LOGOS.map(async (logo, i) => {
            const img = await loadImage(logo.url);
            if (disposed) return;
            const crop = logo.crop ?? { x: 0, y: 0, w: 1, h: 1 };
            const sw = img.width * crop.w;
            const sh = img.height * crop.h;
            const scale = Math.min(1, 1024 / Math.max(sw, sh));
            const cw = Math.round(sw * scale);
            const ch = Math.round(sh * scale);
            const canvas = document.createElement("canvas");
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, crop.x * img.width, crop.y * img.height, sw, sh, 0, 0, cw, ch);
            if (logo.cutout) {
              const data = ctx.getImageData(0, 0, cw, ch);
              cutoutToMark(data);
              ctx.putImageData(data, 0, 0);
            } else {
              // Repaint the art as a pure white silhouette, preserving alpha.
              ctx.globalCompositeOperation = "source-in";
              ctx.fillStyle = "#fff";
              ctx.fillRect(0, 0, cw, ch);
            }

            const halo = document.createElement("canvas");
            halo.width = Math.round(cw * HALO_PAD);
            halo.height = Math.round(ch * HALO_PAD);
            const hctx = halo.getContext("2d")!;
            hctx.filter = `blur(${Math.max(6, cw * 0.02)}px)`;
            const ox = (halo.width - cw) / 2;
            const oy = (halo.height - ch) / 2;
            hctx.drawImage(canvas, ox, oy);

            // Azimuth -notchRoll[i]: rolling the dome by notchRoll[i] brings
            // logo i to the front. lookAt keeps the projector's up
            // world-vertical (a raw shortest-arc quaternion twists decals).
            const dir = frontDir.clone().applyAxisAngle(yAxis, -notchRoll[i]);
            const pos = dir.clone().multiplyScalar(RADIUS);
            const projector = new THREE.Object3D();
            projector.position.copy(pos);
            projector.lookAt(pos.clone().add(dir));
            const euler = projector.rotation.clone();
            // Shallow projection depth — deep boxes wrap around the shell's
            // curvature and smear onto the side facets.
            const depth = RADIUS * 0.55;

            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = 4;
            const haloTexture = new THREE.CanvasTexture(halo);
            haloTexture.colorSpace = THREE.SRGBColorSpace;

            const geo = new DecalGeometry(
              decalTarget,
              pos,
              euler,
              new THREE.Vector3(RADIUS * logo.w, RADIUS * logo.h, depth),
            );
            const haloGeo = new DecalGeometry(
              decalTarget,
              pos,
              euler,
              new THREE.Vector3(RADIUS * logo.w * HALO_PAD, RADIUS * logo.h * HALO_PAD, depth),
            );
            const mat = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: -4,
            });
            const haloMat = new THREE.MeshBasicMaterial({
              map: haloTexture,
              transparent: true,
              opacity: 0.5,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: -2,
            });
            const haloMesh = new THREE.Mesh(haloGeo, haloMat);
            haloMesh.renderOrder = 2;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.renderOrder = 3;
            group.add(haloMesh, mesh);
            decalDisposables.push(geo, haloGeo, mat, haloMat, texture, haloTexture);
          }),
        );

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
      group.add(dome, struts, base, ring);
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
      const pointer = { x: 0, y: 0 };
      const onPointerMove = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      // Tap/click the dome to roll it one notch to the next logo.
      container.style.cursor = "pointer";
      let tapNotches = 0;
      let onTap: () => void;
      let anchored = false;
      const anchor = () => {
        anchored = true;
      };
      let raf = 0;
      if (!reducedMotion) {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        onTap = () => {
          tapNotches += 1;
        };
        container.addEventListener("click", onTap);
        const clock = new THREE.Clock();
        // Scroll rolls the dome one notch per ~175px, stopping on the last
        // logo; taps add notches on top and keep cycling. Eased so it feels
        // like mass, not a scrubbed dial.
        const PX_PER_NOTCH = 175;
        // The dome always appears with the Immersive logo centered: the roll
        // anchor keeps tracking the scroll position (absorbing the browser's
        // scroll restoration, which can animate in after mount) until the
        // visitor actually interacts — only their own scrolling rolls the dome.
        let scrollOrigin = window.scrollY;
        window.addEventListener("wheel", anchor, { passive: true, once: true });
        window.addEventListener("touchstart", anchor, { passive: true, once: true });
        window.addEventListener("keydown", anchor, { once: true });
        let lean = 0;
        let roll = 0;
        const tick = () => {
          if (!anchored) scrollOrigin = window.scrollY;
          const scrolled = Math.max(0, window.scrollY - scrollOrigin);
          const targetRoll = rollAt(Math.min(scrolled / PX_PER_NOTCH, N - 1) + tapNotches);
          roll += (targetRoll - roll) * 0.06;
          lean += (pointer.x * 0.12 - lean) * 0.04;
          // The idle swing fades out once the roll starts so each logo lands
          // facing front instead of oscillating around it.
          const swing = Math.sin(clock.getElapsedTime() * 0.3) * 0.18 * Math.max(0, 1 - roll / 0.5);
          group.rotation.y = swing + lean + roll;
          group.rotation.x += (pointer.y * 0.05 - group.rotation.x) * 0.04;
          renderer.render(scene, camera);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } else {
        onTap = () => {
          tapNotches += 1;
          group.rotation.y = rollAt(tapNotches);
          renderer.render(scene, camera);
        };
        container.addEventListener("click", onTap);
      }
      // Kick off the logo pipeline; re-render once ready for the static path.
      buildDecals().then(() => {
        if (!disposed && reducedMotion) renderer.render(scene, camera);
      });
      requestAnimationFrame(() => {
        renderer.domElement.style.opacity = "1";
      });

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("click", onTap);
        window.removeEventListener("wheel", anchor);
        window.removeEventListener("touchstart", anchor);
        window.removeEventListener("keydown", anchor);
        observer.disconnect();
        for (const geo of [domeGeo, strutGeo, baseGeo, ringGeo, ico]) geo.dispose();
        for (const mat of [domeMat, strutMat, baseMat, ringMat]) mat.dispose();
        for (const d of decalDisposables) d.dispose();
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

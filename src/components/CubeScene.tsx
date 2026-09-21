import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  FACE_COLORS, FACE_NAMES, FACE_ORDER, STICKER_POSITIONS,
  faceTurn, swipeMove, type CubeFace,
} from '../cube/geometry';

export interface CubeSceneProps {
  state: string;
  onMove?: (move: string) => void;
  selectedFace?: string;
  onSelectFace?: (face: string) => void;
  viewMode?: boolean;
  disabled?: boolean;
  highlight?: number[];
  lastMove?: { move: string; id: number };
  resetViewKey?: number;
  compact?: boolean;
}

type QueuedTurn = { state: string; move: string };
type SceneController = {
  setState: (state: string, move?: string) => void;
  refresh: () => void;
  resetView: () => void;
};

function roundedSticker(size: number, radius: number) {
  const shape = new THREE.Shape();
  const h = size / 2;
  shape.moveTo(-h + radius, -h);
  shape.lineTo(h - radius, -h);
  shape.quadraticCurveTo(h, -h, h, -h + radius);
  shape.lineTo(h, h - radius);
  shape.quadraticCurveTo(h, h, h - radius, h);
  shape.lineTo(-h + radius, h);
  shape.quadraticCurveTo(-h, h, -h, h - radius);
  shape.lineTo(-h, -h + radius);
  shape.quadraticCurveTo(-h, -h, -h + radius, -h);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.013, bevelEnabled: true, bevelThickness: 0.009,
    bevelSize: 0.009, bevelSegments: 2, curveSegments: 5, steps: 1,
  });
}

/** The canvas is a view of the parent's authoritative cube state. It never
 * mutates cube state itself: gestures request a move through onMove. */
export function CubeScene(props: CubeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const controllerRef = useRef<SceneController | null>(null);
  const lastMoveIdRef = useRef(props.lastMove?.id);
  const [unavailable, setUnavailable] = useState(false);
  const [turning, setTurning] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setUnavailable(true);
      return;
    }
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
    mount.appendChild(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
    const cube = new THREE.Group();
    scene.add(cube);
    scene.add(new THREE.AmbientLight(0xffffff, 1.05));
    scene.add(new THREE.HemisphereLight(0xf4f9ff, 0x8896a9, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(-3, 8, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xb9d8ff, 0.6);
    fillLight.position.set(7, 2, -2);
    scene.add(fillLight);

    const bodyGeometry = new RoundedBoxGeometry(0.945, 0.945, 0.945, 3, 0.078);
    const stickerGeometry = roundedSticker(0.766, 0.106);
    const outlineGeometry = roundedSticker(0.872, 0.14);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: '#152a3e', roughness: 0.36, metalness: 0.06,
      clearcoat: 0.22, clearcoatRoughness: 0.36,
    });
    const stickerMaterials = FACE_ORDER.reduce((acc, face) => {
      acc[face] = new THREE.MeshStandardMaterial({
        color: FACE_COLORS[face], roughness: 0.37, metalness: 0.015,
      });
      return acc;
    }, {} as Record<CubeFace, THREE.MeshStandardMaterial>);
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: '#fff5aa' });
    const selectedMaterial = new THREE.MeshBasicMaterial({ color: '#a9cafc' });
    const cubies: THREE.Group[] = [];
    const stickerMeshes: THREE.Mesh[] = [];
    const outlineMeshes: THREE.Mesh[] = [];
    const zAxis = new THREE.Vector3(0, 0, 1);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (!x && !y && !z) continue;
          const cubie = new THREE.Group();
          cubie.position.set(x, y, z);
          cubie.userData.position = [x, y, z];
          cubie.add(new THREE.Mesh(bodyGeometry, bodyMaterial));
          for (const sticker of STICKER_POSITIONS) {
            if (sticker.position[0] !== x || sticker.position[1] !== y || sticker.position[2] !== z) continue;
            const normal = new THREE.Vector3(...sticker.normal);
            const mesh = new THREE.Mesh(stickerGeometry, stickerMaterials[sticker.face]);
            mesh.quaternion.setFromUnitVectors(zAxis, normal);
            mesh.position.copy(normal).multiplyScalar(0.478);
            mesh.userData.face = sticker.face;
            mesh.userData.index = sticker.index;
            cubie.add(mesh);
            stickerMeshes[sticker.index] = mesh;
            const outline = new THREE.Mesh(outlineGeometry, highlightMaterial);
            outline.quaternion.copy(mesh.quaternion);
            outline.position.copy(normal).multiplyScalar(0.469);
            outline.visible = false;
            cubie.add(outline);
            outlineMeshes[sticker.index] = outline;
          }
          cube.add(cubie);
          cubies.push(cubie);
        }
      }
    }

    let disposed = false;
    let frameId = 0;
    let dirty = true;
    let visualState = propsRef.current.state;
    let targetState = visualState;
    let queue: QueuedTurn[] = [];
    let animation: { pivot: THREE.Group; start: number; duration: number; target: string; axis: 0 | 1 | 2; angle: number } | null = null;
    let azimuth = 0.70;
    let polar = 0.95;
    let aspect = 1;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const updateCamera = () => {
      const radius = 8.5 / Math.min(aspect, 1);
      camera.position.set(
        radius * Math.sin(polar) * Math.sin(azimuth),
        radius * Math.cos(polar),
        radius * Math.sin(polar) * Math.cos(azimuth),
      );
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      dirty = true;
    };
    const updateMaterials = () => {
      canvas.style.touchAction = propsRef.current.onMove || propsRef.current.onSelectFace || propsRef.current.viewMode ? 'none' : 'pan-y';
      const highlighted = new Set(propsRef.current.highlight || []);
      for (let index = 0; index < 54; index++) {
        const color = visualState[index] as CubeFace;
        stickerMeshes[index].material = stickerMaterials[color] || stickerMaterials.D;
        const active = highlighted.has(index);
        // A small centre outline identifies the selected face without changing sticker colours.
        const selected = index % 9 === 4 && STICKER_POSITIONS[index].face === propsRef.current.selectedFace;
        outlineMeshes[index].visible = active || selected;
        outlineMeshes[index].material = active ? highlightMaterial : selectedMaterial;
      }
      dirty = true;
    };
    const restoreCubies = () => {
      if (animation) {
        for (const child of [...animation.pivot.children]) cube.add(child);
        cube.remove(animation.pivot);
      }
      for (const cubie of cubies) {
        cubie.position.set(...(cubie.userData.position as [number, number, number]));
        cubie.quaternion.identity();
      }
      animation = null;
    };
    const beginNext = (time: number) => {
      const next = queue.shift();
      if (!next) { setTurning(false); return; }
      const turn = faceTurn(next.move);
      if (!turn) {
        visualState = next.state;
        updateMaterials();
        beginNext(time);
        return;
      }
      const pivot = new THREE.Group();
      cube.add(pivot);
      for (const cubie of cubies) {
        if (cubie.userData.position[turn.axis] === turn.layer) pivot.add(cubie);
      }
      animation = { pivot, start: time, duration: reducedMotion ? 1 : 230, target: next.state, axis: turn.axis, angle: turn.angle };
      setTurning(true);
    };
    const draw = (time: number) => {
      if (disposed) return;
      frameId = 0;
      if (!animation && queue.length) beginNext(time);
      if (animation) {
        const fraction = Math.min(1, (time - animation.start) / animation.duration);
        const eased = fraction < 0.5 ? 4 * fraction ** 3 : 1 - (-2 * fraction + 2) ** 3 / 2;
        animation.pivot.rotation.set(0, 0, 0);
        const angle = animation.angle * eased;
        if (animation.axis === 0) animation.pivot.rotation.x = angle;
        else if (animation.axis === 1) animation.pivot.rotation.y = angle;
        else animation.pivot.rotation.z = angle;
        dirty = true;
        if (fraction >= 1) {
          visualState = animation.target;
          restoreCubies();
          updateMaterials();
          if (queue.length) beginNext(time); else setTurning(false);
        }
      }
      if (dirty) { renderer.render(scene, camera); dirty = false; }
      if (animation || queue.length) frameId = requestAnimationFrame(draw);
    };
    const schedule = () => { if (!frameId && !disposed) frameId = requestAnimationFrame(draw); };
    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      updateCamera();
      schedule();
    };

    controllerRef.current = {
      setState(state, move) {
        if (state === targetState) return;
        targetState = state;
        if (move && faceTurn(move)) {
          queue.push({ state, move });
        } else {
          queue = [];
          restoreCubies();
          visualState = state;
          updateMaterials();
          setTurning(false);
        }
        schedule();
      },
      refresh() { updateMaterials(); schedule(); },
      resetView() { azimuth = 0.70; polar = 0.95; updateCamera(); schedule(); },
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let gesture: { pointerId: number; x: number; y: number; previousX: number; previousY: number; face?: CubeFace; viewing: boolean } | null = null;
    const faceAt = (event: PointerEvent): CubeFace | undefined => {
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(stickerMeshes, false)[0]?.object.userData.face as CubeFace | undefined;
    };
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || gesture) return;
      const current = propsRef.current;
      if (current.disabled || animation || queue.length) return;
      if (!current.viewMode && !current.onMove && !current.onSelectFace) return;
      gesture = {
        pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        previousX: event.clientX, previousY: event.clientY,
        face: current.viewMode ? undefined : faceAt(event), viewing: !!current.viewMode,
      };
      try { canvas.setPointerCapture(event.pointerId); } catch { /* Detached/cancelled pointer. */ }
      event.preventDefault();
    };
    const pointerMove = (event: PointerEvent) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      if (gesture.viewing) {
        azimuth -= (event.clientX - gesture.previousX) * 0.008;
        polar = Math.max(0.12, Math.min(Math.PI - 0.12, polar - (event.clientY - gesture.previousY) * 0.008));
        updateCamera(); schedule();
      }
      gesture.previousX = event.clientX;
      gesture.previousY = event.clientY;
      event.preventDefault();
    };
    const pointerUp = (event: PointerEvent) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const completed = gesture;
      gesture = null;
      try { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch { /* Already released by browser. */ }
      if (completed.viewing || !completed.face || propsRef.current.disabled || animation || queue.length) return;
      propsRef.current.onSelectFace?.(completed.face);
      const move = swipeMove(completed.face, event.clientX - completed.x, event.clientY - completed.y);
      if (move) propsRef.current.onMove?.(move);
    };
    const cancelPointer = () => { gesture = null; };
    const contextLost = (event: Event) => {
      event.preventDefault();
      setUnavailable(true);
      gesture = null;
    };
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', cancelPointer);
    canvas.addEventListener('lostpointercapture', cancelPointer);
    canvas.addEventListener('webglcontextlost', contextLost);
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    updateMaterials();
    resize();

    return () => {
      disposed = true;
      controllerRef.current = null;
      observer.disconnect();
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', cancelPointer);
      canvas.removeEventListener('lostpointercapture', cancelPointer);
      canvas.removeEventListener('webglcontextlost', contextLost);
      bodyGeometry.dispose(); stickerGeometry.dispose(); outlineGeometry.dispose();
      bodyMaterial.dispose(); highlightMaterial.dispose(); selectedMaterial.dispose();
      for (const material of Object.values(stickerMaterials)) material.dispose();
      renderer.dispose();
      if (canvas.parentElement === mount) mount.removeChild(canvas);
    };
  }, []);

  useEffect(() => {
    const freshMove = props.lastMove && props.lastMove.id !== lastMoveIdRef.current;
    lastMoveIdRef.current = props.lastMove?.id;
    controllerRef.current?.setState(props.state, freshMove ? props.lastMove?.move : undefined);
  }, [props.state, props.lastMove?.id, props.lastMove?.move]);

  useEffect(() => { controllerRef.current?.refresh(); }, [props.selectedFace, props.highlight, !!props.onMove, !!props.onSelectFace, props.viewMode]);
  useEffect(() => { controllerRef.current?.resetView(); }, [props.resetViewKey]);

  const interactive = !!props.onMove || !!props.onSelectFace;
  return (
    <div className={`cube-scene${props.compact ? ' cube-scene--compact' : ''}${turning ? ' is-turning' : ''}`}
      role="group" data-cube-state={props.state} aria-label="Cub 3D. Sus galben, în față verde, în dreapta roșu."
      aria-busy={turning} style={{ position: 'relative', isolation: 'isolate' }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: '23%', right: '23%', bottom: '6%', height: '6%', borderRadius: '50%', background: '#1b345c', opacity: 0.12, filter: 'blur(13px)', zIndex: -1 }} />
      <div ref={mountRef} style={{ width: '100%', height: '100%', display: unavailable ? 'none' : undefined,
        cursor: props.disabled || turning ? 'wait' : props.viewMode ? 'grab' : interactive ? 'pointer' : 'default' }} />
      {unavailable && <div className="cube-fallback" style={{ padding: '12px', overflow: 'auto', height: '100%' }}>
        <p style={{ margin: '0 0 8px', fontSize: '0.875rem' }}>Vedere 2D — folosește butoanele pentru a roti fețele.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 400, margin: 'auto' }}>
          {FACE_ORDER.map(face => <button type="button" key={face} onClick={() => props.onSelectFace?.(face)}
            disabled={props.disabled} aria-label={`Selectează fața ${FACE_NAMES[face]}`}
            style={{ background: 'transparent', border: props.selectedFace === face ? '2px solid #337fef' : '2px solid transparent', borderRadius: 12, padding: 4 }}>
            <span style={{ display: 'block', color: '#172e45', marginBottom: 4 }}>{face} · {FACE_NAMES[face]}</span>
            <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, background: '#183048', borderRadius: 6, padding: 3 }}>
              {Array.from({ length: 9 }, (_, index) => {
                const letter = props.state[FACE_ORDER.indexOf(face) * 9 + index] as CubeFace;
                return <span key={index} aria-label={letter} style={{ aspectRatio: '1', borderRadius: 3, background: FACE_COLORS[letter] || '#fff', outline: props.highlight?.includes(FACE_ORDER.indexOf(face) * 9 + index) ? '2px solid #fff7b0' : undefined }} />;
              })}
            </span>
          </button>)}
        </div>
      </div>}
      {interactive && !props.compact && !unavailable && <div className="cube-gesture-hint" aria-live="polite"
        style={{ position: 'absolute', left: 10, right: 10, bottom: 0, textAlign: 'center', fontSize: 12, color: '#62748a', pointerEvents: 'none' }}>
        {turning ? 'Rotim fața…' : props.viewMode ? 'Trage ca să privești cubul din jur.' : 'Atinge o față · glisează → pentru ↻, ← pentru ↺'}
      </div>}
    </div>
  );
}

export default CubeScene;

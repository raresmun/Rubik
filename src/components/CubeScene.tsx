import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  FACE_COLORS, FACE_NAMES, FACE_NORMALS, FACE_ORDER, STICKER_POSITIONS,
  faceTurn, swipeMove, type CubeFace,
} from '../cube/geometry';
import './CubeFallback.css';

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

const CSS_FACE_ROTATIONS: Record<CubeFace, string> = {
  U: 'rotateX(90deg)', R: 'rotateY(90deg)', F: '',
  D: 'rotateX(-90deg)', L: 'rotateY(-90deg)', B: 'rotateY(180deg)',
};

/** CSS's y axis points down: U is rotateX(+90), D rotateX(-90). Each
 * plane's local rows/columns therefore map exactly to STICKER_POSITIONS.
 * This view uses the same facelets, rather than a decorative cube image. */
function CssCubeFallback(props: CubeSceneProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{ id: number; x: number; y: number; lastX: number; lastY: number; face?: CubeFace; viewing: boolean } | null>(null);
  const [size, setSize] = useState(160);
  const [angle, setAngle] = useState({ x: -25, y: -34 });
  const [dragging, setDragging] = useState(false);
  const interactive = !!props.onMove || !!props.onSelectFace;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setSize(Math.max(64, Math.min(stage.clientWidth, stage.clientHeight) * 0.54));
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setAngle({ x: -25, y: -34 }); }, [props.resetViewKey]);

  const cancel = () => { gestureRef.current = null; setDragging(false); };
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (props.disabled || !event.isPrimary || event.button !== 0 || gestureRef.current || (!interactive && !props.viewMode)) return;
    const target = event.target as HTMLElement;
    const face = target.closest<HTMLElement>('[data-css-cube-face]')?.dataset.cssCubeFace as CubeFace | undefined;
    if (!props.viewMode && !face) return;
    gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, face, viewing: !!props.viewMode };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Cancelled pointer. */ }
    setDragging(true);
    event.preventDefault();
  };
  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    if (gesture.viewing) {
      const dx = event.clientX - gesture.lastX;
      const dy = event.clientY - gesture.lastY;
      setAngle(current => ({ x: Math.max(-175, Math.min(175, current.x - dy * 0.45)), y: current.y + dx * 0.45 }));
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    event.preventDefault();
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    cancel();
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Already released. */ }
    if (gesture.viewing || !gesture.face || props.disabled) return;
    props.onSelectFace?.(gesture.face);
    const move = swipeMove(gesture.face, event.clientX - gesture.x, event.clientY - gesture.y);
    if (move) props.onMove?.(move);
  };

  return <div ref={stageRef} className={`css-cube-stage${dragging ? ' is-dragging' : ''}`}
    data-renderer="css3d" style={{ '--cube-size': `${size}px`, '--cube-half': `${size / 2}px`,
      perspective: `${size * 6}px`, touchAction: interactive || props.viewMode ? 'none' : 'pan-y',
      cursor: props.disabled ? 'default' : props.viewMode ? dragging ? 'grabbing' : 'grab' : interactive ? 'pointer' : 'default',
    } as CSSProperties}
    onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}>
    <div className="css-cube-shadow" aria-hidden="true" />
    <div className="css-cube-model" style={{ transform: `translate(-50%, -50%) rotateX(${angle.x}deg) rotateY(${angle.y}deg)` }}>
      {FACE_ORDER.map((face, faceIndex) => {
        const normal = FACE_NORMALS[face];
        const pitch = angle.x * Math.PI / 180, yaw = angle.y * Math.PI / 180;
        const towardCamera = -normal[1] * Math.sin(pitch) + (-normal[0] * Math.sin(yaw) + normal[2] * Math.cos(yaw)) * Math.cos(pitch);
        return <div key={face} className="css-cube-face" data-css-cube-face={face}
          role={interactive ? 'button' : undefined} aria-label={interactive ? `Selectează fața ${FACE_NAMES[face]}` : undefined}
          aria-disabled={interactive ? !!props.disabled : undefined}
          tabIndex={interactive && !props.disabled && !props.viewMode && towardCamera > 0.05 ? 0 : -1}
          style={{ transform: `${CSS_FACE_ROTATIONS[face]} translateZ(var(--cube-half))` }}
          onKeyDown={event => {
            if (props.disabled || props.viewMode) return;
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); props.onSelectFace?.(face); }
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault(); props.onSelectFace?.(face); props.onMove?.(event.key === 'ArrowRight' ? face : `${face}'`);
            }
          }}>
          {Array.from({ length: 9 }, (_, offset) => {
            const index = faceIndex * 9 + offset;
            const letter = props.state[index] as CubeFace;
            const highlighted = props.highlight?.includes(index);
            const selected = offset === 4 && props.selectedFace === face;
            return <span key={index} className={`css-cube-cell${highlighted ? ' is-highlighted' : ''}${selected ? ' is-selected' : ''}`}
              data-sticker-index={index} data-sticker-color={letter}
              style={{ '--sticker-color': FACE_COLORS[letter] || '#ffffff' } as CSSProperties}>
              <span className="css-cube-sticker" />
            </span>;
          })}
        </div>;
      })}
    </div>
    {interactive && !props.compact && <p className="css-cube-status">
      {props.viewMode ? 'Trage ca să privești cubul din jur.' : 'Vedere simplă · mișcările se afișează imediat.'}
    </p>}
  </div>;
}

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
      color: '#0c1724', roughness: 0.36, metalness: 0.06,
      clearcoat: 0.22, clearcoatRoughness: 0.36,
    });
    const stickerMaterials = FACE_ORDER.reduce((acc, face) => {
      // Keep teaching colours exact, including pure white. Lighting and filmic
      // tone mapping belong to the rounded plastic, not the colour stickers.
      acc[face] = new THREE.MeshBasicMaterial({
        color: FACE_COLORS[face], toneMapped: false,
      });
      return acc;
    }, {} as Record<CubeFace, THREE.MeshBasicMaterial>);
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: '#60dfff', toneMapped: false });
    const selectedMaterial = new THREE.MeshBasicMaterial({ color: '#a9cafc', toneMapped: false });
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
      {unavailable && <CssCubeFallback {...props} />}
      {interactive && !props.compact && !unavailable && <div className="cube-gesture-hint" aria-live="polite"
        style={{ position: 'absolute', left: 10, right: 10, bottom: 0, textAlign: 'center', fontSize: 12, color: '#62748a', pointerEvents: 'none' }}>
        {turning ? 'Rotim fața…' : props.viewMode ? 'Trage ca să privești cubul din jur.' : 'Atinge o față · glisează → pentru ↻, ← pentru ↺'}
      </div>}
    </div>
  );
}

export default CubeScene;

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { MOUSE, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { usePlayerStore } from '../../stores/playerStore';
import { useUiStore } from '../../stores/uiStore';
import { useTerrainBrushStore } from '../../stores/terrainBrushStore';
import { editorSpawn } from '../../stores/sceneEditStore';

const LOOK_SENSITIVITY = 0.0025;

export const FollowCamera = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const playerPosition = usePlayerStore((state) => state.position);
  // Phase 89 — in Edit Mode the camera stops following the player and pans freely so
  // you can orbit/pan to any object anywhere in the area.
  const editMode = useUiStore((state) => state.editMode);
  // Phase 98d — suspend camera rotation while a terrain brush/selection tool is active so left-drag
  // edits the terrain instead of orbiting.
  const terrainTool = useTerrainBrushStore((state) => state.tool);
  const terrainShiftHeld = useTerrainBrushStore((state) => state.shiftHeld);
  const gl = useThree((state) => state.gl);

  // Phase C — pointer-lock "mouse-look": double-click the canvas to hide the cursor and
  // rotate the camera infinitely (like a 3D game); Esc or double-click again restores the
  // normal cursor-drag orbit. We drive our own spherical angles around the follow target;
  // on exit OrbitControls re-reads the camera pose so there's no jump.
  const [pointerLook, setPointerLook] = useState(false);
  // Hold Shift → left-drag pans the camera (instead of orbiting); release → back to orbit.
  const [shiftPan, setShiftPan] = useState(false);
  const yaw = useRef(0);     // azimuth (matches OrbitControls.getAzimuthalAngle)
  const pitch = useRef(1.0); // polar   (matches OrbitControls.getPolarAngle)
  const dist = useRef(8);
  const tmpTarget = useRef(new Vector3());

  useEffect(() => {
    const dom = gl.domElement;
    const onDblClick = () => {
      if (document.pointerLockElement === dom) {
        document.exitPointerLock();
      } else {
        // Seed our angles from the current orbit so entering is seamless.
        const c = controlsRef.current;
        if (c) {
          yaw.current = c.getAzimuthalAngle();
          pitch.current = c.getPolarAngle();
          dist.current = c.getDistance();
        }
        void dom.requestPointerLock?.();
      }
    };
    const onLockChange = () => setPointerLook(document.pointerLockElement === dom);
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== dom) return;
      yaw.current -= e.movementX * LOOK_SENSITIVITY;
      pitch.current = Math.max(0.2, Math.min(Math.PI - 0.2, pitch.current + e.movementY * LOOK_SENSITIVITY));
    };
    const onShift = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftPan(e.type === 'keydown'); };
    dom.addEventListener('dblclick', onDblClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onShift);
    window.addEventListener('keyup', onShift);
    return () => {
      dom.removeEventListener('dblclick', onDblClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onShift);
      window.removeEventListener('keyup', onShift);
    };
  }, [gl]);

  useFrame((state) => {
    const c = controlsRef.current;
    if (!c) return;

    if (pointerLook) {
      // Orbit the target via our own spherical angles (infinite rotation, no cursor).
      const t = tmpTarget.current;
      if (editMode) {
        t.set(editorSpawn.x, editorSpawn.y, editorSpawn.z);
      } else if (playerPosition) {
        t.set(playerPosition.x, playerPosition.y + 1, playerPosition.z);
      } else {
        t.copy(c.target);
      }
      c.target.copy(t);
      const sinP = Math.sin(pitch.current);
      const r = dist.current;
      state.camera.position.set(
        t.x + r * sinP * Math.sin(yaw.current),
        t.y + r * Math.cos(pitch.current),
        t.z + r * sinP * Math.cos(yaw.current),
      );
      state.camera.lookAt(t);
      if (editMode) { editorSpawn.x = t.x; editorSpawn.y = t.y; editorSpawn.z = t.z; }
      return;
    }

    if (editMode) {
      // free camera: don't snap to player; remember the focus point so newly-added
      // models spawn where you're looking.
      editorSpawn.x = c.target.x;
      editorSpawn.y = c.target.y;
      editorSpawn.z = c.target.z;
      return;
    }
    if (!playerPosition) return;
    c.target.set(playerPosition.x, playerPosition.y + 1, playerPosition.z);
    c.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!pointerLook}
      minPolarAngle={0.2}
      maxPolarAngle={editMode ? Math.PI : Math.PI / 2.2}
      // Play: keep a comfortable third-person gap behind the player (not too close, not too far).
      minDistance={editMode ? 0.5 : 5}
      maxDistance={editMode ? Infinity : 16}
      enablePan={editMode}
      enableRotate={!(editMode && terrainTool !== 'none') || terrainShiftHeld}
      // Left-drag orbits in Edit Mode; hold Shift → left-drag pans the camera. Right-drag always pans,
      // middle dollies. (A plain left-click still selects an object.)
      mouseButtons={{ LEFT: shiftPan ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
      enableDamping
      dampingFactor={0.1}
    />
  );
};

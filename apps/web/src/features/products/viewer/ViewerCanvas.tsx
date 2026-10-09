import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, type ElementRef, type MutableRefObject } from 'react';
import { Box3, Spherical, Vector3, type Material, type Mesh, type Texture } from 'three';

type OrbitControlsImpl = ElementRef<typeof OrbitControls>;

// Decoders are served from our own domain (public/draco), never from a CDN.
const DRACO_PATH = '/draco/';
const TARGET_SIZE = 2;
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 9;
const ZOOM_STEP = 1.25;
const ROTATE_STEP = Math.PI / 8;
const START_POSITION: [number, number, number] = [0, 1, 5.6];

export interface ViewerApi {
  rotate: (direction: -1 | 1) => void;
  zoom: (direction: -1 | 1) => void;
  reset: () => void;
}

interface ViewerCanvasProps {
  modelUrl: string;
  autoRotate: boolean;
  apiRef: MutableRefObject<ViewerApi | null>;
  onReady: () => void;
  onInteract: () => void;
}

function disposeScene(root: { traverse: (cb: (node: Mesh) => void) => void }): void {
  root.traverse((node) => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials as (Material | undefined)[]) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if ((value as Texture | undefined)?.isTexture) (value as Texture).dispose();
      }
      material.dispose();
    }
  });
}

function Model({ url, onReady }: { url: string; onReady: () => void }) {
  const gltf = useGLTF(url, DRACO_PATH);
  const { scene, offset, scale } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    return {
      scene: clone,
      offset: box.getCenter(new Vector3()).multiplyScalar(-1),
      scale: TARGET_SIZE / longest,
    };
  }, [gltf]);

  useEffect(() => {
    onReady();
    return () => {
      disposeScene(gltf.scene as unknown as Parameters<typeof disposeScene>[0]);
      useGLTF.clear(url);
    };
  }, [gltf, onReady, url]);

  return (
    <group scale={scale}>
      <primitive object={scene} position={offset} />
    </group>
  );
}

/** Exposes the toolbar actions; rotating and zooming move the camera around the orbit target. */
function Rig({ apiRef }: { apiRef: MutableRefObject<ViewerApi | null> }) {
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!controls) return;
    const orbit = (change: (spherical: Spherical) => void) => {
      const offset = controls.object.position.clone().sub(controls.target);
      const spherical = new Spherical().setFromVector3(offset);
      change(spherical);
      spherical.radius = Math.min(Math.max(spherical.radius, MIN_DISTANCE), MAX_DISTANCE);
      controls.object.position.copy(controls.target).add(offset.setFromSpherical(spherical));
      controls.update();
      invalidate();
    };
    apiRef.current = {
      rotate: (direction) => orbit((s) => (s.theta += direction * ROTATE_STEP)),
      zoom: (direction) => orbit((s) => (s.radius *= direction > 0 ? 1 / ZOOM_STEP : ZOOM_STEP)),
      reset: () => {
        controls.object.position.set(...START_POSITION);
        controls.target.set(0, 0, 0);
        controls.update();
        invalidate();
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, controls, invalidate]);

  return null;
}

export default function ViewerCanvas({
  modelUrl,
  autoRotate,
  apiRef,
  onReady,
  onInteract,
}: ViewerCanvasProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={autoRotate ? 'always' : 'demand'}
      camera={{ position: START_POSITION, fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ touchAction: 'none' }}
    >
      <ambientLight intensity={0.5} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 4]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1, -2]} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1} position={[5, 1, 2]} scale={[4, 6, 1]} />
      </Environment>
      <Model url={modelUrl} onReady={onReady} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.78}
        autoRotate={autoRotate}
        autoRotateSpeed={1.6}
        onStart={onInteract}
      />
      <Rig apiRef={apiRef} />
    </Canvas>
  );
}

import { RotateCcw, RotateCw, Undo2 } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolButton } from './ToolButton';
import { hasCoarsePointer } from './webgl';

const MAX_TURN_DEG = 35;
const MAX_TILT_DEG = 15;
const STEP_DEG = 10;
const DEG_PER_PX = 0.35;

interface Angle {
  turn: number;
  tilt: number;
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

const KEY_STEPS: Record<string, Angle | 'reset'> = {
  ArrowLeft: { turn: -STEP_DEG, tilt: 0 },
  ArrowRight: { turn: STEP_DEG, tilt: 0 },
  ArrowUp: { turn: 0, tilt: STEP_DEG },
  ArrowDown: { turn: 0, tilt: -STEP_DEG },
  Home: 'reset',
};

interface RotateViewerProps {
  src: string;
  title: string;
}

/**
 * Photo-based "turn it in your hand" view: the picture tilts in perspective under the finger or
 * mouse, with a floor shadow that follows it. No WebGL, so it works on every device.
 */
export function RotateViewer({ src, title }: RotateViewerProps) {
  const { t } = useTranslation();
  const [angle, setAngle] = useState<Angle>({ turn: 0, tilt: 0 });
  const [touched, setTouched] = useState(false);
  const drag = useRef<{ x: number; y: number; from: Angle } | null>(null);

  const turnBy = (delta: Angle) => {
    setTouched(true);
    setAngle((current) => ({
      turn: clamp(current.turn + delta.turn, MAX_TURN_DEG),
      tilt: clamp(current.tilt + delta.tilt, MAX_TILT_DEG),
    }));
  };
  const reset = () => setAngle({ turn: 0, tilt: 0 });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, from: angle };
    setTouched(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    setAngle({
      turn: clamp(start.from.turn + (event.clientX - start.x) * DEG_PER_PX, MAX_TURN_DEG),
      tilt: clamp(start.from.tilt - (event.clientY - start.y) * DEG_PER_PX, MAX_TILT_DEG),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    if (step === 'reset') reset();
    else turnBy(step);
  };

  return (
    <div
      role="group"
      aria-label={t('product.rotate.label', { title })}
      tabIndex={0}
      data-rotate-viewer
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative h-[min(60dvh,30rem)] w-full cursor-grab touch-none select-none overflow-hidden rounded-card bg-bisque [perspective:900px] active:cursor-grabbing"
    >
      <div
        aria-hidden="true"
        className="absolute bottom-[14%] left-1/2 h-6 w-1/2 rounded-full bg-espresso/25 blur-xl"
        style={{
          transform: `translateX(calc(-50% + ${-angle.turn * 1.2}px)) scaleX(${1 - Math.abs(angle.turn) / 140})`,
        }}
      />
      <img
        src={src}
        alt={title}
        draggable={false}
        data-angle={`${Math.round(angle.turn)},${Math.round(angle.tilt)}`}
        className="absolute inset-[8%] size-[84%] object-contain mix-blend-multiply transition-transform duration-150 ease-out motion-reduce:transition-none"
        style={{
          transform: `rotateX(${angle.tilt}deg) rotateY(${angle.turn}deg)`,
          filter: `brightness(${1 - Math.abs(angle.turn) / 300})`,
        }}
      />
      {!touched && (
        <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-sm font-medium text-espresso">
          <span className="rounded-full bg-sugar/90 px-4 py-2">
            {hasCoarsePointer() ? t('product.rotate.hintTouch') : t('product.rotate.hintMouse')}
          </span>
        </p>
      )}
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
        <ToolButton
          label={t('product.viewer.rotateLeft')}
          onClick={() => turnBy({ turn: -STEP_DEG, tilt: 0 })}
        >
          <RotateCcw className="size-5" aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label={t('product.viewer.rotateRight')}
          onClick={() => turnBy({ turn: STEP_DEG, tilt: 0 })}
        >
          <RotateCw className="size-5" aria-hidden="true" />
        </ToolButton>
        <ToolButton label={t('product.viewer.reset')} onClick={reset}>
          <Undo2 className="size-5" aria-hidden="true" />
        </ToolButton>
      </div>
    </div>
  );
}

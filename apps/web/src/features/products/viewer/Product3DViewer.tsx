import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolButton } from './ToolButton';
import type { ViewerApi } from './ViewerCanvas';
import {
  hasCoarsePointer,
  hintAlreadySeen,
  isWebGLAvailable,
  prefersReducedMotion,
  rememberHintSeen,
} from './webgl';

// three.js, react-three-fiber and drei live in this dynamic chunk only.
const ViewerCanvas = lazy(() => import('./ViewerCanvas'));

interface Product3DViewerProps {
  modelUrl: string;
  posterUrl: string | null;
  title: string;
  /** Called when the model cannot be shown; the gallery then quietly switches to photos. */
  onFallback: () => void;
}

interface BoundaryProps {
  onError: () => void;
  children: ReactNode;
}

class ViewerErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

const HINT_VISIBLE_MS = 4000;
const KEY_ACTIONS: Record<string, (api: ViewerApi) => void> = {
  ArrowLeft: (api) => api.rotate(-1),
  ArrowRight: (api) => api.rotate(1),
  ArrowUp: (api) => api.zoom(1),
  ArrowDown: (api) => api.zoom(-1),
  '+': (api) => api.zoom(1),
  '-': (api) => api.zoom(-1),
  Home: (api) => api.reset(),
};

export function Product3DViewer({ modelUrl, posterUrl, title, onFallback }: Product3DViewerProps) {
  const { t } = useTranslation();
  const apiRef = useRef<ViewerApi | null>(null);
  const [supported] = useState(isWebGLAvailable);
  const [ready, setReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(() => !prefersReducedMotion());
  const [showHint, setShowHint] = useState(() => !hintAlreadySeen());

  useEffect(() => {
    if (!supported) onFallback();
  }, [supported, onFallback]);

  useEffect(() => {
    if (!ready || !showHint) return;
    rememberHintSeen();
    const timer = window.setTimeout(() => setShowHint(false), HINT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [ready, showHint]);

  const handleInteract = useCallback(() => {
    setAutoRotate(false);
    setShowHint(false);
  }, []);
  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => onFallback(), [onFallback]);

  if (!supported) return null;

  const act = (run: (api: ViewerApi) => void) => () => {
    handleInteract();
    if (apiRef.current) run(apiRef.current);
  };

  return (
    <div
      role="group"
      aria-label={t('product.viewer.label')}
      tabIndex={0}
      onKeyDown={(event) => {
        const action = KEY_ACTIONS[event.key];
        if (!action || !apiRef.current) return;
        event.preventDefault();
        handleInteract();
        action(apiRef.current);
      }}
      className="relative h-[min(60dvh,30rem)] w-full select-none overflow-hidden rounded-card bg-sugar"
    >
      {posterUrl && (
        <img
          src={posterUrl}
          alt={title}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${
            ready ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
      <ViewerErrorBoundary onError={handleError}>
        <Suspense fallback={null}>
          <ViewerCanvas
            modelUrl={modelUrl}
            autoRotate={autoRotate}
            apiRef={apiRef}
            onReady={handleReady}
            onInteract={handleInteract}
          />
        </Suspense>
      </ViewerErrorBoundary>

      {!ready && (
        <p
          role="status"
          className="absolute inset-x-0 bottom-3 text-center font-medium text-espresso"
        >
          <span className="rounded-full bg-sugar/90 px-4 py-2">{t('product.viewer.loading')}</span>
        </p>
      )}
      {ready && showHint && (
        <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-sm font-medium text-espresso">
          <span className="rounded-full bg-sugar/90 px-4 py-2">
            {hasCoarsePointer() ? t('product.viewer.hintTouch') : t('product.viewer.hintMouse')}
          </span>
        </p>
      )}

      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
        {ready && (
          <>
            <ToolButton
              label={t('product.viewer.rotateLeft')}
              onClick={act((api) => api.rotate(-1))}
            >
              <RotateCcw className="size-5" aria-hidden="true" />
            </ToolButton>
            <ToolButton
              label={t('product.viewer.rotateRight')}
              onClick={act((api) => api.rotate(1))}
            >
              <RotateCw className="size-5" aria-hidden="true" />
            </ToolButton>
            <ToolButton label={t('product.viewer.zoomOut')} onClick={act((api) => api.zoom(-1))}>
              <ZoomOut className="size-5" aria-hidden="true" />
            </ToolButton>
            <ToolButton label={t('product.viewer.zoomIn')} onClick={act((api) => api.zoom(1))}>
              <ZoomIn className="size-5" aria-hidden="true" />
            </ToolButton>
            <ToolButton label={t('product.viewer.reset')} onClick={act((api) => api.reset())}>
              <Undo2 className="size-5" aria-hidden="true" />
            </ToolButton>
          </>
        )}
      </div>
    </div>
  );
}

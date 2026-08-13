import { useEffect, useMemo, useRef, useState } from 'react';

const FRAME_COUNT = 300;
const PRELOAD_BATCH_SIZE = 12;
const NEARBY_FRAME_RADIUS = 4;

function getFrameSrc(frame: number) {
  const paddedFrame = String(frame).padStart(3, '0');
  return `${import.meta.env.BASE_URL}frames/ezgif-frame-${paddedFrame}.jpg`;
}

function getScrollFrame() {
  const scroller = document.scrollingElement ?? document.documentElement;
  const scrollTop = Math.max(
    window.scrollY,
    scroller.scrollTop,
    document.documentElement.scrollTop,
    document.body.scrollTop,
  );
  const scrollHeight = Math.max(
    scroller.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const scrollableDistance = scrollHeight - viewportHeight;
  const distanceFromBottom = scrollHeight - (scrollTop + viewportHeight);
  const bottomSnapDistance = Math.min(160, viewportHeight * 0.12);
  const progress =
    distanceFromBottom <= bottomSnapDistance
      ? 1
      : scrollableDistance > 0
        ? scrollTop / scrollableDistance
        : 0;

  return Math.min(
    FRAME_COUNT,
    Math.max(1, Math.floor(progress * (FRAME_COUNT - 1)) + 1),
  );
}

export default function ScrollFrameSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const pendingFrameLoadsRef = useRef<Map<number, Promise<HTMLImageElement>>>(new Map());
  const requestedFrameRef = useRef(1);
  const renderedFrameRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const scrollMonitorFrameRef = useRef<number | null>(null);
  const [currentFrame, setCurrentFrame] = useState(1);

  const frameSources = useMemo(
    () => Array.from({ length: FRAME_COUNT }, (_, index) => getFrameSrc(index + 1)),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const drawFrame = (frame: number) => {
      const canvas = canvasRef.current;
      const image = imageCacheRef.current.get(frame);

      if (!canvas || !image?.complete || image.naturalWidth === 0) {
        return false;
      }

      const context = canvas.getContext('2d');

      if (!context) {
        return false;
      }

      const scale = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight,
      );
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      renderedFrameRef.current = frame;
      setCurrentFrame((previousFrame) => (previousFrame === frame ? previousFrame : frame));
      return true;
    };

    const sizeCanvas = () => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(window.innerWidth * pixelRatio);
      const height = Math.round(window.innerHeight * pixelRatio);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      canvas.style.width = '100%';
      canvas.style.height = '100%';
      drawFrame(renderedFrameRef.current || requestedFrameRef.current);
    };

    const loadFrame = (frame: number) => {
      const cachedImage = imageCacheRef.current.get(frame);

      if (cachedImage?.complete && cachedImage.naturalWidth > 0) {
        return Promise.resolve(cachedImage);
      }

      const pendingLoad = pendingFrameLoadsRef.current.get(frame);

      if (pendingLoad) {
        return pendingLoad;
      }

      const image = new Image();
      image.decoding = 'async';
      image.loading = 'eager';

      const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        const finishLoad = () => {
          const decode = typeof image.decode === 'function'
            ? image.decode().catch(() => undefined)
            : Promise.resolve();

          void decode.then(() => {
            imageCacheRef.current.set(frame, image);
            pendingFrameLoadsRef.current.delete(frame);
            resolve(image);
          });
        };

        image.onload = finishLoad;
        image.onerror = () => {
          pendingFrameLoadsRef.current.delete(frame);
          reject(new Error(`Could not load frame ${frame}`));
        };

        if (image.complete && image.naturalWidth > 0) {
          finishLoad();
        }
      });

      image.src = frameSources[frame - 1];
      pendingFrameLoadsRef.current.set(frame, loadPromise);
      return loadPromise;
    };

    const warmNearbyFrames = (frame: number) => {
      const firstFrame = Math.max(1, frame - NEARBY_FRAME_RADIUS);
      const lastFrame = Math.min(FRAME_COUNT, frame + NEARBY_FRAME_RADIUS);

      for (let nearbyFrame = firstFrame; nearbyFrame <= lastFrame; nearbyFrame += 1) {
        void loadFrame(nearbyFrame).catch(() => undefined);
      }
    };

    const requestFrame = (frame: number) => {
      requestedFrameRef.current = frame;
      warmNearbyFrames(frame);

      if (drawFrame(frame)) {
        return;
      }

      void loadFrame(frame)
        .then(() => {
          if (!cancelled && requestedFrameRef.current === frame) {
            drawFrame(frame);
          }
        })
        .catch(() => undefined);
    };

    const updateFrameFromScroll = () => {
      animationFrameRef.current = null;
      requestFrame(getScrollFrame());
    };

    const scheduleFrameUpdate = () => {
      if (animationFrameRef.current !== null) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(updateFrameFromScroll);
    };

    let lastObservedScrollTop = -1;

    const monitorScrollPosition = () => {
      const scroller = document.scrollingElement ?? document.documentElement;
      const scrollTop = Math.max(
        window.scrollY,
        scroller.scrollTop,
        document.documentElement.scrollTop,
        document.body.scrollTop,
      );

      if (scrollTop !== lastObservedScrollTop) {
        lastObservedScrollTop = scrollTop;
        requestFrame(getScrollFrame());
      }

      scrollMonitorFrameRef.current = window.requestAnimationFrame(monitorScrollPosition);
    };

    sizeCanvas();
    requestFrame(1);
    scheduleFrameUpdate();

    let preloadFrame = 1;
    let cancelPreload = () => {};

    const preloadBatch = () => {
      if (cancelled) {
        return;
      }

      const nextFrame = Math.min(preloadFrame + PRELOAD_BATCH_SIZE, FRAME_COUNT + 1);

      for (; preloadFrame < nextFrame; preloadFrame += 1) {
        void loadFrame(preloadFrame).catch(() => undefined);
      }

      if (preloadFrame <= FRAME_COUNT) {
        schedulePreload();
      }
    };

    const schedulePreload = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(preloadBatch, { timeout: 700 });
        cancelPreload = () => window.cancelIdleCallback(handle);
        return;
      }

      const handle = window.setTimeout(preloadBatch, 90);
      cancelPreload = () => window.clearTimeout(handle);
    };

    const resizeObserver = new ResizeObserver(sizeCanvas);
    resizeObserver.observe(document.documentElement);

    window.addEventListener('scroll', scheduleFrameUpdate, { passive: true });
    document.addEventListener('scroll', scheduleFrameUpdate, { passive: true });
    window.addEventListener('resize', sizeCanvas);
    window.visualViewport?.addEventListener('resize', sizeCanvas);
    scrollMonitorFrameRef.current = window.requestAnimationFrame(monitorScrollPosition);
    schedulePreload();

    return () => {
      cancelled = true;
      cancelPreload();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scheduleFrameUpdate);
      document.removeEventListener('scroll', scheduleFrameUpdate);
      window.removeEventListener('resize', sizeCanvas);
      window.visualViewport?.removeEventListener('resize', sizeCanvas);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      if (scrollMonitorFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollMonitorFrameRef.current);
      }

      pendingFrameLoadsRef.current.clear();
      imageCacheRef.current.clear();
    };
  }, [frameSources]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black"
      data-current-frame={currentFrame}
      data-frame-sequence
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/55" />
    </div>
  );
}

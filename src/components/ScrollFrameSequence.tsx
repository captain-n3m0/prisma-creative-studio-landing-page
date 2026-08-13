import { useEffect, useMemo, useRef } from 'react';

const FRAME_COUNT = 300;
const CACHE_LIMIT = 96;
const NEARBY_FRAME_RADIUS = 8;
const MAX_BACKGROUND_LOADS = 4;
const BACKGROUND_LOAD_BATCH_SIZE = 4;
const STARTUP_PRELOAD_STEPS = [50, 25, 10, 5];

type FrameImage = HTMLImageElement | ImageBitmap;

function getFrameSrc(frame: number) {
  const paddedFrame = String(frame).padStart(3, '0');
  return `${import.meta.env.BASE_URL}frames/ezgif-frame-${paddedFrame}.jpg`;
}

function getScrollTop() {
  const scroller = document.scrollingElement ?? document.documentElement;

  return Math.max(
    window.scrollY,
    scroller.scrollTop,
    document.documentElement.scrollTop,
    document.body.scrollTop,
  );
}

function getScrollFrame() {
  const scroller = document.scrollingElement ?? document.documentElement;
  const scrollTop = getScrollTop();
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

function getImageSize(image: FrameImage) {
  if (image instanceof HTMLImageElement) {
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  return {
    width: image.width,
    height: image.height,
  };
}

function closeFrameImage(image: FrameImage) {
  if ('close' in image) {
    image.close();
  }
}

function buildStartupPreloadPlan() {
  const frames = new Set<number>([1, FRAME_COUNT]);

  for (const step of STARTUP_PRELOAD_STEPS) {
    for (let frame = 1; frame <= FRAME_COUNT; frame += step) {
      frames.add(frame);
    }

    frames.add(FRAME_COUNT);
  }

  return Array.from(frames);
}

export default function ScrollFrameSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Map<number, FrameImage>>(new Map());
  const pendingFrameLoadsRef = useRef<Map<number, Promise<FrameImage>>>(new Map());
  const requestedFrameRef = useRef(1);
  const renderedFrameRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const scrollMonitorFrameRef = useRef<number | null>(null);
  const criticalLoadTimeoutRef = useRef<number | null>(null);
  const warmFramesCancelRef = useRef<() => void>(() => {});

  const frameSources = useMemo(
    () => Array.from({ length: FRAME_COUNT }, (_, index) => getFrameSrc(index + 1)),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let lastObservedScrollTop = -1;
    let queuedFrameLoads: number[] = [];
    let queuedFrameSet = new Set<number>();
    let activeBackgroundLoads = 0;
    let queuePumpScheduled = false;
    let cancelQueuePump = () => {};

    const evictOldFrames = () => {
      const cache = imageCacheRef.current;
      const firstProtectedFrame = Math.max(1, requestedFrameRef.current - NEARBY_FRAME_RADIUS);
      const lastProtectedFrame = Math.min(FRAME_COUNT, requestedFrameRef.current + NEARBY_FRAME_RADIUS);

      for (const [frame, image] of cache) {
        if (cache.size <= CACHE_LIMIT) {
          break;
        }

        const isProtectedFrame =
          frame === renderedFrameRef.current ||
          (frame >= firstProtectedFrame && frame <= lastProtectedFrame);

        if (isProtectedFrame) {
          continue;
        }

        cache.delete(frame);
        closeFrameImage(image);
      }
    };

    const rememberFrame = (frame: number, image: FrameImage) => {
      if (cancelled) {
        closeFrameImage(image);
        return;
      }

      const cache = imageCacheRef.current;
      const existingImage = cache.get(frame);

      if (existingImage && existingImage !== image) {
        closeFrameImage(existingImage);
      }

      cache.delete(frame);
      cache.set(frame, image);
      evictOldFrames();
    };

    const loadImageElement = (frame: number) => {
      const image = new Image();
      image.decoding = 'async';
      image.loading = 'eager';

      const loadPromise = new Promise<FrameImage>((resolve, reject) => {
        const finishLoad = () => {
          const decode = typeof image.decode === 'function'
            ? image.decode().catch(() => undefined)
            : Promise.resolve();

          void decode.then(() => {
            rememberFrame(frame, image);
            resolve(image);
          });
        };

        image.onload = finishLoad;
        image.onerror = () => reject(new Error(`Could not load frame ${frame}`));
        image.src = frameSources[frame - 1];

        if (image.complete && image.naturalWidth > 0) {
          finishLoad();
        }
      });

      return loadPromise;
    };

    const loadFrame = (frame: number) => {
      const cachedImage = imageCacheRef.current.get(frame);

      if (cachedImage) {
        imageCacheRef.current.delete(frame);
        imageCacheRef.current.set(frame, cachedImage);
        return Promise.resolve(cachedImage);
      }

      const pendingLoad = pendingFrameLoadsRef.current.get(frame);

      if (pendingLoad) {
        return pendingLoad;
      }

      let loadPromise: Promise<FrameImage>;

      loadPromise = (
        typeof window.createImageBitmap === 'function'
          ? fetch(frameSources[frame - 1], { cache: 'force-cache' })
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`Could not fetch frame ${frame}`);
                }

                return response.blob();
              })
              .then((blob) => window.createImageBitmap(blob))
              .then((image) => {
                rememberFrame(frame, image);
                return image;
              })
              .catch(() => loadImageElement(frame))
          : loadImageElement(frame)
      ).finally(() => {
        if (pendingFrameLoadsRef.current.get(frame) === loadPromise) {
          pendingFrameLoadsRef.current.delete(frame);
        }
      });

      pendingFrameLoadsRef.current.set(frame, loadPromise);
      return loadPromise;
    };

    const drawFrame = (frame: number) => {
      const canvas = canvasRef.current;
      const image = imageCacheRef.current.get(frame);

      if (!canvas || !image) {
        return false;
      }

      const context = canvas.getContext('2d', { alpha: false });

      if (!context) {
        return false;
      }

      const { width: imageWidth, height: imageHeight } = getImageSize(image);

      if (imageWidth === 0 || imageHeight === 0) {
        return false;
      }

      const scale = Math.max(canvas.width / imageWidth, canvas.height / imageHeight);
      const drawWidth = imageWidth * scale;
      const drawHeight = imageHeight * scale;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'medium';
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      renderedFrameRef.current = frame;

      if (containerRef.current) {
        containerRef.current.dataset.currentFrame = String(frame);
      }

      return true;
    };

    const drawNearestLoadedFrame = (frame: number) => {
      let nearestFrame = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const cachedFrame of imageCacheRef.current.keys()) {
        const distance = Math.abs(cachedFrame - frame);

        if (
          distance < nearestDistance ||
          (distance === nearestDistance && cachedFrame > nearestFrame)
        ) {
          nearestFrame = cachedFrame;
          nearestDistance = distance;
        }
      }

      if (nearestFrame === 0 || nearestFrame === renderedFrameRef.current) {
        return false;
      }

      return drawFrame(nearestFrame);
    };

    const sizeCanvas = () => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      drawFrame(renderedFrameRef.current || requestedFrameRef.current);
    };

    const scheduleQueuePump = (urgent = false) => {
      if (queuePumpScheduled) {
        if (!urgent) {
          return;
        }

        cancelQueuePump();
        queuePumpScheduled = false;
      }

      const pumpQueue = () => {
        queuePumpScheduled = false;

        if (cancelled) {
          return;
        }

        let batchCount = 0;

        while (
          activeBackgroundLoads < MAX_BACKGROUND_LOADS &&
          batchCount < BACKGROUND_LOAD_BATCH_SIZE &&
          queuedFrameLoads.length > 0
        ) {
          const frame = queuedFrameLoads.shift();

          if (!frame) {
            continue;
          }

          queuedFrameSet.delete(frame);

          if (imageCacheRef.current.has(frame) || pendingFrameLoadsRef.current.has(frame)) {
            continue;
          }

          activeBackgroundLoads += 1;
          batchCount += 1;

          void loadFrame(frame)
            .then(() => {
              if (cancelled) {
                return;
              }

              const requestedFrame = requestedFrameRef.current;

              if (requestedFrame === frame) {
                drawFrame(frame);
                return;
              }

              if (renderedFrameRef.current !== requestedFrame) {
                drawNearestLoadedFrame(requestedFrame);
              }
            })
            .catch(() => undefined)
            .finally(() => {
              activeBackgroundLoads -= 1;

              if (queuedFrameLoads.length > 0 || activeBackgroundLoads > 0) {
                scheduleQueuePump();
              }
            });
        }

        if (queuedFrameLoads.length > 0) {
          scheduleQueuePump();
        }
      };

      queuePumpScheduled = true;

      if (urgent) {
        const handle = window.setTimeout(pumpQueue, 0);
        cancelQueuePump = () => window.clearTimeout(handle);
        return;
      }

      if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(pumpQueue, { timeout: 180 });
        cancelQueuePump = () => window.cancelIdleCallback(handle);
        return;
      }

      const handle = window.setTimeout(pumpQueue, 48);
      cancelQueuePump = () => window.clearTimeout(handle);
    };

    const queueFrameLoads = (frames: number[], urgent = false) => {
      for (const frame of frames) {
        if (
          frame < 1 ||
          frame > FRAME_COUNT ||
          imageCacheRef.current.has(frame) ||
          pendingFrameLoadsRef.current.has(frame)
        ) {
          continue;
        }

        if (queuedFrameSet.has(frame)) {
          if (urgent) {
            queuedFrameLoads = queuedFrameLoads.filter((queuedFrame) => queuedFrame !== frame);
            queuedFrameLoads.unshift(frame);
          }

          continue;
        }

        if (urgent) {
          queuedFrameLoads.unshift(frame);
        } else {
          queuedFrameLoads.push(frame);
        }

        queuedFrameSet.add(frame);
      }

      if (queuedFrameLoads.length > 0) {
        scheduleQueuePump(urgent);
      }
    };

    const scheduleWarmFrames = (frame: number) => {
      warmFramesCancelRef.current();

      const warmFrames = () => {
        if (cancelled) {
          return;
        }

        const frames: number[] = [];

        for (let offset = 1; offset <= NEARBY_FRAME_RADIUS; offset += 1) {
          const nextFrame = Math.min(FRAME_COUNT, frame + offset);
          const previousFrame = Math.max(1, frame - offset);

          frames.push(nextFrame, previousFrame);
        }

        queueFrameLoads(frames, true);
      };

      if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(warmFrames, { timeout: 450 });
        warmFramesCancelRef.current = () => window.cancelIdleCallback(handle);
        return;
      }

      const handle = window.setTimeout(warmFrames, 120);
      warmFramesCancelRef.current = () => window.clearTimeout(handle);
    };

    const scheduleCriticalFrameLoad = (frame: number) => {
      if (criticalLoadTimeoutRef.current !== null) {
        window.clearTimeout(criticalLoadTimeoutRef.current);
      }

      criticalLoadTimeoutRef.current = window.setTimeout(() => {
        criticalLoadTimeoutRef.current = null;
        const latestFrame = requestedFrameRef.current;

        void loadFrame(latestFrame)
          .then(() => {
            if (!cancelled && requestedFrameRef.current === latestFrame) {
              drawFrame(latestFrame);
              scheduleWarmFrames(latestFrame);
            }
          })
          .catch(() => undefined);
      }, frame === 1 ? 0 : 45);
    };

    const requestFrame = (frame: number) => {
      requestedFrameRef.current = frame;

      if (frame === renderedFrameRef.current) {
        return;
      }

      if (drawFrame(frame)) {
        scheduleWarmFrames(frame);
        return;
      }

      drawNearestLoadedFrame(frame);
      scheduleCriticalFrameLoad(frame);
      scheduleWarmFrames(frame);
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

    const monitorScrollPosition = () => {
      const scrollTop = getScrollTop();

      if (scrollTop !== lastObservedScrollTop) {
        lastObservedScrollTop = scrollTop;
        scheduleFrameUpdate();
      }

      scrollMonitorFrameRef.current = window.requestAnimationFrame(monitorScrollPosition);
    };

    const handleScroll = () => {
      scheduleFrameUpdate();
    };

    sizeCanvas();
    void loadFrame(1)
      .then(() => {
        if (!cancelled) {
          drawFrame(1);
          scheduleWarmFrames(1);
          queueFrameLoads(buildStartupPreloadPlan());
        }
      })
      .catch(() => undefined);
    scheduleFrameUpdate();

    const resizeObserver = new ResizeObserver(sizeCanvas);
    resizeObserver.observe(document.documentElement);

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', sizeCanvas);
    window.visualViewport?.addEventListener('resize', sizeCanvas);
    window.visualViewport?.addEventListener('scroll', handleScroll, { passive: true });
    scrollMonitorFrameRef.current = window.requestAnimationFrame(monitorScrollPosition);

    return () => {
      cancelled = true;
      warmFramesCancelRef.current();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', sizeCanvas);
      window.visualViewport?.removeEventListener('resize', sizeCanvas);
      window.visualViewport?.removeEventListener('scroll', handleScroll);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (scrollMonitorFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollMonitorFrameRef.current);
        scrollMonitorFrameRef.current = null;
      }

      if (criticalLoadTimeoutRef.current !== null) {
        window.clearTimeout(criticalLoadTimeoutRef.current);
        criticalLoadTimeoutRef.current = null;
      }

      pendingFrameLoadsRef.current.clear();
      queuedFrameLoads = [];
      queuedFrameSet = new Set();

      if (queuePumpScheduled) {
        cancelQueuePump();
        queuePumpScheduled = false;
      }

      for (const image of imageCacheRef.current.values()) {
        closeFrameImage(image);
      }

      imageCacheRef.current.clear();
    };
  }, [frameSources]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black"
      data-current-frame="1"
      data-frame-sequence
    >
      <canvas ref={canvasRef} className="scroll-frame-canvas h-full w-full" />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/55" />
    </div>
  );
}

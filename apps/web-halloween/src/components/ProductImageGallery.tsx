"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveImageUrls } from "@/lib/images";

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
}

const ZOOM_LEVEL = 2.5;
const LENS_RATIO = 0.38;
const ZOOM_PANEL_SIZE = 160;

type ImageBounds = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

type LensState = {
  left: number;
  top: number;
  width: number;
  height: number;
  bgX: number;
  bgY: number;
};

function getObjectContainBounds(cw: number, ch: number, nw: number, nh: number): ImageBounds | null {
  if (!nw || !nh || !cw || !ch) return null;
  const scale = Math.min(cw / nw, ch / nh);
  const width = nw * scale;
  const height = nh * scale;
  return {
    offsetX: (cw - width) / 2,
    offsetY: (ch - height) / 2,
    width,
    height,
  };
}

function useDesktopHoverZoom() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [lens, setLens] = useState<LensState | null>(null);
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDesktop = useDesktopHoverZoom();

  const imgs = resolveImageUrls(images);
  const current = imgs[selected] ?? "";

  const updateBounds = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return null;
    return getObjectContainBounds(container.clientWidth, container.clientHeight, img.naturalWidth, img.naturalHeight);
  }, []);

  const clearZoom = useCallback(() => {
    setIsHovering(false);
    setLens(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDesktop) return;

      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img?.naturalWidth) return;

      const bounds = updateBounds();
      if (!bounds) return;
      setImageBounds(bounds);

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const relX = x - bounds.offsetX;
      const relY = y - bounds.offsetY;

      if (relX < 0 || relY < 0 || relX > bounds.width || relY > bounds.height) {
        setLens(null);
        return;
      }

      const lensW = bounds.width * LENS_RATIO;
      const lensH = bounds.height * LENS_RATIO;

      let left = x - lensW / 2;
      let top = y - lensH / 2;
      left = Math.max(bounds.offsetX, Math.min(left, bounds.offsetX + bounds.width - lensW));
      top = Math.max(bounds.offsetY, Math.min(top, bounds.offsetY + bounds.height - lensH));

      const relCenterX = left - bounds.offsetX + lensW / 2;
      const relCenterY = top - bounds.offsetY + lensH / 2;

      setLens({
        left,
        top,
        width: lensW,
        height: lensH,
        bgX: -(relCenterX * ZOOM_LEVEL - ZOOM_PANEL_SIZE / 2),
        bgY: -(relCenterY * ZOOM_LEVEL - ZOOM_PANEL_SIZE / 2),
      });
    },
    [isDesktop, updateBounds]
  );

  const goPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelected((i) => (i <= 0 ? imgs.length - 1 : i - 1));
    },
    [imgs.length]
  );

  const goNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelected((i) => (i >= imgs.length - 1 ? 0 : i + 1));
    },
    [imgs.length]
  );

  useEffect(() => {
    if (!isDesktop) clearZoom();
  }, [isDesktop, clearZoom]);

  useEffect(() => {
    clearZoom();
    setImageBounds(null);
  }, [current, clearZoom]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, goNext, goPrev]);

  if (!current) {
    return (
      <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
        No image
      </div>
    );
  }

  const showZoom = isDesktop && isHovering && lens && imageBounds;

  return (
    <>
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="relative aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 cursor-zoom-in md:cursor-crosshair group"
          onClick={() => setLightbox(true)}
          onMouseEnter={() => isDesktop && setIsHovering(true)}
          onMouseLeave={clearZoom}
          onMouseMove={handleMouseMove}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setLightbox(true)}
          aria-label="Open image zoom"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={current}
            alt={`${alt} — image ${selected + 1} of ${imgs.length}`}
            onLoad={() => setImageBounds(updateBounds())}
            className="w-full h-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02] md:group-hover:scale-100 select-none"
            draggable={false}
          />

          {showZoom && (
            <>
              <div
                className="absolute z-[2] border-2 border-dashed border-nav bg-nav/5 pointer-events-none hidden md:block"
                style={{
                  left: lens.left,
                  top: lens.top,
                  width: lens.width,
                  height: lens.height,
                }}
                aria-hidden
              />
              <div
                className="absolute bottom-3 right-3 z-[3] hidden md:block rounded-lg border-2 border-slate-200 bg-white shadow-lg overflow-hidden pointer-events-none"
                style={{
                  width: ZOOM_PANEL_SIZE,
                  height: ZOOM_PANEL_SIZE,
                  backgroundImage: `url(${current})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${imageBounds.width * ZOOM_LEVEL}px ${imageBounds.height * ZOOM_LEVEL}px`,
                  backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
                }}
                aria-hidden
              />
            </>
          )}

          {imgs.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 shadow-md text-primary font-bold hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity z-[4]"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 shadow-md text-primary font-bold hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity z-[4]"
              >
                ›
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs bg-black/55 text-white px-2.5 py-1 rounded-full z-[4]">
                {selected + 1} / {imgs.length}
              </span>
            </>
          )}

          <span className="absolute bottom-3 right-3 text-[11px] bg-white/90 text-slate-600 px-2 py-0.5 rounded shadow-sm md:hidden">
            Tap to zoom
          </span>
        </div>

        {imgs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {imgs.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                aria-label={`View image ${i + 1}`}
                aria-current={i === selected ? "true" : undefined}
                onClick={() => setSelected(i)}
                className={`shrink-0 w-[4.5rem] h-[4.5rem] rounded-lg overflow-hidden border-2 transition ${
                  i === selected ? "border-nav ring-2 ring-nav/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/92 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product image zoom"
        >
          <button
            type="button"
            aria-label="Close zoom"
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none z-10"
          >
            ×
          </button>

          {imgs.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={goPrev}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white text-2xl hover:bg-white/25"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={goNext}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white text-2xl hover:bg-white/25"
              >
                ›
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {imgs.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto max-w-full px-2">
              {imgs.map((src, i) => (
                <button
                  key={`lb-${src}-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(i);
                  }}
                  className={`shrink-0 w-14 h-14 rounded overflow-hidden border-2 ${
                    i === selected ? "border-white" : "border-white/30 opacity-70"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

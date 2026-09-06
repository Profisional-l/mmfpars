"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DISMISS_PX = 110;

/** Нижняя шторка со свайпом вниз — как у настроек. */
export default function SwipeSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startTs = useRef(0);
  const baseOffset = useRef(0);
  const active = useRef(false);
  const armed = useRef(false);

  const [offset, setOffset] = useState(0);
  const [opened, setOpened] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpened(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, []);

  const finishClose = useCallback(() => {
    setClosing(true);
    setDragging(false);
    active.current = false;
    armed.current = false;
    setOffset((sheetRef.current?.getBoundingClientRect().height ?? 520) + 24);
    window.setTimeout(onClose, 260);
  }, [onClose]);

  const beginDrag = (clientY: number) => {
    if (closing) return;
    active.current = true;
    armed.current = false;
    setDragging(true);
    startY.current = clientY;
    startTs.current = performance.now();
    baseOffset.current = offset;
  };

  const moveDrag = (clientY: number) => {
    if (armed.current && !active.current) {
      const dy = clientY - startY.current;
      if (dy > 8) beginDrag(startY.current);
      else if (dy < -8) armed.current = false;
      else return;
    }
    if (!active.current) return;
    setOffset(Math.max(0, baseOffset.current + (clientY - startY.current)));
  };

  const endDrag = () => {
    armed.current = false;
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    const elapsed = Math.max(1, performance.now() - startTs.current);
    if (offset > DISMISS_PX || offset / elapsed > 0.65) finishClose();
    else setOffset(0);
  };

  const sheetY = !opened ? "100%" : `${offset}px`;
  const backdropOpacity = !opened || closing ? 0 : Math.max(0, 1 - offset / 280);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/50 transition-opacity duration-200"
        style={{ opacity: backdropOpacity }}
        onClick={finishClose}
      />

      <div
        ref={sheetRef}
        className="relative mx-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl border border-b-0 border-[var(--color-line)] bg-[var(--color-canvas)] shadow-[0_-8px_40px_rgba(0,0,0,0.25)] sm:max-w-xl"
        style={{
          maxHeight: "min(92vh, 920px)",
          transform: `translate3d(0, ${sheetY}, 0)`,
          transition: dragging
            ? "none"
            : "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onPointerMove={(event) => moveDrag(event.clientY)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={scrollRef}
          className="sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          onPointerDown={(event) => {
            if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
            armed.current = true;
            startY.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!active.current) return;
            if (offset > 0) event.preventDefault();
            moveDrag(event.clientY);
          }}
        >
          <div
            className="sticky top-0 z-10 flex touch-none cursor-grab flex-col items-center justify-center gap-1.5 px-4 py-2.5 active:cursor-grabbing"
            style={{
              background:
                "color-mix(in srgb, var(--color-canvas) 28%, transparent)",
              backdropFilter: "blur(24px) saturate(1.4)",
              WebkitBackdropFilter: "blur(24px) saturate(1.4)",
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              beginDrag(event.clientY);
            }}
          >
            <span className="h-1 w-9 rounded-full bg-[var(--color-muted)]/50" />
            <h2 className="text-[15px] font-semibold leading-none">{title}</h2>
          </div>

          <div className="px-4 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

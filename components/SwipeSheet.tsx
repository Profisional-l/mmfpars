"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "@/lib/scrollLock";

const DISMISS_DISTANCE = 140;
const DISMISS_VELOCITY = 0.9;
const OPEN_MS = 360;
const CLOSE_MIN_MS = 280;
const CLOSE_MAX_MS = 480;
const SNAP_MS = 320;

function topGapPx(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px)";
  document.body.appendChild(probe);
  const sat = probe.clientHeight || 0;
  probe.remove();
  return Math.max(12, sat);
}

function viewportHeight(): number {
  return Math.round(window.visualViewport?.height ?? window.innerHeight);
}

/** Нижняя шторка: portal в body + высота по visualViewport (PWA/iOS). */
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
  const backdropRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const offsetRef = useRef(0);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastTs = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const armed = useRef(false);
  const closing = useRef(false);
  const opened = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const sync = () => {
      setMaxHeight(Math.max(240, viewportHeight() - topGapPx()));
    };
    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const applyOffset = useCallback((y: number, withTransition: string | null) => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (!sheet) return;

    offsetRef.current = y;
    sheet.style.transition = withTransition ?? "none";
    sheet.style.transform = `translate3d(0, ${y}px, 0)`;

    if (backdrop) {
      const height = sheet.getBoundingClientRect().height || 1;
      const progress = Math.min(1, Math.max(0, y / height));
      backdrop.style.transition = withTransition
        ? `opacity ${withTransition.match(/(\d+)ms/)?.[1] ?? "300"}ms ease-out`
        : "none";
      backdrop.style.opacity = String(0.5 * (1 - progress));
    }
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || maxHeight == null) return;

    const unlock = lockBodyScroll();

    sheet.style.transition = "none";
    sheet.style.transform = "translate3d(0, 100%, 0)";
    if (backdropRef.current) backdropRef.current.style.opacity = "0";

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        opened.current = true;
        sheet.style.transition = `transform ${OPEN_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
        sheet.style.transform = "translate3d(0, 0, 0)";
        if (backdropRef.current) {
          backdropRef.current.style.transition = `opacity ${OPEN_MS}ms ease-out`;
          backdropRef.current.style.opacity = "0.5";
        }
        offsetRef.current = 0;
      });
    });

    return () => {
      cancelAnimationFrame(id);
      unlock();
    };
  }, [maxHeight]);

  const finishClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    dragging.current = false;
    armed.current = false;

    const sheet = sheetRef.current;
    const height = (sheet?.getBoundingClientRect().height ?? 520) + 32;
    const remaining = Math.max(0, height - offsetRef.current);
    const v = Math.abs(velocity.current);
    const duration = Math.round(
      Math.min(
        CLOSE_MAX_MS,
        Math.max(CLOSE_MIN_MS, remaining / Math.max(v, 0.45)),
      ),
    );

    applyOffset(height, `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`);
    window.setTimeout(onClose, duration + 20);
  }, [applyOffset, onClose]);

  const beginDrag = (clientY: number) => {
    if (closing.current || !opened.current) return;
    dragging.current = true;
    armed.current = false;
    startY.current = clientY - offsetRef.current;
    lastY.current = clientY;
    lastTs.current = performance.now();
    velocity.current = 0;
    applyOffset(offsetRef.current, null);
  };

  const moveDrag = (clientY: number) => {
    if (armed.current && !dragging.current) {
      const dy = clientY - lastY.current;
      if (dy > 10) beginDrag(clientY);
      else if (dy < -10) armed.current = false;
      return;
    }
    if (!dragging.current) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastTs.current);
    velocity.current = (clientY - lastY.current) / dt;
    lastY.current = clientY;
    lastTs.current = now;

    let next = clientY - startY.current;
    if (next < 0) next = next * 0.18;
    applyOffset(Math.max(0, next), null);
  };

  const endDrag = () => {
    armed.current = false;
    if (!dragging.current) return;
    dragging.current = false;

    const y = offsetRef.current;
    const fastDown = velocity.current > DISMISS_VELOCITY;
    if (y > DISMISS_DISTANCE || (fastDown && y > 48)) {
      finishClose();
      return;
    }
    applyOffset(0, `transform ${SNAP_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end overscroll-none"
      style={{ touchAction: "none" }}
    >
      <button
        ref={backdropRef}
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black"
        style={{ opacity: 0 }}
        onClick={finishClose}
      />

      <div
        ref={sheetRef}
        className="relative mx-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-t-[var(--radius-sheet)] border border-b-0 border-[var(--color-line)] bg-[var(--color-canvas)] shadow-[0_-8px_40px_rgba(0,0,0,0.25)] sm:max-w-xl will-change-transform"
        style={{
          maxHeight: maxHeight != null ? `${maxHeight}px` : "85dvh",
          transform: "translate3d(0, 100%, 0)",
        }}
        onPointerMove={(event) => moveDrag(event.clientY)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={scrollRef}
          className="sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
          onPointerDown={(event) => {
            if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
            armed.current = true;
            lastY.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragging.current && offsetRef.current > 0) {
              event.preventDefault();
            }
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

          <div className="px-4 pb-8">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

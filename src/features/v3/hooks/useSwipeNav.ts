import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";

function canSwipeTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return true;
  const tag = node.tagName?.toLowerCase?.() ?? "";
  if (tag === "button" || tag === "input" || tag === "textarea" || tag === "select" || tag === "a")
    return false;
  if (node.closest?.("button, a, input, textarea, select, label")) return false;
  return true;
}

export function useSwipeNav(opts: {
  enabled: boolean;
  blocked?: boolean;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const swipeRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    moved: false
  });

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!opts.enabled) return;
    if (opts.blocked) return;
    if (e.pointerType === "mouse") return;
    if (!canSwipeTarget(e.target)) return;
    swipeRef.current.pointerId = e.pointerId;
    swipeRef.current.startX = e.clientX;
    swipeRef.current.startY = e.clientY;
    swipeRef.current.moved = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (swipeRef.current.pointerId !== e.pointerId) return;
    swipeRef.current.moved = true;
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    if (swipeRef.current.pointerId !== e.pointerId) return;
    swipeRef.current.pointerId = null;
    if (!swipeRef.current.moved) return;

    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const isHorizontal = absX >= 38 && absX > absY * 1.2;
    if (!isHorizontal) return;

    if (dx < 0) {
      if (opts.canNext) opts.onNext();
      return;
    }
    if (dx > 0) {
      if (opts.canPrev) opts.onPrev();
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd };
}

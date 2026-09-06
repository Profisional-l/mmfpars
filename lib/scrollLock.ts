/**
 * Блокирует скролл фона без position:fixed на body —
 * fixed у body в iOS PWA даёт пустую полосу снизу под шторкой.
 */
export function lockBodyScroll(): () => void {
  const scrollY = window.scrollY;
  const html = document.documentElement;
  const body = document.body;

  const prev = {
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    htmlBehavior: html.style.scrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
  };

  html.style.scrollBehavior = "auto";
  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";

  const allowInSheet = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest(".sheet-scroll"));

  const onTouchMove = (event: TouchEvent) => {
    if (allowInSheet(event.target)) return;
    event.preventDefault();
  };

  const onWheel = (event: WheelEvent) => {
    if (allowInSheet(event.target)) return;
    event.preventDefault();
  };

  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("wheel", onWheel);

    body.style.overflow = prev.bodyOverflow;
    body.style.overscrollBehavior = prev.bodyOverscroll;
    html.style.overflow = prev.htmlOverflow;
    html.style.overscrollBehavior = prev.htmlOverscroll;

    const still = window.scrollY;
    if (still !== scrollY) window.scrollTo(0, scrollY);
    html.style.scrollBehavior = prev.htmlBehavior;
  };
}

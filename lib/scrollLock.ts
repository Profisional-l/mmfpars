/**
 * Блокирует скролл фона (iOS PWA / Safari).
 * position:fixed сохраняет позицию; touchmove вне .sheet-scroll — на всякий случай.
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
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
  };

  html.style.scrollBehavior = "auto";
  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";

  const onTouchMove = (event: TouchEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      event.preventDefault();
      return;
    }
    // жесты внутри скролла шторки пропускаем
    if (target.closest(".sheet-scroll")) return;
    event.preventDefault();
  };

  document.addEventListener("touchmove", onTouchMove, { passive: false });

  return () => {
    document.removeEventListener("touchmove", onTouchMove);

    body.style.overflow = prev.bodyOverflow;
    body.style.position = prev.bodyPosition;
    body.style.top = prev.bodyTop;
    body.style.left = prev.bodyLeft;
    body.style.right = prev.bodyRight;
    body.style.width = prev.bodyWidth;
    html.style.overflow = prev.htmlOverflow;
    html.style.overscrollBehavior = prev.htmlOverscroll;

    // мгновенно на ту же позицию — без smooth-прыжка
    window.scrollTo(0, scrollY);
    html.style.scrollBehavior = prev.htmlBehavior;
  };
}

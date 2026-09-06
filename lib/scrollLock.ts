/** Блокирует скролл без position:fixed — иначе iOS PWA обрезает низ шторок. */
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
    bodyTouchAction: body.style.touchAction,
  };

  html.style.scrollBehavior = "auto";
  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
  body.style.touchAction = "none";

  return () => {
    html.style.overflow = prev.htmlOverflow;
    html.style.overscrollBehavior = prev.htmlOverscroll;
    body.style.overflow = prev.bodyOverflow;
    body.style.overscrollBehavior = prev.bodyOverscroll;
    body.style.touchAction = prev.bodyTouchAction;
    window.scrollTo(0, scrollY);
    html.style.scrollBehavior = prev.htmlBehavior;
  };
}

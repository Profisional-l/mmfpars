/** Блокирует скролл страницы без рывка при разблокировке (iOS / PWA). */
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
    bodyPaddingTop: body.style.paddingTop,
    bodyPaddingBottom: body.style.paddingBottom,
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
  // убираем safe-area padding — иначе в PWA снизу/сверху появляется полоса
  body.style.paddingTop = "0";
  body.style.paddingBottom = "0";

  return () => {
    body.style.overflow = prev.bodyOverflow;
    body.style.position = prev.bodyPosition;
    body.style.top = prev.bodyTop;
    body.style.left = prev.bodyLeft;
    body.style.right = prev.bodyRight;
    body.style.width = prev.bodyWidth;
    body.style.paddingTop = prev.bodyPaddingTop;
    body.style.paddingBottom = prev.bodyPaddingBottom;
    html.style.overflow = prev.htmlOverflow;
    html.style.overscrollBehavior = prev.htmlOverscroll;

    window.scrollTo(0, scrollY);
    html.style.scrollBehavior = prev.htmlBehavior;
  };
}

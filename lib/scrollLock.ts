/** Блокирует скролл страницы (в т.ч. iOS Safari / PWA). */
export function lockBodyScroll(): () => void {
  const scrollY = window.scrollY;
  const { style } = document.body;
  const prev = {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    overflow: style.overflow,
    width: style.width,
  };

  style.position = "fixed";
  style.top = `-${scrollY}px`;
  style.left = "0";
  style.right = "0";
  style.width = "100%";
  style.overflow = "hidden";

  return () => {
    style.position = prev.position;
    style.top = prev.top;
    style.left = prev.left;
    style.right = prev.right;
    style.width = prev.width;
    style.overflow = prev.overflow;
    window.scrollTo(0, scrollY);
  };
}

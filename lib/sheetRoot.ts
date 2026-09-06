const SHEET_ROOT_ID = "mmf-sheet-root";

/** Поверх всего экрана, вне body — не зависит от scroll-lock стилей body. */
export function getSheetRoot(): HTMLElement {
  let root = document.getElementById(SHEET_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = SHEET_ROOT_ID;
    root.setAttribute("data-mmf-sheet-root", "");
    document.documentElement.appendChild(root);
  }
  return root;
}

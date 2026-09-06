const SHEET_ROOT_ID = "mmf-sheet-root";

/** Корень шторки — sibling body, чтобы position:fixed у body не обрезал низ в iOS PWA. */
export function getSheetRoot(): HTMLElement {
  let root = document.getElementById(SHEET_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = SHEET_ROOT_ID;
    root.style.cssText =
      "position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:100;";
    document.documentElement.appendChild(root);
  }
  return root;
}

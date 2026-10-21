// Brand mark is loaded once and reused. Trademark: see CREDITS.md.
export const mark = new Image();
mark.src = new URL("../../assets/mark.png", import.meta.url).href;
export const markReady = mark.decode().catch(() => {});

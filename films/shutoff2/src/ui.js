// PLACEHOLDER (director's pipeline test) — the UI department replaces this file.
export function createUI(ctx) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const g = c.getContext('2d');
  return {
    ready: document.fonts.ready,
    draw(st) {
      g.clearRect(0, 0, 1080, 1920);
      if (st.set === 'phone' || st.set === 'card') { g.fillStyle = '#0b0d14'; g.fillRect(0, 0, 1080, 1920); }
      g.fillStyle = '#fff'; g.font = '600 64px "PingFang SC"'; g.textAlign = 'center';
      g.fillText(`${st.sid} ${st.shot} · 关不掉`, 540, 960);
      g.font = '400 36px "PingFang SC"'; g.fillText('早上好，林工 ☕', 540, 1040);
      return c;
    },
    screen() { return c; },
  };
}

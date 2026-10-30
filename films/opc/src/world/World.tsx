import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { fontsReady } from "../theme";
import { H, W } from "./camera";
import { engine, WorldState } from "./engine";

// The one WebGL world of the film. It is built once the fonts are in (banner lettering), then rendered
// synchronously inside the layout effect, so the frame is complete before Remotion takes its screenshot.
let ready = false;
export const World: React.FC<{ s: WorldState; blur?: number }> = ({ s, blur = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState(ready);
  const [handle] = useState(() => (ready ? null : delayRender("world fonts")));
  useLayoutEffect(() => {
    if (ready) return;
    fontsReady().then(() => {
      ready = true;
      setOk(true);
      if (handle !== null) continueRender(handle);
    });
  }, [handle]);
  useLayoutEffect(() => {
    if (!ok) return;
    const e = engine();
    const el = ref.current!;
    el.appendChild(e.canvas);
    return () => {
      if (e.canvas.parentElement === el) el.removeChild(e.canvas);
    };
  }, [ok]);
  useLayoutEffect(() => {
    if (ok) engine().render(s);
  });
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px) brightness(${(1 - 0.06 * blur).toFixed(3)})` : undefined,
        transform: blur > 0.05 ? `scale(${(1 + 0.02 * Math.min(1, blur / 6)).toFixed(4)})` : undefined,
      }}
    />
  );
};

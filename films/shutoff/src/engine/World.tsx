import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { engine, H, W } from "./engine";
import "./scenes";

export const useWorldReady = () => {
  const [ok, setOk] = useState(() => engine().isReady);
  const [handle] = useState(() => (engine().isReady ? null : delayRender("world assets", { timeoutInMilliseconds: 200000 })));
  useLayoutEffect(() => {
    if (ok) return;
    engine().ready.then(() => {
      setOk(true);
      if (handle !== null) continueRender(handle);
    });
  }, [ok, handle]);
  return ok;
};

// The one WebGL canvas renders off-DOM; every frame is copied into a plain 2D canvas, which forces the GPU work to
// complete and gives Remotion a finished picture to capture (the WebGL canvas itself was sometimes captured half-drawn).
export const World: React.FC<{ t: number; ready: boolean }> = ({ t, ready }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!ready) return;
    const e = engine();
    e.render(t);
    const ctx = ref.current!.getContext("2d") as CanvasRenderingContext2D;
    ctx.drawImage(e.canvas, 0, 0, W, H);
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

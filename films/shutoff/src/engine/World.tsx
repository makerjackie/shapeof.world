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

// The one WebGL canvas; each frame renders synchronously in a layout effect.
export const World: React.FC<{ t: number; ready: boolean }> = ({ t, ready }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const e = engine();
    ref.current!.appendChild(e.canvas);
    return () => {
      if (e.canvas.parentElement === ref.current) ref.current?.removeChild(e.canvas);
    };
  }, []);
  useLayoutEffect(() => {
    if (ready) engine().render(t);
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { H, W } from "./camera";
import { engine, WorldState } from "./engine";

// True once the DEM, imagery and layers are loaded; components that need terrain heights wait for it.
export const useWorldReady = () => {
  const [ok, setOk] = useState(() => engine().isReady);
  const [handle] = useState(() => (engine().isReady ? null : delayRender("world assets", { timeoutInMilliseconds: 170000 })));
  useLayoutEffect(() => {
    if (ok) return;
    engine().ready.then(() => {
      setOk(true);
      if (handle !== null) continueRender(handle);
    });
  }, [ok, handle]);
  return ok;
};

// The one WebGL world; each frame renders synchronously in a layout effect.
export const World: React.FC<{ s: WorldState | null }> = ({ s }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const e = engine();
    ref.current!.appendChild(e.canvas);
    return () => {
      if (e.canvas.parentElement === ref.current) ref.current?.removeChild(e.canvas);
    };
  }, []);
  useLayoutEffect(() => {
    if (s && engine().isReady) engine().render(s);
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

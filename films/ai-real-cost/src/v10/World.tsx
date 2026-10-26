import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { H, W } from "./camera";
import { engine, MapState } from "./engine";

let loaded = false;

// The one WebGL world of the film. The first frame waits for the night picture; after that every frame renders
// synchronously inside the layout effect, so it is complete before Remotion takes its screenshot.
export const World: React.FC<{ s: MapState }> = ({ s }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [handle] = useState(() => (loaded ? null : delayRender("night map")));
  const done = useRef(false);
  useLayoutEffect(() => {
    const e = engine();
    const el = ref.current!;
    el.appendChild(e.canvas);
    return () => {
      if (e.canvas.parentElement === el) el.removeChild(e.canvas);
    };
  }, []);
  useLayoutEffect(() => {
    if (loaded) {
      engine().render(s);
      return;
    }
    engine().ready.then(() => {
      loaded = true;
      engine().render(s);
      if (handle !== null && !done.current) {
        done.current = true;
        continueRender(handle);
      }
    });
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

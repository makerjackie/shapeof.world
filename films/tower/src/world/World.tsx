import React, { useLayoutEffect, useRef } from "react";
import { H, W } from "../geo/cam";
import { engine, WorldState } from "./engine";

// The one WebGL city of the film. Rendering is synchronous inside the layout effect, so the frame is complete
// before Remotion takes its screenshot.
export const World: React.FC<{ s: WorldState }> = ({ s }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const e = engine();
    const el = ref.current!;
    el.appendChild(e.canvas);
    return () => {
      if (e.canvas.parentElement === el) el.removeChild(e.canvas);
    };
  }, []);
  useLayoutEffect(() => {
    engine().render(s);
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

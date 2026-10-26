import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame } from "remotion";
import { H, W } from "./camera";
import { engine, WorldState } from "./engine";

// The one WebGL world of the film. Rendering is synchronous inside the layout effect, so the frame is complete
// before Remotion takes its screenshot.
export const World: React.FC<{ s: WorldState }> = ({ s }) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const e = engine();
    const el = ref.current!;
    el.appendChild(e.canvas);
    return () => {
      if (e.canvas.parentElement === el) el.removeChild(e.canvas);
    };
  }, []);
  useLayoutEffect(() => {
    engine().render(s, frame);
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

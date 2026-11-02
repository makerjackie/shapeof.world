// The three.js town as a Remotion layer: renders the frame synchronously from film time.
import React, { useLayoutEffect, useRef } from "react";
import { town, W, H } from "./town/engine";

export const TownView: React.FC<{ t: number }> = ({ t }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const c = town().canvas;
    ref.current!.appendChild(c);
    return () => {
      if (c.parentElement === ref.current) ref.current?.removeChild(c);
    };
  }, []);
  useLayoutEffect(() => {
    town().render(t);
  });
  return <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};

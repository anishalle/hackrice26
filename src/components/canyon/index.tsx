"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/session";
import { FRAG, VERT } from "./shader";

/**
 * The hero canvas.
 *
 * Budget discipline, because a raymarcher on a full viewport is not free:
 * the canvas renders at a fraction of device pixels and is scaled up (the
 * dither hides it — that is part of why the look works), the march budget is
 * capped, and the loop stops entirely when the element scrolls out of view or
 * the tab is hidden.
 *
 * It is also capability-aware, which is the point of the app: reduced motion
 * freezes it on a single resolved frame, and a low-vision profile drops the
 * dot matrix and the filter strength so text contrast over it holds up.
 */
export function Canyon({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { adaptation } = useSession();

  // The render loop reads the profile through a ref, so a profile change
  // retunes the shader without tearing down the GL context.
  const settings = useRef({ reduceMotion: false, maxContrast: false });
  useEffect(() => {
    settings.current = {
      reduceMotion: adaptation.reduceMotion,
      maxContrast: adaptation.maxContrast,
    };
  }, [adaptation.reduceMotion, adaptation.maxContrast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext("webgl", { antialias: false, alpha: false, depth: false }) as
        | WebGLRenderingContext
        | null) ?? null;
    if (!gl) return; // the CSS fallback underneath stays visible

    function compile(type: number, src: string) {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uScroll = u("uScroll");
    const uShadow = u("uShadow");
    const uMid = u("uMid");
    const uLight = u("uLight");
    const uSun = u("uSun");
    const uDotScale = u("uDotScale");
    const uDotAmount = u("uDotAmount");
    const uFilter = u("uFilter");
    const uSunY = u("uSunY");
    const uSteps = u("uSteps");

    /** Reads the ramp off CSS custom properties so the theme owns the colour. */
    function rampFromCss() {
      const cs = getComputedStyle(document.documentElement);
      const read = (name: string, fallback: [number, number, number]) => {
        const raw = cs.getPropertyValue(name).trim();
        const m = /^#?([0-9a-f]{6})$/i.exec(raw);
        if (!m) return fallback;
        const n = parseInt(m[1], 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as [
          number,
          number,
          number,
        ];
      };
      return {
        shadow: read("--duo-shadow", [0.004, 0.012, 0.204]),
        mid: read("--duo-mid", [0.451, 0.475, 0.992]),
        light: read("--duo-light", [0.804, 0.98, 1]),
        sun: read("--duo-sun", [1, 0.89, 0.72]),
      };
    }

    let raf = 0;
    let running = true;
    let visible = true;
    let start = performance.now();
    let frozenAt: number | null = null;
    let lastDraw = 0;

    // Device pixel budget. The dither pattern makes upscaling read as grain
    // rather than blur, so a sub-1.0 scale costs very little perceptually.
    function pixelScale() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const wide = window.innerWidth > 1600;
      return Math.min(dpr, wide ? 0.7 : 0.85);
    }

    function resize() {
      const scale = pixelScale();
      const w = Math.max(1, Math.floor(canvas!.clientWidth * scale));
      const h = Math.max(1, Math.floor(canvas!.clientHeight * scale));
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
        gl!.viewport(0, 0, w, h);
      }
    }

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      if (!running || !visible) return;

      const { reduceMotion, maxContrast } = settings.current;

      // ~30fps is plenty for water this slow, and halves GPU cost.
      if (now - lastDraw < 32) return;
      lastDraw = now;

      // Reduced motion resolves one frame and holds it.
      if (reduceMotion) {
        if (frozenAt !== null) return;
        frozenAt = 6.0;
      } else {
        frozenAt = null;
      }

      resize();
      const t = frozenAt ?? (now - start) / 1000;

      const scrollY = window.scrollY || 0;
      const scroll = Math.min(1, scrollY / Math.max(1, window.innerHeight));

      const ramp = rampFromCss();
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, t);
      gl!.uniform1f(uScroll, scroll);
      gl!.uniform3fv(uShadow, ramp.shadow);
      gl!.uniform3fv(uMid, ramp.mid);
      gl!.uniform3fv(uLight, ramp.light);
      gl!.uniform3fv(uSun, ramp.sun);

      // A low-vision profile loses the dot matrix and most of the filter, so
      // the ground stays flat and dark enough for text to hold contrast.
      gl!.uniform1f(uDotScale, maxContrast ? 7.0 : 4.0);
      gl!.uniform1f(uDotAmount, maxContrast ? 0.0 : 0.85);
      gl!.uniform1f(uFilter, maxContrast ? 0.45 : 1.0);
      gl!.uniform1f(uSunY, 0.1);
      gl!.uniform1i(uSteps, window.innerWidth > 1200 ? 96 : 72);

      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    function onVisibility() {
      running = !document.hidden;
      if (running) start = performance.now() - 6000;
    }
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <div className={className} aria-hidden="true">
      {/* Fallback ground. Visible if WebGL is unavailable, and the colour the
          canvas resolves to anyway, so there is never a flash of nothing. */}
      <div className="absolute inset-0 canyon-fallback" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

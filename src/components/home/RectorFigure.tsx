"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// Cut-out of the Rector sitting (transparent background).
const SRC = "/images/rector-sitting.webp";
const W = 1010;
const H = 1780;
/** Room around the photo for the swinging shoes, as a share of its width. Matches .rector-canvas in globals.css. */
const PAD = 0.3;

// Shares of the photo's height and width: where the bend starts and is complete, and each leg's centre line.
const KNEE = 0.56;
const SHIN = 0.74;
const LEGS = [{ cx: 0.19, dir: -1 }, { cx: 0.805, dir: 1 }] as const;
const ROWS = 56;
const COLS = 6;
const PERIOD = 2100;
const DEG = Math.PI / 180;

const VERT = `attribute vec2 pos; attribute vec2 uv; varying vec2 v;
void main() { v = uv; gl_Position = vec4(pos, 0.0, 1.0); }`;
const FRAG = `precision mediump float; uniform sampler2D tex; varying vec2 v;
void main() { gl_FragColor = texture2D(tex, v); }`;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Photo rows: the still body is one band, the legs are fine enough to bend smoothly. */
const ROW_AT = [0, ...Array.from({ length: ROWS + 1 }, (_, r) => KNEE + ((1 - KNEE) * r) / ROWS)];

/** Grid over both halves of the photo; below the thighs the space between the legs is transparent. */
function buildGrid() {
  const uv: number[] = [];
  const index: number[] = [];
  LEGS.forEach((_, leg) => {
    const base = uv.length / 2;
    for (const y of ROW_AT) for (let c = 0; c <= COLS; c++) uv.push((leg + c / COLS) / 2, y);
    for (let r = 0; r < ROW_AT.length - 1; r++)
      for (let c = 0; c < COLS; c++) {
        const a = base + r * (COLS + 1) + c;
        const b = a + COLS + 1;
        index.push(a, a + 1, b, a + 1, b + 1, b);
      }
  });
  return { uv: new Float32Array(uv), index: new Uint16Array(index) };
}

/**
 * Walks down each leg's centre line, turning a little more on every row, so the photo bends like a
 * soft leg: it stays in one piece at the knee in every position. `phase` is in turns.
 */
function pose(out: Float32Array, phase: number) {
  let o = 0;
  LEGS.forEach(({ cx, dir }, leg) => {
    const s = Math.sin(2 * Math.PI * (phase + leg / 2));
    const swing = (2.5 + 5.5 * s) * DEG; // from 3 degrees in to 8 degrees out
    const shorten = 0.03 * (1 + s); // the leg coming forward looks a little shorter
    let x = cx * W;
    let y = 0;
    let prev = 0;
    for (const row of ROW_AT) {
      const w = smooth(KNEE, SHIN, row);
      const angle = swing * w * dir;
      const step = (row - prev) * H * (1 - shorten * w);
      x += Math.sin(angle) * step;
      y += Math.cos(angle) * step;
      prev = row;
      for (let c = 0; c <= COLS; c++) {
        const across = ((leg + c / COLS) / 2 - cx) * W;
        const px = x + Math.cos(angle) * across;
        const py = y - Math.sin(angle) * across;
        out[o++] = ((px + PAD * W) / ((1 + 2 * PAD) * W)) * 2 - 1;
        out[o++] = 1 - (py / H) * 2;
      }
    }
  });
}

function start(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: true });
  if (!gl) return null;
  const program = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const { uv, index } = buildGrid();
  const points = new Float32Array(uv.length);
  const attribute = (name: string, data: Float32Array, usage: number) => {
    const buffer = gl.createBuffer();
    const at = gl.getAttribLocation(program, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  };
  attribute("uv", uv, gl.STATIC_DRAW);
  attribute("pos", points, gl.DYNAMIC_DRAW); // bound last: draw() refills it
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);

  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // No blending: neighbouring triangles share edges and never overlap.

  return (phase: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    pose(points, phase);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, points);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
  };
}

/** The Rector on the plinth, swinging his shins. Without WebGL or with reduced motion it is the still photo. */
export function RectorFigure({ alt }: { alt: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    const img = el?.querySelector("img");
    if (!el || !img || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // A fresh canvas per run: a context cannot be started twice on one element.
    const canvas = document.createElement("canvas");
    canvas.className = "rector-canvas";
    canvas.setAttribute("aria-hidden", "true");
    let frame = 0;
    let stopped = false;
    let visible = false;
    let draw: ((phase: number) => void) | null = null;
    const tick = (now: number) => {
      draw?.((now % PERIOD) / PERIOD);
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible && draw && !frame) frame = requestAnimationFrame(tick);
    });
    const still = () => {
      draw = null;
      el.classList.remove("is-live");
    };
    canvas.addEventListener("webglcontextlost", still);
    img
      .decode()
      .then(() => {
        if (stopped) return;
        el.append(canvas);
        draw = start(canvas, img);
        if (!draw) return canvas.remove();
        draw(0);
        el.classList.add("is-live");
        io.observe(el);
      })
      .catch(() => {}); // the still photo stays
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      canvas.removeEventListener("webglcontextlost", still);
      still();
      canvas.remove();
    };
  }, []);

  return (
    <div ref={box} className="rector-figure">
      <Image src={SRC} alt={alt} width={W} height={H} priority sizes="(max-width: 639px) 210px, 320px" />
    </div>
  );
}

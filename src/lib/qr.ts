import "server-only";
import { encode } from "uqr";

export type Qr = { size: number; path: string };

/** A QR code as one SVG path on a grid of `size` units, quiet zone included. */
export function qrPath(text: string): Qr {
  const { data, size } = encode(text, { ecc: "M", border: 4 });
  const path = data.flatMap((row, y) => row.flatMap((on, x) => (on ? [`M${x} ${y}h1v1h-1z`] : []))).join("");
  return { size, path };
}

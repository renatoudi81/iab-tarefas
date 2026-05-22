/**
 * Overlay sutil de ruído / grain para quebrar a flatness digital.
 *
 * Skill design-taste-frontend §4: "Grain and noise overlays. A fixed,
 * pointer-events-none overlay with subtle noise to break digital flatness."
 *
 * Performance:
 * - fixed inset-0, pointer-events-none, mix-blend-mode multiply
 * - SVG inline (não carrega imagem externa)
 * - GPU-accelerated (não causa repaint em scroll)
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] opacity-[0.025] mix-blend-multiply"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  )
}

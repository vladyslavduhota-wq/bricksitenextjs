// The KSE letterforms from the client's logo and preloader (src/components/preloader-source.ts).
export const KSE_PATHS = [
  "M90 235L90 320L134 320C177 320 178 319 241 235L305 151L353 150L400 150L400 185C400 215 397 220 376 220C360 220 340 236 308 277C284 309 260 341 256 348C251 356 267 385 297 425C335 476 351 489 373 490C398 490 400 493 400 530L400 570L356 570C312 570 311 569 248 487C186 407 183 405 137 402L90 399L90 484L90 570L55 570L20 570L20 360L20 150L55 150L90 150L90 235Z",
  "M820 200L820 260L784 260C757 260 747 255 743 240C738 222 729 220 629 220L520 220L520 270L520 320L648 320C818 320 820 321 820 441C820 572 823 570 610 570L440 570L440 515L440 460L480 460C509 460 520 464 520 475C520 487 539 490 630 490L740 490L740 445L740 400L615 400C495 400 488 399 465 375C443 353 440 343 440 270C440 197 443 187 465 165C489 140 492 140 655 140L820 140L820 200Z",
  "M1250 200L1250 260L1214 260C1187 260 1177 255 1173 240C1168 222 1159 220 1059 220L950 220L950 258C950 310 964 320 1037 320L1100 320L1100 355L1100 390L1041 390C971 390 950 405 950 456L950 490L1060 490C1151 490 1170 487 1170 475C1170 464 1181 460 1210 460L1250 460L1250 515L1250 570L1060 570L870 570L870 487C871 437 876 395 884 380C896 359 896 351 884 328C875 311 870 270 870 220L870 140L1060 140L1250 140L1250 200Z",
];

/** The client's logo: KSE, RECTOR over AUCTION, and the cyan bar. The bar redraws on hover. */
export function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <svg viewBox="10 130 2180 450" role="img" aria-label="KSE Rector Auction" className={`brand-logo h-9 w-auto shrink-0 overflow-visible ${light ? "text-primary-foreground" : "text-primary"}`}>
      <g fill="currentColor">
        {KSE_PATHS.map((d) => <path key={d.slice(0, 12)} d={d} />)}
      </g>
      <text x="1370" y="355" fontSize="170" fontWeight="800" textLength="800" lengthAdjust="spacing" fill={light ? "var(--kse-cyan)" : "currentColor"}>RECTOR</text>
      <text x="1370" y="475" fontSize="120" fontWeight="500" textLength="800" lengthAdjust="spacing" fill="currentColor" opacity={light ? 1 : 0.75}>AUCTION</text>
      <line className="brand-bar" pathLength={1} x1="1370" y1="560" x2="2170" y2="560" stroke="var(--kse-cyan)" strokeWidth="22" strokeLinecap="round" />
    </svg>
  );
}

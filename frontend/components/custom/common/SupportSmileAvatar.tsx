import styles from './SupportSmileAvatar.module.css';

/** Tiny original SVG robot: friendly wave, blinking eyes and smile. CSS-only motion. */
export default function SupportSmileAvatar(){
  return (
    <span aria-hidden="true" className="relative inline-flex size-[54px] items-center justify-center">
      <svg viewBox="0 0 80 80" width="54" height="54" className={styles.float} focusable="false">
        <defs>
          <linearGradient id="niqaha-smile-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fa76b7"/>
            <stop offset="100%" stopColor="#d91579"/>
          </linearGradient>
          <linearGradient id="niqaha-smile-hand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe4f0"/>
            <stop offset="100%" stopColor="#f6a9ce"/>
          </linearGradient>
        </defs>
        <g className={styles.antenna}>
          <path d="M40 12V6" stroke="#ffe5f0" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="40" cy="5" r="3.5" fill="#ffe38a"/>
        </g>
        <rect x="6" y="25" width="12" height="31" rx="6" fill="#f9b5d3" stroke="#fff" strokeWidth="2"/>
        <rect x="62" y="25" width="12" height="31" rx="6" fill="#f9b5d3" stroke="#fff" strokeWidth="2"/>
        <rect x="12" y="12" width="56" height="56" rx="24" fill="url(#niqaha-smile-face)" stroke="#fff" strokeWidth="2.5"/>
        <rect x="19" y="25" width="42" height="31" rx="15" fill="#fff8fc"/>
        <ellipse cx="31" cy="37.5" rx="3.8" ry="4.8" fill="#48243d" className={styles.eye}/>
        <ellipse cx="49" cy="37.5" rx="3.8" ry="4.8" fill="#48243d" className={styles.eye}/>
        <circle cx="25" cy="46" r="4" fill="#f9a6c8" className={styles.cheek}/>
        <circle cx="55" cy="46" r="4" fill="#f9a6c8" className={styles.cheek}/>
        <path d="M31 45.5C35 52.5 45 52.5 49 45.5" stroke="#ac3277" strokeWidth="3" strokeLinecap="round" fill="none" className={styles.smile}/>
        <path d="M28 62Q40 68 52 62" fill="none" stroke="#ffd8eb" strokeWidth="2" strokeLinecap="round"/>
        <g className={styles.hand}>
          <path d="M61 58c4-3 6-7 7-11 .5-1.5 3-1 3 1l-1 5 3-6c1-2 4-1 3 1l-3 8 2-2c2-2 4 0 3 2-4 9-9 14-17 12l-4-4z" fill="url(#niqaha-smile-hand)" stroke="#cb3980" strokeWidth="1.4" strokeLinejoin="round"/>
        </g>
      </svg>
      <svg viewBox="0 0 24 24" width="15" height="15"
        className={`absolute -right-1 top-0 text-amber-300 ${styles.sparkle}`} fill="currentColor" focusable="false">
        <path d="m12 0 2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z"/>
      </svg>
      <svg viewBox="0 0 24 24" width="9" height="9"
        className={`absolute -left-1 bottom-3 text-pink-200 ${styles.sparkle} ${styles.sparkleDelay}`} fill="currentColor" focusable="false">
        <path d="m12 0 2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z"/>
      </svg>
    </span>
  );
}

// Issuer marks for the certification cards. Small, flat, brand-coloured so a
// visitor can tell Microsoft from Databricks at a glance without reading.
// These are simple redraws — swap in an official SVG here if you'd rather.

export function MicrosoftMark(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden focusable="false" {...props}>
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="13" width="10" height="10" fill="#00a4ef" />
      <rect x="13" y="13" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}

// The real mark (pulled from databricks.com's own icon) is a diamond sitting
// over two open chevrons, drawn as one continuous stroke — not three solid
// plates. Filled diamonds stacked with no gap between them was the bug: at
// this icon's actual 21px render size they fuse into a single red lozenge
// with no layer read at all, nothing like the source. A bold rounded stroke
// with real gaps between the three shapes is what survives being that small.
export function DatabricksMark(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="21"
      height="21"
      fill="none"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      <path d="M12 1 20.5 5.3 12 9.6 3.5 5.3Z" stroke="#ff8a4d" />
      <path d="M3.5 11.3 12 15.6 20.5 11.3" stroke="#ff5a2e" />
      <path d="M3.5 17.3 12 21.6 20.5 17.3" stroke="#ff3621" />
    </svg>
  );
}

export const ISSUER_MARK = {
  Microsoft: MicrosoftMark,
  Databricks: DatabricksMark,
};

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

// Three stacked isometric plates — the "lakehouse layers" read, in Databricks red.
export function DatabricksMark(props) {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden focusable="false" {...props}>
      <path d="M12 0.5 20.5 4 12 7.5 3.5 4Z" fill="#ff6b4a" />
      <path d="M12 8.5 20.5 12 12 15.5 3.5 12Z" fill="#ff4a2e" />
      <path d="M12 16.5 20.5 20 12 23.5 3.5 20Z" fill="#ff3621" />
    </svg>
  );
}

export const ISSUER_MARK = {
  Microsoft: MicrosoftMark,
  Databricks: DatabricksMark,
};

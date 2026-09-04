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

// My first pass hand-drew this as three rounded strokes with a colour
// gradient — closer than the original three-diamond version, but still a
// guess: rounded caps read as slightly soft/bubbly at 21px, and the real mark
// isn't multi-tone. This is the actual path, from Simple Icons' Databricks
// entry (simpleicons.org/icons/databricks — CC0, built for exactly this:
// citing a brand by its mark). One filled shape, sharp mitred points, single
// flat brand red — traced independently from Databricks' own favicon and it
// matches. Holds up better small than the stroke version did.
export function DatabricksMark(props) {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden focusable="false" {...props}>
      <path
        fill="#ff3621"
        d="M.95 14.184 12 20.403l9.919-5.55v2.21L12 22.662l-10.484-5.96-.565.308v.77L12 24l11.05-6.218v-4.317l-.515-.309L12 19.118l-9.867-5.653v-2.21L12 16.805l11.05-6.218V6.32l-.515-.308L12 11.974 2.647 6.681 12 1.388l7.76 4.368.668-.411v-.566L12 0 .95 6.27v.72L12 13.207l9.919-5.55v2.26L12 15.52 1.516 9.56l-.565.308Z"
      />
    </svg>
  );
}

export const ISSUER_MARK = {
  Microsoft: MicrosoftMark,
  Databricks: DatabricksMark,
};

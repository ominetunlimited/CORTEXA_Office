import React from 'react';

/* Hand-drawn stroke icon set — 24px grid, currentColor */

type P = { size?: number; className?: string; sw?: number };

function Svg({ size = 18, className, sw = 1.7, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IcGrid = (p: P) => (
  <Svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></Svg>
);
export const IcRegistry = (p: P) => (
  <Svg {...p}><path d="M3.5 6.5h11l3 3v11h-14z" /><path d="M3.5 6.5v-2h8l3 3" /><path d="M7 13h7M7 16.5h5" /></Svg>
);
export const IcEnvelope = (p: P) => (
  <Svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="m4 7 8 6 8-6" /></Svg>
);
export const IcSeal = (p: P) => (
  <Svg {...p}><circle cx="12" cy="10" r="6" /><path d="M12 7v3l2 1.5" /><path d="m8.5 14.8-1.5 5.2 5-2.4 5 2.4-1.5-5.2" /></Svg>
);
export const IcFile = (p: P) => (
  <Svg {...p}><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4" /><path d="M9 12h6M9 15.5h6" /></Svg>
);
export const IcUsers = (p: P) => (
  <Svg {...p}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M15.5 5.9a3 3 0 0 1 0 5.2" /><path d="M17.5 14.9c1.8.7 3 2.3 3 4.6" /></Svg>
);
export const IcCheckSquare = (p: P) => (
  <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="m8.5 12.5 2.5 2.5 5-5.5" /></Svg>
);
export const IcCalendar = (p: P) => (
  <Svg {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="1.8" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M7.5 13.5h3M7.5 17h6" /></Svg>
);
export const IcBook = (p: P) => (
  <Svg {...p}><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15.5H6.5A1.5 1.5 0 0 0 5 20z" /><path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H19" /><path d="M9 7.5h6" /></Svg>
);
export const IcColumns = (p: P) => (
  <Svg {...p}><path d="M4 20.5h16M5.5 20.5V8M10 20.5V8M14 20.5V8M18.5 20.5V8" /><path d="M3.5 8h17L12 3.5z" /></Svg>
);
export const IcChart = (p: P) => (
  <Svg {...p}><path d="M4 4v16h16" /><path d="M8 16v-5M12.5 16V7.5M17 16v-8" /></Svg>
);
export const IcArchive = (p: P) => (
  <Svg {...p}><rect x="3.5" y="4.5" width="17" height="4.5" rx="1" /><path d="M5.5 9v9.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9" /><path d="M9.5 13h5" /></Svg>
);
export const IcShield = (p: P) => (
  <Svg {...p}><path d="M12 3.5 5 6v5.5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 11.5 2.2 2.2L15.5 9" /></Svg>
);
export const IcBell = (p: P) => (
  <Svg {...p}><path d="M6 16.5v-6a6 6 0 1 1 12 0v6l1.5 2.5h-15z" /><path d="M10 21a2.2 2.2 0 0 0 4 0" /></Svg>
);
export const IcSearch = (p: P) => (
  <Svg {...p}><circle cx="10.5" cy="10.5" r="6" /><path d="m15.5 15.5 5 5" /></Svg>
);
export const IcPlus = (p: P) => (<Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>);
export const IcX = (p: P) => (<Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>);
export const IcChevD = (p: P) => (<Svg {...p}><path d="m6 9.5 6 6 6-6" /></Svg>);
export const IcChevL = (p: P) => (<Svg {...p}><path d="M14.5 6 8.5 12l6 6" /></Svg>);
export const IcChevR = (p: P) => (<Svg {...p}><path d="m9.5 6 6 6-6 6" /></Svg>);
export const IcClock = (p: P) => (<Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>);
export const IcAlert = (p: P) => (
  <Svg {...p}><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4M12 16.8v.2" /></Svg>
);
export const IcCheck = (p: P) => (<Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>);
export const IcDownload = (p: P) => (<Svg {...p}><path d="M12 4v11M7.5 11 12 15.5 16.5 11" /><path d="M4.5 19.5h15" /></Svg>);
export const IcUpload = (p: P) => (<Svg {...p}><path d="M12 15V4M7.5 8 12 3.5 16.5 8" /><path d="M4.5 19.5h15" /></Svg>);
export const IcEye = (p: P) => (
  <Svg {...p}><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></Svg>
);
export const IcLink = (p: P) => (
  <Svg {...p}><path d="M10 14a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.5-5.5l-1.5 1.5" /><path d="M14 10a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.5 5.5L12 16.5" /></Svg>
);
export const IcFilter = (p: P) => (<Svg {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Svg>);
export const IcMail = (p: P) => (
  <Svg {...p}><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="m3.5 7 8.5 6 8.5-6" /></Svg>
);
export const IcPin = (p: P) => (
  <Svg {...p}><path d="M12 21s-6.5-5.7-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.3" /></Svg>
);
export const IcSend = (p: P) => (<Svg {...p}><path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-7-3z" /></Svg>);
export const IcPaperclip = (p: P) => (
  <Svg {...p}><path d="m8.5 12.5 6-6a2.5 2.5 0 0 1 3.5 3.5l-7 7a4.5 4.5 0 0 1-6.4-6.4l6.8-6.7" /></Svg>
);
export const IcSpark = (p: P) => (
  <Svg {...p}><path d="M12 3.5c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6Z" /><path d="M18.5 14.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3Z" /><path d="M5.5 15.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5Z" /></Svg>
);
export const IcLogout = (p: P) => (
  <Svg {...p}><path d="M9 4.5H5.5v15H9" /><path d="M15 8.5 19 12l-4 3.5M19 12H9.5" /></Svg>
);
export const IcMenu = (p: P) => (<Svg {...p}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></Svg>);
export const IcEdit = (p: P) => (
  <Svg {...p}><path d="m14.5 5.5 4 4L8 20H4v-4z" /><path d="m12.5 7.5 4 4" /></Svg>
);
export const IcRestore = (p: P) => (
  <Svg {...p}><path d="M4 8.5A8.5 8.5 0 1 1 3.5 13" /><path d="M4 3.5v5h5" /><path d="M12 8v4.5l3 2" /></Svg>
);
export const IcLock = (p: P) => (
  <Svg {...p}><rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" /><path d="M8.5 10.5v-3a3.5 3.5 0 0 1 7 0v3" /><path d="M12 14.5v2" /></Svg>
);
export const IcScan = (p: P) => (
  <Svg {...p}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M3.5 12h17" /></Svg>
);
export const IcStamp = (p: P) => (
  <Svg {...p}><path d="M9.5 10.5c1.2-1.4.6-3.4 0-4.7A2.8 2.8 0 0 1 12 4a2.8 2.8 0 0 1 2.5 1.8c-.6 1.3-1.2 3.3 0 4.7" /><path d="M5.5 15a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1.5h-13z" /><path d="M4.5 20h15" /></Svg>
);
export const IcHistory = (p: P) => (
  <Svg {...p}><path d="M4 8.5A8.5 8.5 0 1 1 3.5 13" /><path d="M4 3.5v5h5" /></Svg>
);
export const IcInbox = (p: P) => (
  <Svg {...p}><path d="M4 13.5 6.5 5h11L20 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" /><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /></Svg>
);
export const IcBranch = (p: P) => (
  <Svg {...p}><circle cx="6.5" cy="6" r="2.2" /><circle cx="6.5" cy="18" r="2.2" /><circle cx="17.5" cy="9" r="2.2" /><path d="M6.5 8.2v7.6M8.6 7.2c4 .8 6.6 1 8.4 1.4" /></Svg>
);
export const IcFlag = (p: P) => (<Svg {...p}><path d="M6 21V4" /><path d="M6 4.5c4-2 8 2 12 0V13c-4 2-8-2-12 0" /></Svg>);
export const IcFingerprint = (p: P) => (
  <Svg {...p}><path d="M7 5.5A8 8 0 0 1 20 11.5c0 2-.2 3.6-.5 5" /><path d="M4.5 9A8 8 0 0 0 4 11.5c0 2.8.6 4.8 1.5 6.5" /><path d="M12 7.5a4 4 0 0 1 4 4c0 2.6-.4 4.8-1 6.5" /><path d="M8 11.5a4 4 0 0 1 .4-1.7M8.5 15c0 1.8-.4 3.3-1 4.5" /><path d="M12 11.5c0 3-.5 5.5-1.5 7.5" /></Svg>
);
export const IcPrinter = (p: P) => (
  <Svg {...p}><path d="M7 8V3.5h10V8" /><rect x="4" y="8" width="16" height="8" rx="1.5" /><path d="M7 13.5h10v7H7z" /><path d="M17 11h.5" /></Svg>
);

/* brand seal */
export function CortexaSeal({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="8" fill="currentColor" opacity="0.14" />
      <circle cx="20" cy="20" r="13.5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.9" />
      <circle cx="20" cy="20" r="10.6" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
      <path d="M25.6 14.8a7.2 7.2 0 1 0 0 10.4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "홈",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke={active ? "#2C2C2C" : "#ACAAA6"} strokeWidth="1.5" strokeLinejoin="round"
          fill={active ? "#2C2C2C" : "none"} fillOpacity={active ? "0.08" : "0"} />
      </svg>
    ),
  },
  {
    href: "/write",
    label: "쓰기",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M14.5 2.5a2.121 2.121 0 013 3L6 17H3v-3L14.5 2.5z"
          stroke={active ? "#2C2C2C" : "#ACAAA6"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "캘린더",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="14" rx="2"
          stroke={active ? "#2C2C2C" : "#ACAAA6"} strokeWidth="1.5" />
        <path d="M2 8h16" stroke={active ? "#2C2C2C" : "#ACAAA6"} strokeWidth="1.5" />
        <path d="M6 2v3M14 2v3" stroke={active ? "#2C2C2C" : "#ACAAA6"} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: "390px", zIndex: 50,
      background: "rgba(250,248,243,0.95)",
      backdropFilter: "blur(16px)",
      borderTop: "1px solid #EBEBEA",
      display: "flex",
    }}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: "3px",
              padding: "10px 0 8px", textDecoration: "none",
              color: active ? "#2C2C2C" : "#ACAAA6",
              transition: "color 0.15s",
            }}
          >
            {tab.icon(active)}
            <span style={{ fontSize: "10px", fontWeight: active ? 600 : 400, letterSpacing: "0.02em" }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

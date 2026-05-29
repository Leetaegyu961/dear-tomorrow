"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateKorean } from "@/lib/date";
import type { Entry } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

export default function EntriesDatePage() {
  const { date } = useParams<{ date: string }>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;
    let mounted = true;
    const init = async () => {
      let session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        await new Promise<void>((resolve) => {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
            if (s) { session = s; subscription.unsubscribe(); resolve(); }
          });
        });
      }
      if (!mounted || !session) return;
      const { data } = await supabase
        .from("entries").select("*").eq("date", date)
        .order("created_at", { ascending: true });
      if (mounted) { setEntries(data ?? []); setLoading(false); }
    };
    init();
    return () => { mounted = false; };
  }, [date]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF8F3" }}>
      <span style={{ color: "#C0BDB8", letterSpacing: "0.1em" }}>···</span>
    </div>
  );

  return (
    <div style={{ background: "#FAF8F3", minHeight: "100vh", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "52px 20px 0" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <Link href="/calendar" style={{ color: "#ACAAA6", fontSize: "13px", textDecoration: "none" }}>← 캘린더</Link>
          <span style={{ color: "#ACAAA6", fontSize: "12px" }}>{formatDateKorean(date)}</span>
        </div>

        <p style={{ fontSize: "13px", color: "#ACAAA6", marginBottom: "16px" }}>
          이 날의 기록 {entries.length}개
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {entries.map((entry) => (
            <Link key={entry.id} href={`/entry/${entry.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#fff", borderRadius: "12px",
                border: "1px solid #EBEBEA",
                borderLeft: `3px solid ${entry.color_hex}`,
                padding: "16px 18px",
                transition: "opacity 0.15s",
              }}
                className="hover:opacity-80"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: entry.color_hex, display: "block" }} />
                  <span style={{ fontSize: "12px", color: "#ACAAA6" }}>{entry.color_name}</span>
                </div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#2C2C2C", lineHeight: "1.5", letterSpacing: "-0.02em", marginBottom: "8px" }}>
                  {entry.diary}
                </p>
                <p style={{ fontSize: "14px", color: "#787570", lineHeight: "1.7", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {entry.letter}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {entries.length === 0 && (
          <p style={{ color: "#ACAAA6", fontSize: "14px", textAlign: "center", marginTop: "40px" }}>기록이 없어요.</p>
        )}

      </div>
      <BottomNav />
    </div>
  );
}

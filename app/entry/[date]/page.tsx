"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateKorean } from "@/lib/date";
import type { Entry } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

export default function EntryPage() {
  const { date } = useParams<{ date: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      const { data } = await supabase.from("entries").select("*").eq("date", date).maybeSingle();
      if (mounted) {
        if (data) setEntry(data);
        else setNotFound(true);
        setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [date]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF8F3" }}>
      <span style={{ color: "#C0BDB8", letterSpacing: "0.1em" }}>···</span>
    </div>
  );

  if (notFound || !entry) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#FAF8F3" }}>
      <p style={{ color: "#ACAAA6", fontSize: "14px", marginBottom: "20px" }}>기록을 찾을 수 없어요.</p>
      <Link href="/calendar" style={{ color: "#2C2C2C", fontSize: "13px" }}>← 캘린더로</Link>
      <BottomNav />
    </div>
  );

  return (
    <div style={{ background: "#FAF8F3", minHeight: "100vh", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "52px 20px 0" }}>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <Link href="/calendar" style={{ color: "#ACAAA6", fontSize: "13px", textDecoration: "none" }}
            className="hover:opacity-60 transition-opacity">
            ← 캘린더
          </Link>
          <span style={{ color: "#ACAAA6", fontSize: "12px" }}>
            {formatDateKorean(entry.date)}
          </span>
        </div>

        {/* 감정 색 배지 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: entry.color_hex, display: "block" }} />
          <span style={{
            background: entry.color_hex + "22", color: "#37352F",
            fontSize: "12px", padding: "3px 10px", borderRadius: "999px",
            border: `1px solid ${entry.color_hex}44`,
          }}>
            {entry.color_name}
          </span>
        </div>

        {/* 한 줄 일기 카드 */}
        <div style={{
          background: "#fff", borderRadius: "12px", border: "1px solid #EBEBEA",
          padding: "20px 18px", marginBottom: "12px",
        }}>
          <p style={{ color: "#ACAAA6", fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", marginBottom: "12px" }}>
            한 줄 일기
          </p>
          <p style={{ color: "#2C2C2C", fontSize: "18px", fontWeight: 600, lineHeight: "1.6", letterSpacing: "-0.02em" }}>
            {entry.diary}
          </p>
        </div>

        {/* 편지 카드 */}
        <div style={{
          background: "#fff", borderRadius: "12px", border: "1px solid #EBEBEA",
          padding: "20px 18px",
          borderLeft: `3px solid ${entry.color_hex}`,
        }}>
          <p style={{ color: "#ACAAA6", fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", marginBottom: "16px" }}>
            내일의 나에게 · 편지
          </p>
          <p style={{ color: "#37352F", fontSize: "16px", lineHeight: "1.9", whiteSpace: "pre-wrap" }}>
            {entry.letter}
          </p>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}

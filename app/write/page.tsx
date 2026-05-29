"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getKSTDateString, formatDateKorean } from "@/lib/date";
import BottomNav from "@/components/BottomNav";

function getNow(): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function WritePage() {
  const [diary, setDiary] = useState("");
  const [letter, setLetter] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(getNow());
  const today = getKSTDateString();

  useEffect(() => {
    const id = setInterval(() => setNow(getNow()), 60000);
    return () => clearInterval(id);
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleSave = async () => {
    if (!diary.trim() || !letter.trim() || saving) return;
    setSaving(true); setError("");

    let session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      await new Promise<void>((resolve) => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
          if (s) { session = s; subscription.unsubscribe(); resolve(); }
        });
      });
    }
    if (!session) { setSaving(false); return; }

    let color_hex = "#CCCCCC";
    let color_name = "회색";
    try {
      const colorRes = await fetch("/api/extract-color", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diary: diary.trim() }),
      });
      if (colorRes.ok) {
        const colorData = await colorRes.json();
        color_hex = colorData.color_hex;
        color_name = colorData.color_name;
      }
    } catch { /* 기본값 유지 */ }

    const { error: e } = await supabase.from("entries").insert({
      user_id: session.user.id, date: today,
      diary: diary.trim(), letter: letter.trim(),
      color_hex, color_name,
    });

    setSaving(false);
    if (e) {
      setError("저장 중 오류가 발생했어요.");
    } else {
      setSaved(true);
      setDiary("");
      setLetter("");
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const canSave = diary.trim().length > 0 && letter.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>

      {/* 상단 바 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid #F0EFEE", flexShrink: 0 }}>
        <Link href="/" style={{ color: "#9B7654", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}>← 홈</Link>
        <span style={{ color: "#787570", fontSize: "13px", fontWeight: 500 }}>{formatDateKorean(today)}</span>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            background: "none", border: "none", cursor: canSave ? "pointer" : "default",
            color: saved ? "#4CAF82" : canSave ? "#9B7654" : "#D0CCC7",
            fontSize: "15px", fontWeight: 700, fontFamily: "inherit",
            transition: "color 0.2s", padding: 0,
          }}
        >
          {saving ? "···" : saved ? "보냈어요 ✓" : "보내기"}
        </button>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, maxWidth: "560px", width: "100%", margin: "0 auto", padding: "28px 24px 0", display: "flex", flexDirection: "column" }}>

        <div style={{ marginBottom: "28px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#C0BDB8", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
            한 줄 일기
          </span>
          <textarea
            value={diary}
            onChange={(e) => { setDiary(e.target.value); autoResize(e.target); }}
            maxLength={200}
            placeholder="오늘 하루를 한 줄로"
            rows={2}
            style={{
              width: "100%", resize: "none", background: "none", border: "none", outline: "none",
              fontSize: "24px", fontWeight: 700, color: "#1C1B18", lineHeight: "1.4",
              letterSpacing: "-0.03em", fontFamily: "inherit",
            }}
            className="placeholder:text-[#CCCAC5]"
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <span style={{ fontSize: "11px", color: diary.length > 180 ? "#C17A4E" : "#D0CCC7", fontVariantNumeric: "tabular-nums" }}>
              {diary.length}/200
            </span>
          </div>
        </div>

        <div style={{ height: "1px", background: "#F0EFEE", marginBottom: "28px" }} />

        <div style={{ flex: 1 }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#C0BDB8", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
            내일의 나에게
          </span>
          <textarea
            value={letter}
            onChange={(e) => { setLetter(e.target.value); autoResize(e.target); }}
            maxLength={1000}
            placeholder="내일의 너에게 하고 싶은 말을 적어보세요"
            rows={10}
            style={{
              width: "100%", resize: "none", background: "none", border: "none", outline: "none",
              fontSize: "17px", color: "#37352F", lineHeight: "1.85",
              letterSpacing: "-0.01em", fontFamily: "inherit",
            }}
            className="placeholder:text-[#CCCAC5]"
          />
        </div>

      </div>

      {/* 하단 상태 바 */}
      <div style={{
        borderTop: "1px solid #F0EFEE", padding: "10px 24px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#FAFAF9", flexShrink: 0,
      }}>
        <span style={{ fontSize: "12px", color: "#B8B5AF" }}>🕐 {now} KST</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {error && <span style={{ fontSize: "12px", color: "#C17A4E" }}>{error}</span>}
          <span style={{ fontSize: "12px", color: "#B8B5AF", fontVariantNumeric: "tabular-nums" }}>
            {diary.length + letter.length}자
          </span>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

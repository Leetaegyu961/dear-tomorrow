"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getKSTDateString, formatDateKorean } from "@/lib/date";
import type { Entry } from "@/lib/types";

function getNow(): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function WritePage() {
  const [diary, setDiary] = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayEntry, setTodayEntry] = useState<Entry | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(getNow());
  const letterRef = useRef<HTMLTextAreaElement>(null);
  const today = getKSTDateString();

  // 현재 시간 매 분 갱신
  useEffect(() => {
    const id = setInterval(() => setNow(getNow()), 60000);
    return () => clearInterval(id);
  }, []);

  // textarea 높이 자동 조절
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => {
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
      const { data } = await supabase.from("entries").select("*").eq("date", today).maybeSingle();
      if (mounted) { setTodayEntry(data); setLoading(false); }
    };
    init();
    return () => { mounted = false; };
  }, [today]);

  const handleSave = async () => {
    if (!diary.trim() || !letter.trim() || saving) return;
    setSaving(true); setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    // Gemini로 감정 색 추출 (실패해도 기본값으로 저장 진행)
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
    } catch {
      // 기본값 유지
    }

    const { error: e } = await supabase.from("entries").insert({
      user_id: session.user.id, date: today,
      diary: diary.trim(), letter: letter.trim(),
      color_hex, color_name,
    });
    setSaving(false);
    if (e) setError("저장 중 오류가 발생했어요.");
    else setDone(true);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <span style={{ color: "#C0BDB8", letterSpacing: "0.1em" }}>···</span>
    </div>
  );

  /* ── 완료 ── */
  if (done) return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px", textAlign: "center" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M5 11l4.5 4.5L17 7" stroke="#9B7654" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p style={{ fontSize: "20px", fontWeight: 700, color: "#1C1B18", letterSpacing: "-0.03em", marginBottom: "8px" }}>잘 보냈어요.</p>
      <p style={{ fontSize: "14px", color: "#787570", lineHeight: "1.7", marginBottom: "36px" }}>내일 아침, 어제의 내가 편지를 들고 올 거예요.</p>
      <Link href="/" style={{ fontSize: "15px", color: "#9B7654", fontWeight: 600, textDecoration: "none" }}>홈으로 →</Link>
    </div>
  );

  /* ── 오늘 이미 작성 ── */
  if (todayEntry) return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid #F0EFEE" }}>
        <Link href="/" style={{ color: "#9B7654", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}>← 홈</Link>
        <span style={{ color: "#B8B5AF", fontSize: "13px" }}>{formatDateKorean(today)}</span>
        <span style={{ width: "40px" }} />
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#B8B5AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>오늘의 한 줄</span>
          <p style={{ fontSize: "22px", fontWeight: 700, color: "#1C1B18", lineHeight: "1.4", letterSpacing: "-0.03em", marginTop: "10px" }}>{todayEntry.diary}</p>
        </div>
        <div style={{ height: "1px", background: "#F0EFEE", marginBottom: "32px" }} />
        <div>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#B8B5AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>내일의 나에게</span>
          <p style={{ fontSize: "16px", color: "#37352F", lineHeight: "1.85", marginTop: "10px", whiteSpace: "pre-wrap" }}>{todayEntry.letter}</p>
        </div>
        <div style={{ marginTop: "40px", padding: "14px 16px", borderRadius: "10px", background: "#F7F6F3", border: "1px solid #EBEBEA" }}>
          <p style={{ color: "#B8B5AF", fontSize: "13px", textAlign: "center" }}>오늘은 이미 썼어요. 보낸 편지는 바꿀 수 없어요.</p>
        </div>
      </div>
    </div>
  );

  const canSave = diary.trim().length > 0 && letter.trim().length > 0;

  /* ── 쓰기 폼 ── */
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
            color: canSave ? "#9B7654" : "#D0CCC7",
            fontSize: "15px", fontWeight: 700, fontFamily: "inherit",
            transition: "color 0.15s", padding: 0,
          }}
        >
          {saving ? "···" : "보내기"}
        </button>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, maxWidth: "560px", width: "100%", margin: "0 auto", padding: "28px 24px 0", display: "flex", flexDirection: "column", gap: "0" }}>

        {/* 한 줄 일기 — 타이틀 스타일 */}
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

        {/* 구분선 */}
        <div style={{ height: "1px", background: "#F0EFEE", marginBottom: "28px" }} />

        {/* 내일의 나에게 — 본문 스타일 */}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#C0BDB8", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
            내일의 나에게
          </span>
          <textarea
            ref={letterRef}
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

    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getKSTDateString, getYesterdayKSTString } from "@/lib/date";
import type { Entry } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

/* ── 유틸 ── */
function getGreeting(): string {
  const h = new Date(Date.now() + 9 * 3600 * 1000).getUTCHours();
  if (h >= 5 && h < 12) return "좋은 아침이에요.";
  if (h >= 12 && h < 18) return "안녕하세요.";
  if (h >= 18 && h < 22) return "좋은 저녁이에요.";
  return "늦은 밤이네요.";
}

function getWeekDays(today: string): string[] {
  const d = new Date(today);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const c = new Date(mon);
    c.setDate(mon.getDate() + i);
    return c.toISOString().split("T")[0];
  });
}

const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function calcStreak(dates: string[], today: string): number {
  const s = new Set(dates);
  let n = 0;
  let cur = s.has(today) ? today : (() => {
    const d = new Date(today); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0];
  })();
  while (s.has(cur)) {
    n++;
    const d = new Date(cur); d.setDate(d.getDate() - 1);
    cur = d.toISOString().split("T")[0];
  }
  return n;
}

/* ── 메인 ── */
export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [yesterdayEntry, setYesterdayEntry] = useState<Entry | null>(null);
  const [wroteToday, setWroteToday] = useState(false);
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [firstDate, setFirstDate] = useState<string | null>(null);
  const [weekEntries, setWeekEntries] = useState<Record<string, Entry>>({});
  const [letterOpen, setLetterOpen] = useState(false);
  const today = getKSTDateString();
  const yesterday = getYesterdayKSTString();
  const weekDays = getWeekDays(today);

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

      const since60 = new Date(today);
      since60.setDate(since60.getDate() - 60);

      const [{ data: recent }, { count }] = await Promise.all([
        supabase.from("entries").select("*").gte("date", since60.toISOString().split("T")[0]).order("date", { ascending: false }),
        supabase.from("entries").select("*", { count: "exact", head: true }),
      ]);

      if (!mounted) return;
      const list: Entry[] = recent ?? [];
      const todayEntry = list.find((e) => e.date === today);
      const thisMonth = today.slice(0, 7);
      const weekMap: Record<string, Entry> = {};
      list.forEach((e) => { if (weekDays.includes(e.date)) weekMap[e.date] = e; });

      // 첫 기록 날짜 별도 조회
      const { data: firstEntry } = await supabase
        .from("entries").select("date").order("date", { ascending: true }).limit(1).maybeSingle();

      if (!mounted) return;
      setWroteToday(!!todayEntry);
      setYesterdayEntry(list.find((e) => e.date === yesterday) ?? null);
      setRecentEntries(list.slice(0, 8));
      setTotalCount(count ?? 0);
      setMonthCount(list.filter((e) => e.date.startsWith(thisMonth)).length);
      setStreak(calcStreak(list.map((e) => e.date), today));
      setFirstDate(firstEntry?.date ?? null);
      setWeekEntries(weekMap);
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, yesterday]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#C0BDB8", letterSpacing: "0.1em" }}>···</span>
    </div>
  );

  const [y, m, d] = today.split("-");
  const dateLabel = `${y}년 ${Number(m)}월 ${Number(d)}일`;

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh", paddingBottom: "88px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "52px 20px 0" }}>

        {/* ── 날짜 + 메뉴 ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <span style={{ fontSize: "12px", color: "#B8B5AF", fontWeight: 500 }}>{dateLabel}</span>
          <Link href="/calendar" style={{ fontSize: "12px", color: "#B8B5AF", textDecoration: "none" }}>캘린더 ›</Link>
        </div>

        {/* ── 인사말 ── */}
        <h1 style={{ fontSize: "34px", fontWeight: 800, color: "#1C1B18", letterSpacing: "-0.04em", lineHeight: 1.2, marginBottom: "6px" }}>
          {getGreeting()}
        </h1>
        <p style={{ fontSize: "14px", color: "#9B9690", marginBottom: "28px", lineHeight: 1.5 }}>
          {yesterdayEntry
            ? "어제의 편지가 도착했어요."
            : totalCount === 0
            ? "오늘 첫 기록을 남겨볼까요?"
            : "오늘도 하루를 기록해볼까요?"}
        </p>

        {/* ── 주간 스트립 ── */}
        <div style={{
          background: "#fff", borderRadius: "14px", border: "1px solid #EBEBEA",
          padding: "16px 18px", marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#B8B5AF", letterSpacing: "0.08em" }}>이번 주</span>
            <span style={{ fontSize: "11px", color: "#B8B5AF" }}>{monthCount}일 기록</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {weekDays.map((day, i) => {
              const entry = weekEntries[day];
              const isToday = day === today;
              const isFuture = day > today;
              return (
                <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "10px", color: isToday ? "#1C1B18" : "#C0BDB8", fontWeight: isToday ? 700 : 400 }}>
                    {WEEK_LABELS[i]}
                  </span>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: entry ? entry.color_hex : isFuture ? "transparent" : "#F3F2F0",
                    border: isToday ? "2px solid #1C1B18" : entry ? "none" : "1.5px solid #E8E5E0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  }}>
                    {!entry && !isFuture && (
                      <span style={{ fontSize: "10px", color: "#C8C5C0", fontWeight: 500 }}>
                        {Number(day.slice(8))}
                      </span>
                    )}
                    {entry && (
                      <span style={{ fontSize: "10px", color: "#fff", fontWeight: 600, opacity: 0.85 }}>
                        {Number(day.slice(8))}
                      </span>
                    )}
                    {isFuture && (
                      <span style={{ fontSize: "10px", color: "#E0DDD8" }}>
                        {Number(day.slice(8))}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 어제 편지 카드 ── */}
        {yesterdayEntry && (
          <div style={{
            background: "#fff", borderRadius: "14px", border: "1px solid #EBEBEA",
            overflow: "hidden", marginBottom: "16px",
          }}>
            <div style={{
              padding: "16px 18px 14px",
              borderLeft: `4px solid ${yesterdayEntry.color_hex}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: yesterdayEntry.color_hex, display: "block", flexShrink: 0 }} />
                <span style={{ fontSize: "11px", color: "#B8B5AF", fontWeight: 500 }}>
                  어제의 편지 · {yesterdayEntry.color_name}
                </span>
              </div>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "#1C1B18", lineHeight: "1.5", letterSpacing: "-0.02em" }}>
                {yesterdayEntry.diary}
              </p>
            </div>
            <button
              onClick={() => setLetterOpen(v => !v)}
              style={{
                width: "100%", background: letterOpen ? "#FAFAF8" : "none",
                border: "none", borderTop: "1px solid #F5F4F1",
                cursor: "pointer", padding: "11px 18px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: "13px", color: "#787570", fontWeight: 500 }}>편지 읽기</span>
              <span style={{ color: "#C0BDB8", fontSize: "16px", display: "inline-block", transform: letterOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
            </button>
            {letterOpen && (
              <div style={{ padding: "16px 18px 20px", background: "#FAFAF8" }}>
                <p style={{ fontSize: "15px", color: "#37352F", lineHeight: "1.85", whiteSpace: "pre-wrap" }}>
                  {yesterdayEntry.letter}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 통계 카드 ── */}
        <div style={{
          background: "#2C2A27", borderRadius: "14px",
          padding: "20px 20px", marginBottom: "16px",
          display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
          gap: "0", alignItems: "center",
        }}>
          <StatItem label="총 기록" value={String(totalCount)} unit="일" light />
          <div style={{ height: "32px", background: "#3E3C39", width: "1px", margin: "0 auto" }} />
          <StatItem label="연속 작성" value={streak > 0 ? String(streak) : "-"} unit={streak > 0 ? "일" : ""} light />
          <div style={{ height: "32px", background: "#3E3C39", width: "1px", margin: "0 auto" }} />
          <StatItem label="이번 달" value={String(monthCount)} unit="일" light />
        </div>

        {/* ── CTA ── */}
        {wroteToday ? (
          <div style={{
            background: "#fff", borderRadius: "14px", border: "1px solid #EBEBEA",
            padding: "16px 18px", marginBottom: "16px",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#F0EFEC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7l3 3 5-6" stroke="#9B9690" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#1C1B18", marginBottom: "2px" }}>오늘은 이미 썼어요.</p>
              <p style={{ fontSize: "12px", color: "#B8B5AF" }}>내일 아침, 편지가 도착할 거예요.</p>
            </div>
          </div>
        ) : (
          <Link
            href="/write"
            className="block transition-transform active:scale-95"
            style={{
              background: "#1C1B18", color: "#FAF9F6",
              borderRadius: "14px", padding: "18px 20px",
              fontSize: "15px", fontWeight: 700, letterSpacing: "-0.02em",
              textDecoration: "none", textAlign: "center",
              marginBottom: "16px",
            }}
          >
            오늘 하루 기록하기 →
          </Link>
        )}

        {/* ── 최근 기록 ── */}
        {recentEntries.length > 0 && (
          <div style={{
            background: "#fff", borderRadius: "14px", border: "1px solid #EBEBEA",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 18px", borderBottom: "1px solid #F5F4F1",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#9B9690", letterSpacing: "0.05em" }}>최근 기록</span>
              {firstDate && (
                <span style={{ fontSize: "11px", color: "#C0BDB8" }}>
                  {firstDate.slice(0, 7).replace("-", "년 ")}월부터
                </span>
              )}
            </div>
            {recentEntries.map((entry, i) => (
              <Link key={entry.id} href={`/entry/${entry.date}`} style={{ textDecoration: "none" }}>
                <div style={{
                  padding: "11px 18px",
                  borderBottom: i < recentEntries.length - 1 ? "1px solid #F7F6F4" : "none",
                  display: "flex", alignItems: "center", gap: "11px",
                  background: "#fff", transition: "background 0.1s",
                }}
                  className="hover:bg-stone-50"
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: entry.color_hex, display: "block", flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: "14px", color: "#37352F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: "1.4" }}>
                    {entry.diary}
                  </p>
                  <span style={{ fontSize: "11px", color: "#C0BDB8", flexShrink: 0 }}>
                    {entry.date.slice(5).replace("-", "/")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 기록 없을 때 */}
        {recentEntries.length === 0 && (
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #EBEBEA", padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#C0BDB8", marginBottom: "6px" }}>아직 기록이 없어요.</p>
            <p style={{ fontSize: "12px", color: "#D0CCC7" }}>오늘 첫 편지를 써볼까요?</p>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}

function StatItem({ label, value, unit, light }: { label: string; value: string; unit: string; light?: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "0 8px" }}>
      <p style={{ fontSize: "10px", fontWeight: 500, color: light ? "#787570" : "#ACAAA6", letterSpacing: "0.06em", marginBottom: "6px" }}>
        {label}
      </p>
      <p style={{ fontSize: "24px", fontWeight: 800, color: light ? "#FAF9F6" : "#1C1B18", letterSpacing: "-0.04em", lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: "13px", fontWeight: 500, marginLeft: "2px", color: light ? "#787570" : "#9B9690" }}>{unit}</span>
      </p>
    </div>
  );
}

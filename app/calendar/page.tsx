"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getKSTDateString } from "@/lib/date";
import type { Entry } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const today = getKSTDateString();
  const [yearMonth, setYearMonth] = useState(today.slice(0, 7));
  const [entriesByDate, setEntriesByDate] = useState<Record<string, Entry[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      let session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        await new Promise<void>((resolve) => {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
            if (s) { session = s; subscription.unsubscribe(); resolve(); }
          });
        });
      }
      if (!mounted || !session) return;

      const [year, month] = yearMonth.split("-");
      const from = `${yearMonth}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const to = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

      const { data } = await supabase
        .from("entries").select("*").gte("date", from).lte("date", to)
        .order("created_at", { ascending: true });

      if (mounted) {
        const map: Record<string, Entry[]> = {};
        (data ?? []).forEach((e: Entry) => {
          if (!map[e.date]) map[e.date] = [];
          map[e.date].push(e);
        });
        setEntriesByDate(map);
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [yearMonth]);

  const moveMonth = (delta: number) => {
    const [y, m] = yearMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleDayClick = (day: string) => {
    const dayEntries = entriesByDate[day];
    if (!dayEntries || dayEntries.length === 0) return;
    if (dayEntries.length === 1) {
      router.push(`/entry/${dayEntries[0].id}`);
    } else {
      router.push(`/entries/${day}`);
    }
  };

  const calendarDays = buildCalendar(yearMonth);
  const [year, month] = yearMonth.split("-");
  const entryDayCount = Object.keys(entriesByDate).length;
  const totalEntryCount = Object.values(entriesByDate).reduce((s, arr) => s + arr.length, 0);
  const lastDay = new Date(Number(year), Number(month), 0).getDate();

  return (
    <div style={{ background: "#FAF8F3", minHeight: "100vh", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "52px 20px 0" }}>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
          <span style={{ color: "#2C2C2C", fontSize: "15px", fontWeight: 700, letterSpacing: "-0.03em" }}>기록</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button onClick={() => moveMonth(-1)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#ACAAA6", padding: "4px 8px", fontFamily: "inherit", fontSize: "16px" }}>‹</button>
            <span style={{ color: "#2C2C2C", fontSize: "14px", fontWeight: 600, minWidth: "80px", textAlign: "center" }}>
              {year}년 {Number(month)}월
            </span>
            <button onClick={() => moveMonth(1)}
              disabled={yearMonth >= today.slice(0, 7)}
              style={{
                background: "none", border: "none", padding: "4px 8px", fontFamily: "inherit", fontSize: "16px",
                color: yearMonth >= today.slice(0, 7) ? "#DDD9D2" : "#ACAAA6",
                cursor: yearMonth >= today.slice(0, 7) ? "default" : "pointer",
              }}>›</button>
          </div>
        </div>

        {/* 월 통계 배너 */}
        <div style={{
          background: "#fff", borderRadius: "12px", border: "1px solid #EBEBEA",
          padding: "14px 18px", marginBottom: "16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ color: "#ACAAA6", fontSize: "11px", fontWeight: 500, letterSpacing: "0.05em", marginBottom: "4px" }}>이번 달 기록</p>
            <p style={{ color: "#2C2C2C", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {totalEntryCount}
              <span style={{ fontSize: "13px", fontWeight: 400, color: "#ACAAA6", marginLeft: "4px" }}>
                개 · {entryDayCount}/{lastDay}일
              </span>
            </p>
          </div>
          {totalEntryCount > 0 && (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "120px", justifyContent: "flex-end" }}>
              {Object.values(entriesByDate).flat().slice(0, 7).map((e) => (
                <span key={e.id} style={{ width: "8px", height: "8px", borderRadius: "50%", background: e.color_hex, display: "block" }} />
              ))}
            </div>
          )}
        </div>

        {/* 캘린더 카드 */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #EBEBEA", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "8px" }}>
            {DAY_LABELS.map((d) => (
              <div key={d} style={{ textAlign: "center", color: "#ACAAA6", fontSize: "11px", fontWeight: 500, padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#C0BDB8", fontSize: "13px" }}>···</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const dayEntries = entriesByDate[day] ?? [];
                const hasEntry = dayEntries.length > 0;
                const firstEntry = dayEntries[0];
                const isToday = day === today;
                const isFuture = day > today;
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    disabled={!hasEntry}
                    style={{
                      aspectRatio: "1", borderRadius: "8px",
                      border: isToday ? "1.5px solid #2C2C2C" : "1px solid transparent",
                      background: firstEntry ? firstEntry.color_hex + "33" : "transparent",
                      cursor: hasEntry ? "pointer" : "default",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: "2px",
                      transition: "opacity 0.15s", fontFamily: "inherit", padding: 0,
                      position: "relative",
                    }}
                    className={hasEntry ? "hover:opacity-70" : ""}
                  >
                    <span style={{
                      fontSize: "12px", fontWeight: isToday ? 700 : 400,
                      color: isFuture ? "#DDD9D2" : hasEntry ? "#2C2C2C" : "#C0BDB8",
                    }}>
                      {Number(day.slice(8))}
                    </span>
                    {hasEntry && (
                      <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                        {dayEntries.slice(0, 3).map((e) => (
                          <span key={e.id} style={{ width: "4px", height: "4px", borderRadius: "50%", background: e.color_hex, display: "block" }} />
                        ))}
                      </div>
                    )}
                    {dayEntries.length > 1 && (
                      <span style={{
                        position: "absolute", top: "2px", right: "3px",
                        fontSize: "8px", fontWeight: 700, color: firstEntry.color_hex,
                        lineHeight: 1,
                      }}>
                        {dayEntries.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 색상 범례 */}
        {!loading && totalEntryCount > 0 && (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #EBEBEA", padding: "14px 18px" }}>
            <p style={{ color: "#ACAAA6", fontSize: "11px", fontWeight: 500, letterSpacing: "0.05em", marginBottom: "10px" }}>
              이달의 감정들
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Object.values(entriesByDate).flat().map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: e.color_hex, display: "block" }} />
                  <span style={{ color: "#787774", fontSize: "12px" }}>
                    {e.date.slice(5).replace("-", "/")} · {e.color_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && totalEntryCount === 0 && (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #EBEBEA", padding: "32px 18px", textAlign: "center" }}>
            <p style={{ color: "#ACAAA6", fontSize: "13px" }}>이 달에는 아직 기록이 없어요.</p>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}

function buildCalendar(yearMonth: string): (string | null)[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const lastDate = new Date(y, m, 0).getDate();
  const days: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= lastDate; d++) {
    days.push(`${yearMonth}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

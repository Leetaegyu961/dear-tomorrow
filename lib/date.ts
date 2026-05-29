export function getKSTDateString(): string {
  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().split("T")[0];
}

export function formatDateKorean(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

export function getYesterdayKSTString(): string {
  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kstDate.setDate(kstDate.getDate() - 1);
  return kstDate.toISOString().split("T")[0];
}

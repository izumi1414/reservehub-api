import { findMonthlyReport } from "../repositories/report.repository.js";


export async function fetchMonthlyReport(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("monthはYYYY-MMの形式で指定してください");
  }

  const [year, monthNumber] = month.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    year < 1||
    monthNumber < 1||
    monthNumber > 12
  ) {
    throw new Error("正しい年月を指定してください");
  }

  const startAt = `${String(year).padStart(4, "0")}-${String(monthNumber).padStart(2,"0")}-01T00:00:00+09:00`;

  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  const endAt = `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2,"0")}-01T00:00:00+09:00`;

  const report = await findMonthlyReport(startAt, endAt);

  return {
    month,
    totalReservations: Number(report.total_reservations),
    confirmedReservations: Number(report.confirmed_reservations),
    cancelledReservations: Number(report.cancelled_reservations)
  };
}

import { FilterBar } from "./ui";
import { addDays, localDate, isDateStr, startOfMonth } from "@/lib/time";

export function resolvePeriod(sp: Record<string, string>, defaultDays = 30) {
  const today = localDate();
  const preset = sp.preset;
  let from = isDateStr(sp.from) ? sp.from : addDays(today, -defaultDays + 1);
  let toIncl = isDateStr(sp.to) ? sp.to : today;
  if (preset === "today") { from = today; toIncl = today; }
  if (preset === "7d") { from = addDays(today, -6); toIncl = today; }
  if (preset === "30d") { from = addDays(today, -29); toIncl = today; }
  if (preset === "90d") { from = addDays(today, -89); toIncl = today; }
  if (preset === "month") { from = startOfMonth(today); toIncl = today; }
  if (preset === "year") { from = today.slice(0, 4) + "-01-01"; toIncl = today; }
  if (toIncl < from) toIncl = from;
  return { from, to: addDays(toIncl, 1), toIncl };
}

export function PeriodFilter({ sp, extra }: { sp: Record<string, string>; extra?: React.ReactNode }) {
  const p = resolvePeriod(sp);
  return (
    <FilterBar>
      <div><label className="label">From</label><input type="date" name="from" defaultValue={p.from} className="input" /></div>
      <div><label className="label">To</label><input type="date" name="to" defaultValue={p.toIncl} className="input" /></div>
      <div><label className="label">Quick range</label><select name="preset" className="input" defaultValue=""><option value="">Custom</option><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="month">This month</option><option value="year">Year to date</option></select></div>
      {extra}
    </FilterBar>
  );
}

import { useId } from "react";
import { LockKeyhole } from "lucide-react";
import { ACTIVITY_CHART_THRESHOLD, type getActivityCharts } from "../core/activityCharts";
import { dayNumber } from "../core/localDates";

type ChartData = ReturnType<typeof getActivityCharts>;
const plot = { left: 30, right: 310, top: 18, bottom: 128 };
const chartMaximum = (counts: number[]) => Math.ceil(Math.max(2, ...counts) / 2) * 2;
const yPosition = (count: number, maximum: number) => plot.bottom - (count / maximum) * (plot.bottom - plot.top);
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Grid({ maximum }: { maximum: number }) {
  return (
    <g className="chart-grid" aria-hidden="true">
      {[0, maximum / 2, maximum].map((value) => (
        <g key={value}>
          <line x1={plot.left} x2={plot.right} y1={yPosition(value, maximum)} y2={yPosition(value, maximum)} />
          <text x={plot.left - 9} y={yPosition(value, maximum) + 3} textAnchor="end">{value}</text>
        </g>
      ))}
    </g>
  );
}

function Counts({ rows, label }: { rows: { label: string; count: number }[]; label: string }) {
  return (
    <details className="chart-counts">
      <summary>View counts</summary>
      <table>
        <thead><tr><th scope="col">{label}</th><th scope="col">Workouts</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.count}</td></tr>)}</tbody>
      </table>
    </details>
  );
}

export default function ActivityCharts({ data }: { data: ChartData }) {
  const chartId = useId();
  if (!data.eligible) return (
    <section className="activity-patterns charts-locked" aria-label="Activity charts locked">
      <LockKeyhole size={18} aria-hidden="true" />
      <div><h2>Charts unlock at {ACTIVITY_CHART_THRESHOLD} XP</h2><p>{data.remainingToUnlock} XP to go</p></div>
      <div className="chart-unlock-track" role="progressbar" aria-label="XP toward charts" aria-valuenow={data.totalXp} aria-valuemin={0} aria-valuemax={ACTIVITY_CHART_THRESHOLD}><span style={{ width: `${Math.min(100, data.totalXp / ACTIVITY_CHART_THRESHOLD * 100)}%` }} /></div>
    </section>
  );
  const weekdayMaximum = chartMaximum(data.weekdays.map((day) => day.count));
  const hourMaximum = chartMaximum(data.hours.map((hour) => hour.count));
  const xpMaximum = Math.max(100, Math.ceil(data.totalXp / 100) * 100);
  const firstXpDay = dayNumber(data.xpTimeline[0].date);
  const lastXpDay = dayNumber(data.asOfDate);
  const xpX = (date: string) => lastXpDay === firstXpDay
    ? plot.right
    : plot.left + (dayNumber(date) - firstXpDay) / (lastXpDay - firstXpDay) * (plot.right - plot.left);
  const xpPath = `M ${plot.left} ${plot.bottom} ` + data.xpTimeline.map(day => `H ${xpX(day.date)} V ${yPosition(day.totalXp, xpMaximum)}`).join(' ') + ` H ${plot.right}`;
  const xpArea = `${xpPath} V ${plot.bottom} Z`;
  const dayWidth = (plot.right - plot.left) / 7;
  const hourX = (hour: number) => plot.left + (hour / 23) * (plot.right - plot.left);
  const linePoints = data.hours.map((hour) => `${hourX(hour.hour)},${yPosition(hour.count, hourMaximum)}`).join(" ");

  return (
    <section className="activity-patterns" aria-labelledby={`${chartId}-heading`}>
      <h2 id={`${chartId}-heading`}>Your progress</h2>
      <p>All time · Based on your device's local dates</p>
      <figure className="activity-chart">
        <figcaption><h3>XP over time</h3><span>Workouts and achievement bonuses · {data.totalXp} XP total</span></figcaption>
        <svg viewBox="0 0 320 155" role="img" aria-labelledby={`${chartId}-xp-title ${chartId}-xp-desc`}>
          <title id={`${chartId}-xp-title`}>Cumulative XP over time</title>
          <desc id={`${chartId}-xp-desc`}>From {dateLabel(data.xpTimeline[0].date)} to {dateLabel(data.asOfDate)}, your total grew to {data.totalXp} XP. Flat sections represent days without new XP.</desc>
          <Grid maximum={xpMaximum} />
          <path className="chart-xp-area" d={xpArea} />
          <path className="chart-xp-line" d={xpPath} />
          <circle className="chart-point" cx={plot.right} cy={yPosition(data.totalXp, xpMaximum)} r={4}><title>{`Today: ${data.totalXp} XP total`}</title></circle>
          <text className="chart-axis" x={plot.left} y={147} textAnchor="start">{dateLabel(data.xpTimeline[0].date)}</text>
          <text className="chart-axis" x={plot.right} y={147} textAnchor="end">{data.asOfDate === data.xpTimeline[0].date ? 'Today' : dateLabel(data.asOfDate)}</text>
        </svg>
        <details className="chart-counts"><summary>View XP by day</summary><table><thead><tr><th scope="col">Date</th><th scope="col">Earned XP</th><th scope="col">Total XP</th></tr></thead><tbody>{data.xpTimeline.map(day => <tr key={day.date}><th scope="row">{dateLabel(day.date)}</th><td>+{day.earnedXp}</td><td>{day.totalXp}</td></tr>)}</tbody></table></details>
      </figure>
      <figure className="activity-chart">
        <figcaption>
          <h3>Days of the week</h3>
          <span>Workouts completed each day</span>
        </figcaption>
        <svg viewBox="0 0 320 155" role="img" aria-labelledby={`${chartId}-days-title ${chartId}-days-desc`}>
          <title id={`${chartId}-days-title`}>Workout frequency by weekday</title>
          <desc id={`${chartId}-days-desc`}>{data.weekdays.map((day) => `${day.label}: ${day.count} workouts`).join("; ")}</desc>
          <Grid maximum={weekdayMaximum} />
          {data.weekdays.map((day, index) => {
            const height = plot.bottom - yPosition(day.count, weekdayMaximum);
            const center = plot.left + dayWidth * (index + 0.5);
            return (
              <g key={day.weekday}>
                <rect className="chart-bar" x={center - 10} y={plot.bottom - height} width={20} height={height} rx={3}>
                  <title>{`${day.label}: ${day.count} workouts`}</title>
                </rect>
                <text className="chart-axis" x={center} y={147} textAnchor="middle">{day.label}</text>
              </g>
            );
          })}
        </svg>
        <Counts rows={data.weekdays} label="Day" />
      </figure>
      <figure className="activity-chart">
        <figcaption>
          <h3>Time of day</h3>
          <span>Completed workouts per hour</span>
        </figcaption>
        <svg viewBox="0 0 320 155" role="img" aria-labelledby={`${chartId}-hours-title ${chartId}-hours-desc`}>
          <title id={`${chartId}-hours-title`}>Workout frequency by hour</title>
          <desc id={`${chartId}-hours-desc`}>{data.hours.map((hour) => `${hour.label}: ${hour.count} workouts`).join("; ")}</desc>
          <Grid maximum={hourMaximum} />
          <polyline className="chart-frequency-line" points={linePoints} />
          {data.hours.filter((hour) => hour.count > 0).map((hour) => (
            <circle className="chart-point" key={hour.hour} cx={hourX(hour.hour)} cy={yPosition(hour.count, hourMaximum)} r={3}>
              <title>{`${hour.label}: ${hour.count} workouts`}</title>
            </circle>
          ))}
          {[0, 6, 12, 18, 23].map((hour) => (
            <text className="chart-axis" key={hour} x={hourX(hour)} y={147} textAnchor={hour === 0 ? "start" : hour === 23 ? "end" : "middle"}>
              {String(hour).padStart(2, "0")}:00
            </text>
          ))}
        </svg>
        <Counts rows={data.hours} label="Hour" />
      </figure>
    </section>
  );
}

import { useId } from "react";
import type { getActivityCharts } from "../core/activityCharts";

type ChartData = ReturnType<typeof getActivityCharts>;
const plot = { left: 30, right: 310, top: 18, bottom: 128 };
const chartMaximum = (counts: number[]) => Math.ceil(Math.max(2, ...counts) / 2) * 2;
const yPosition = (count: number, maximum: number) => plot.bottom - (count / maximum) * (plot.bottom - plot.top);

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
  if (!data.eligible) return null;
  const weekdayMaximum = chartMaximum(data.weekdays.map((day) => day.count));
  const hourMaximum = chartMaximum(data.hours.map((hour) => hour.count));
  const dayWidth = (plot.right - plot.left) / 7;
  const hourX = (hour: number) => plot.left + (hour / 23) * (plot.right - plot.left);
  const linePoints = data.hours.map((hour) => `${hourX(hour.hour)},${yPosition(hour.count, hourMaximum)}`).join(" ");

  return (
    <section className="activity-patterns" aria-labelledby={`${chartId}-heading`}>
      <h2 id={`${chartId}-heading`}>Your training rhythm</h2>
      <p>Local completion times · All time</p>
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
                  <title>{day.label}: {day.count} workouts</title>
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
              <title>{hour.label}: {hour.count} workouts</title>
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

import { useStats } from "../lib/useStats";
import { fmtCompact, fmtDuration, fmtAgo, fmtClock } from "../lib/format";
import { stageName } from "../../core/stages";

const IDLE_THRESHOLD = 120;

const RATE_TIP =
  "XP/hour updates only when the game writes new XP to the save (about every " +
  "1-2 minutes). It holds steady between writes instead of decaying.";
const GOLD_TIP =
  "Gold earned per hour. Counts gold gained only; spending (upgrades, Cube, " +
  "runes) is ignored, so it's accurate while farming.";

export function Live() {
  const stats = useStats();

  if (!stats) {
    return (
      <div className="live">
        <p className="muted">Connecting to the save file...</p>
      </div>
    );
  }

  const idle = stats.secondsSinceGain !== null && stats.secondsSinceGain > IDLE_THRESHOLD;

  return (
    <div className="live">
      <section className="rate-card">
        <div className="rate-main" title={RATE_TIP}>
          <span className="rate-num">{fmtCompact(stats.rollingRate)}</span>
          <span className="rate-unit">XP / hour</span>
        </div>
        <div className="rate-gold" title={GOLD_TIP}>
          {fmtCompact(stats.goldRate)} gold / hr
        </div>
      </section>

      <div className="lastupdated">
        <span>
          XP updated: <b>{fmtAgo(stats.secondsSinceGain)}</b>
        </span>
        <button className="reset" onClick={() => window.tbh.reset()}>
          {"\u21bb"} Reset
        </button>
      </div>

      <section className="totals">
        <Stat label="Session XP" value={fmtCompact(stats.cumulativeGained)} />
        <Stat label="Session gold" value={fmtCompact(stats.goldGained)} />
        <Stat label="Elapsed" value={fmtDuration(stats.elapsed)} />
        <Stat label="Session XP/hr" value={fmtCompact(stats.sessionRate)} />
      </section>

      <section className="map">
        Map: <b>{stageName(stats.stageKey, stats.stageWave)}</b>
      </section>

      <section className="panel">
        <h2>Heroes</h2>
        {stats.heroes.length === 0 ? (
          <p className="muted">No active heroes yet.</p>
        ) : (
          <div className="hero-list">
            {stats.heroes.map((h) => (
              <div className="hero-row" key={h.key}>
                <span className="hero-name">{h.name}</span>
                <span className="hero-lvl">Lv {h.level}</span>
                <span className="hero-rate">{fmtCompact(h.rate)}/hr</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>
          History <span className="muted">- XP changes</span>
        </h2>
        {stats.history.length === 0 ? (
          <p className="muted">No XP changes recorded yet.</p>
        ) : (
          <div className="hist-list">
            {stats.history.map((e, i) => (
              <div className="hist-row" key={`${e.wallTime}-${i}`}>
                <span className="hist-time">{fmtClock(e.wallTime)}</span>
                <span className="hist-delta">+{fmtCompact(e.delta)}</span>
                <span className="hist-rate">{fmtCompact(e.rate)}/hr</span>
                <span className="hist-map">{stageName(e.stageKey, e.stageWave)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className={idle ? "status warn" : "status"}>{stats.status}</footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { useT } from '@/lib/usePrefs';
import { formatDayShort, formatTime } from '@/lib/time';
import {
  APP_VERSION,
  downloadJson,
  exportEverything,
  fetchErrors,
  fetchHealth,
  LIMITS,
  purgePersonalData,
  type ClientError,
  type Health,
} from '@/lib/system';

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;

function Meter(props: { label: string; used: number; limit: number; icon: typeof Database }) {
  const pct = Math.min(100, Math.round((props.used / props.limit) * 100));
  const Icon = props.icon;
  const color = pct >= 80 ? 'rose' : pct >= 60 ? 'gold' : 'mint';
  return (
    <div className="card stack-sm" data-color={color}>
      <div className="row">
        <span className="bubble" aria-hidden>
          <Icon size={18} />
        </span>
        <strong className="grow">{props.label}</strong>
        <span className="time">{pct}%</span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={props.label}
      >
        <span style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="sub">
        {mb(props.used)} / {mb(props.limit)}
      </span>
    </div>
  );
}

/** Systeem: gebruik t.o.v. de gratis limieten, recente fouten, export en alles wissen. */
export function SystemPanel() {
  const { t, errText, locale } = useT();
  const [health, setHealth] = useState<Health | null>(null);
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [h, e] = await Promise.all([fetchHealth(), fetchErrors()]);
      setHealth(h);
      setErrors(e);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function doExport() {
    setBusy('export');
    setError(null);
    try {
      const data = await exportEverything();
      downloadJson(`cueboard-export-${new Date().toISOString().slice(0, 10)}.json`, data);
      setNotice(t('system.exported'));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  async function doPurge() {
    if (confirm !== 'DELETE') return;
    if (!window.confirm(t('system.purgeConfirm'))) return;
    setBusy('purge');
    setError(null);
    try {
      const r = await purgePersonalData();
      setNotice(t('system.purged', { n: r.deleted }));
      setConfirm('');
      void load();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="stack" aria-labelledby="h-system">
      <div className="row">
        <div className="grow">
          <h2 id="h-system" style={{ margin: 0 }}>
            {t('system.title')}
          </h2>
          <p className="sub" style={{ margin: '2px 0 0' }}>
            {t('system.hint')} · {t('system.version', { v: APP_VERSION })}
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          <RefreshCw aria-hidden size={18} />
          {t('system.refresh')}
        </button>
      </div>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {errText(error)}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      {health && (
        <div className="cards">
          <Meter
            label={t('system.database')}
            used={health.db_bytes}
            limit={LIMITS.db_bytes}
            icon={Database}
          />
          <Meter
            label={t('system.storage')}
            used={health.storage_bytes}
            limit={LIMITS.storage_bytes}
            icon={HardDrive}
          />
          <div className="card stack-sm" data-color="sky">
            <div className="row">
              <span className="bubble" aria-hidden>
                <Users size={18} />
              </span>
              <strong className="grow">{t('system.people')}</strong>
            </div>
            <span className="time" style={{ fontSize: '1.6rem' }}>
              {health.people_active}
            </span>
            <span className="sub">{t('system.peopleHint', { total: health.people_total })}</span>
          </div>
          <div className="card stack-sm" data-color={health.errors_24h > 0 ? 'gold' : 'mint'}>
            <div className="row">
              <span className="bubble" aria-hidden>
                <Activity size={18} />
              </span>
              <strong className="grow">{t('system.errors24h')}</strong>
            </div>
            <span className="time" style={{ fontSize: '1.6rem' }}>
              {health.errors_24h}
            </span>
            <span className="sub">{t('system.errorsHint')}</span>
          </div>
        </div>
      )}

      <section className="card stack-sm" aria-labelledby="h-errors">
        <h3 id="h-errors" style={{ margin: 0 }}>
          {t('system.recentErrors')}
        </h3>
        {errors.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {t('system.noErrors')}
          </p>
        ) : (
          <ul className="list error-list">
            {errors.map((e) => (
              <li key={e.id}>
                <AlertTriangle aria-hidden size={16} />
                <span className="time sub">
                  {formatDayShort(e.at, locale)} {formatTime(e.at, locale)}
                </span>
                <span className="grow">
                  <strong>{e.message}</strong>
                  <span className="sub" style={{ display: 'block' }}>
                    {[e.location, e.app_version, e.user_agent?.split(') ')[0]?.split('(')[1]]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack-sm" aria-labelledby="h-export">
        <h3 id="h-export" style={{ margin: 0 }}>
          {t('system.exportTitle')}
        </h3>
        <p className="sub" style={{ margin: 0 }}>
          {t('system.exportHint')}
        </p>
        <div className="row">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy !== null}
            onClick={() => void doExport()}
          >
            <Download aria-hidden size={18} />
            {busy === 'export' ? t('common.busy') : t('system.exportButton')}
          </button>
        </div>
      </section>

      <section className="card stack-sm danger-zone" data-color="rose" aria-labelledby="h-purge">
        <h3 id="h-purge" style={{ margin: 0 }}>
          {t('system.purgeTitle')}
        </h3>
        <p className="sub" style={{ margin: 0 }}>
          {t('system.purgeHint')}
        </p>
        <label className="field" style={{ margin: 0 }}>
          <span className="label">{t('system.purgeType')}</span>
          <input
            className="input"
            value={confirm}
            autoComplete="off"
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <div className="row">
          <button
            type="button"
            className="btn btn-sm danger-btn"
            disabled={confirm !== 'DELETE' || busy !== null}
            onClick={() => void doPurge()}
          >
            <Trash2 aria-hidden size={18} />
            {busy === 'purge' ? t('common.busy') : t('system.purgeButton')}
          </button>
        </div>
      </section>
    </section>
  );
}

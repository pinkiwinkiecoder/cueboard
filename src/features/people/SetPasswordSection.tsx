import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, Sparkles } from 'lucide-react';
import { generatePassword, setPasswordFor } from '@/lib/invite';
import { MIN_PASSWORD_LENGTH, passwordProblem } from '@/lib/password';
import { useT } from '@/lib/usePrefs';

/**
 * Enkel voor de beheerder: een nieuw wachtwoord kiezen voor iemand (ook voor jezelf).
 * Bestaande wachtwoorden kan niemand lezen (ze worden versleuteld bewaard), maar het
 * nieuwe wachtwoord zie je hier één keer, zodat je het persoonlijk kan doorgeven.
 */
export function SetPasswordSection(props: { userId: string; name: string; isMe: boolean }) {
  const { t, errText } = useT();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setPw('');
    setDone(null);
    setError(null);
  }, [props.userId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(pw);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await setPasswordFor(props.userId, pw);
      setDone(pw);
      setPw('');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t('people.copyPrompt'), text);
    }
  }

  return (
    <section className="stack" aria-labelledby={`h-pw-${props.userId}`}>
      <h3 id={`h-pw-${props.userId}`}>{t('people.setPassword')}</h3>
      <p className="hint">{t('people.setPasswordHint')}</p>
      {error !== null && (
        <div className="alert alert-error" role="alert">
          {typeof error === 'string' ? t(error as never, { min: MIN_PASSWORD_LENGTH }) : errText(error)}
        </div>
      )}
      {done ? (
        <div className="card stack-sm" data-color="mint" role="status">
          <strong>
            <Check aria-hidden size={16} />{' '}
            {t(props.isMe ? 'people.passwordSetSelf' : 'people.passwordSet', { name: props.name })}
          </strong>
          <div className="row">
            <code className="mono grow" style={{ fontSize: '1.1rem', userSelect: 'all' }}>
              {done}
            </code>
            <button type="button" className="btn btn-sm" onClick={() => void copy(done)}>
              <Copy aria-hidden size={16} />
              {copied ? t('people.copied') : t('people.copyLink')}
            </button>
          </div>
          <p className="hint" style={{ margin: 0 }}>
            {t('people.passwordShownOnce')}
          </p>
        </div>
      ) : (
        <form className="stack-sm" onSubmit={(e) => void submit(e)}>
          <div className="row">
            <input
              className="input grow mono"
              type="text"
              autoComplete="off"
              spellCheck={false}
              aria-label={t('auth.newPassword')}
              placeholder={t('auth.newPassword')}
              maxLength={72}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setPw(generatePassword())}
              title={t('people.generatePassword')}
            >
              <Sparkles aria-hidden size={16} />
              {t('people.generatePassword')}
            </button>
          </div>
          <p className="hint" style={{ margin: 0 }}>
            {t('auth.passwordHint', { min: MIN_PASSWORD_LENGTH })}
          </p>
          <button type="submit" className="btn btn-primary" disabled={busy || !pw}>
            <KeyRound aria-hidden size={18} />
            {busy ? t('common.saving') : t('people.setPasswordButton')}
          </button>
        </form>
      )}
    </section>
  );
}

import { useId, useState } from 'react';
import { useT } from '../../../i18n/I18nProvider';
import { Badge } from '../../atom/Badge/Badge';
import { Button } from '../../atom/Button/Button';
import { Input } from '../../atom/Input/Input';
import { Card } from '../../molecule/Card/Card';
import { Notice } from '../../molecule/Notice/Notice';
import './PromotionPractice.css';

const PRACTICE_CODE = 'TRAINING-01';
type Stage = 0 | 1 | 2 | 3 | 4;

/** A deliberately separate learning example: no provider, storage, network or session writes. */
export function PromotionPractice() {
  const t = useT();
  const inputId = useId();
  const [stage, setStage] = useState<Stage>(0);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const reset = () => { setStage(0); setCode(''); setError(false); };
  const status = (step: number) => {
    const complete = step === 3 ? stage === 4 : stage >= step;
    const active = step === 3 ? stage >= 2 && stage < 4 : stage === step - 1;
    return <Badge tone={complete ? 'success' : active ? 'primary' : 'neutral'}>{t(`promotions.practice.${complete ? 'done' : active ? 'ready' : 'waiting'}`)}</Badge>;
  };

  return (
    <div className="promotion-practice stack">
      <header className="promotion-practice-head">
        <div className="stack-sm">
          <h2>{t('promotions.practice.title')}</h2>
          <p className="muted">{t('promotions.practice.body')}</p>
        </div>
        <Button variant="ghost" icon="undo" disabled={stage === 0 && !code && !error} onClick={reset}>{t('promotions.practice.reset')}</Button>
      </header>

      <ol className="promotion-practice-steps">
        <li>
          <Card className="promotion-practice-step" padding="lg">
            <div className="promotion-practice-stephead"><span className="eyebrow">{t('promotions.practice.step', { n: 1 })}</span>{status(1)}</div>
            <h3>{t('promotions.practice.share.title')}</h3>
            <p className="muted">{t('promotions.practice.share.body')}</p>
            <div className="promotion-practice-offer stack-sm">
              <strong>{t('promotions.practice.offer')}</strong>
              <span className="small">{t('promotions.practice.code')}: <code>{PRACTICE_CODE}</code></span>
            </div>
            <Button icon="share" variant={stage === 0 ? 'primary' : 'secondary'} disabled={stage >= 1} onClick={() => setStage(1)}>{t('promotions.practice.share.action')}</Button>
            {stage >= 1 && <p className="small muted" role="status">{t('promotions.practice.share.result')}</p>}
          </Card>
        </li>
        <li>
          <Card className="promotion-practice-step" padding="lg">
            <div className="promotion-practice-stephead"><span className="eyebrow">{t('promotions.practice.step', { n: 2 })}</span>{status(2)}</div>
            <h3>{t('promotions.practice.claim.title')}</h3>
            <p className="muted">{t('promotions.practice.claim.body')}</p>
            <Button icon="calendar" variant={stage === 1 ? 'primary' : 'secondary'} disabled={stage !== 1} onClick={() => setStage(2)}>{t('promotions.practice.claim.action')}</Button>
            <p className="small muted" role="status">{t(stage >= 2 ? 'promotions.practice.claim.result' : stage === 1 ? 'promotions.practice.claim.ready' : 'promotions.practice.claim.wait')}</p>
          </Card>
        </li>
        <li>
          <Card className="promotion-practice-step" padding="lg">
            <div className="promotion-practice-stephead"><span className="eyebrow">{t('promotions.practice.step', { n: 3 })}</span>{status(3)}</div>
            <h3>{t('promotions.practice.desk.title')}</h3>
            <p className="muted">{t('promotions.practice.desk.body')}</p>
            <form className="stack-sm" onSubmit={(event) => {
              event.preventDefault();
              if (stage !== 2) return;
              if (code.trim().toUpperCase() !== PRACTICE_CODE) { setError(true); return; }
              setError(false); setStage(3);
            }}>
              <label className="field-label" htmlFor={inputId}>{t('promotions.practice.desk.label')}</label>
              <Input id={inputId} value={code} disabled={stage !== 2} invalid={error} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ''}`} onChange={event => { setCode(event.target.value); setError(false); }} />
              <p id={`${inputId}-hint`} className="small muted">{t('promotions.practice.desk.hint', { code: PRACTICE_CODE })}</p>
              {error && <p id={`${inputId}-error`} className="field-error small" role="alert">{t('promotions.practice.desk.error')}</p>}
              <Button type="submit" icon="search" variant={stage === 2 ? 'primary' : 'secondary'} disabled={stage !== 2}>{t('promotions.practice.desk.verify')}</Button>
            </form>
            {stage === 3 && <p className="small muted" role="status">{t('promotions.practice.desk.verified')}</p>}
            {stage < 2 && <p className="small muted">{t('promotions.practice.desk.wait')}</p>}
            <Button icon="checkin" variant={stage === 3 ? 'primary' : 'secondary'} disabled={stage !== 3} onClick={() => setStage(4)}>{t('promotions.practice.desk.checkin')}</Button>
          </Card>
        </li>
      </ol>
      {stage === 4 && <Notice tone="success" title={t('promotions.practice.complete.title')}>{t('promotions.practice.complete.body')}</Notice>}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeAnswer } from '../lib/mission-rules';
import { nextQuantStage, type QuantEvent, type QuantStage } from '../lib/quant';
import { QuantArt } from './QuantArt';

const ANSWER_HASH = import.meta.env.VITE_QUANT_ANSWER_HASH;
const BOOT_LINES = ['> signal acquired', '> carrier: M-grid', '> query pending…'];
const QUERY = 'QUERY: name the joy of missing out.';
const INSTALL_STEPS = [
  { delay: 450, line: '> fetching terminal kernel…' },
  { delay: 900, line: '> carrier: M-grid' },
  { delay: 1000, line: '> receiving quiet protocol…' },
  { delay: 900, line: '> unpacking unclaimed hours…' },
  { delay: 1000, line: '> indexing vacant frequencies…' },
  { delay: 1000, line: '> installing [█░░░░░░░] 12%' },
  { delay: 420, line: '> installing [███░░░░░] 32%' },
  { delay: 500, line: '> installing [████░░░░] 52%' },
  { delay: 600, line: '> installing [██████░░] 74%' },
  { delay: 700, line: '> installing [████████░] 94%' },
  { delay: 900, line: '> checking interference…' },
  { delay: 1000, line: '> binding stillness…' },
  { delay: 1000, line: '> writing unavailability index…' },
  { delay: 1100, line: '> install complete.' }
];

async function answerMatches(answer: string): Promise<boolean> {
  try {
    if (!ANSWER_HASH || typeof crypto === 'undefined' || !crypto.subtle) return false;

    const normalizedAnswer = normalizeAnswer(answer);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedAnswer));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');

    return hash === ANSWER_HASH;
  } catch {
    return false;
  }
}

export function QuantTerminal({ onDecline }: { onDecline: () => void }) {
  const outputRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [stage, setStage] = useState<QuantStage>('boot');
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [typedQuery, setTypedQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [reply, setReply] = useState('');
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [installLines, setInstallLines] = useState<string[]>([]);

  const advance = useCallback((event: QuantEvent) => {
    setStage((current) => nextQuantStage(current, event));
  }, []);

  useEffect(() => {
    if (stage !== 'boot') return;

    setBootLines([]);
    let typeTimer: number | null = null;
    let finishTimer: number | null = null;
    let lineIndex = 0;
    let characterIndex = 0;

    const typeCharacter = () => {
      const line = BOOT_LINES[lineIndex];
      setBootLines((current) => {
        const next = [...current];
        next[lineIndex] = line.slice(0, characterIndex + 1);
        return next;
      });
      characterIndex += 1;

      if (characterIndex === line.length) {
        lineIndex += 1;
        characterIndex = 0;
        if (lineIndex < BOOT_LINES.length) typeTimer = window.setTimeout(typeCharacter, 180);
        return;
      }

      typeTimer = window.setTimeout(typeCharacter, 28);
    };

    typeTimer = window.setTimeout(typeCharacter, 110);
    // Always the full rite: the terminal never remembers an install, so every entry
    // into the grid asks the question again.
    finishTimer = window.setTimeout(() => advance('boot-complete'), 3000);

    return () => {
      if (typeTimer !== null) window.clearTimeout(typeTimer);
      if (finishTimer !== null) window.clearTimeout(finishTimer);
    };
  }, [advance, stage]);

  useEffect(() => {
    if (stage !== 'question') return;

    setTypedQuery('');
    let timer: number | null = null;
    let characterIndex = 0;

    const typeCharacter = () => {
      characterIndex += 1;
      setTypedQuery(QUERY.slice(0, characterIndex));
      if (characterIndex < QUERY.length) timer = window.setTimeout(typeCharacter, 30);
    };

    timer = window.setTimeout(typeCharacter, 120);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'question') return;

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'install') return;

    setInstallLines([]);
    let timer: number | null = null;
    let index = 0;

    const showNextLine = () => {
      const step = INSTALL_STEPS[index];
      setInstallLines((current) => [...current, step.line]);

      if (index === INSTALL_STEPS.length - 1) {
        timer = window.setTimeout(() => advance('install-complete'), 700);
        return;
      }

      index += 1;
      timer = window.setTimeout(showNextLine, INSTALL_STEPS[index].delay);
    };

    timer = window.setTimeout(showNextLine, INSTALL_STEPS[index].delay);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [advance, stage]);

  useEffect(() => {
    if (stage !== 'install') return;
    const output = outputRef.current;
    if (!output) return;

    output.scrollTo({ top: output.scrollHeight, behavior: 'smooth' });
  }, [installLines, stage]);

  const submitAnswer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checkingAnswer) return;

    setCheckingAnswer(true);
    const matches = await answerMatches(answer);
    setCheckingAnswer(false);

    if (matches) {
      setReply('> accepted. preparing install.');
      advance('answer-right');
      return;
    }

    setReply('> no. try again.');
    advance('answer-wrong');
  };

  if (stage === 'art') return <QuantArt onExit={() => advance('exit-art')} />;
  if (stage === 'declined') return null;

  return (
    <section className="quant-terminal" aria-label="Quant terminal">
      <div className="quant-terminal-output" ref={outputRef} aria-live="polite">
        {stage === 'boot' ? (
          <>
            {bootLines.map((line, index) => (
              <p key={BOOT_LINES[index]}>{line}</p>
            ))}
            <span className="quant-cursor" aria-hidden="true" />
          </>
        ) : null}

        {stage === 'question' ? (
          <>
            <p>
              {typedQuery}
              {typedQuery.length < QUERY.length ? <span className="quant-cursor" aria-hidden="true" /> : null}
            </p>
            <form className="quant-answer-form" onSubmit={submitAnswer}>
              <label className="sr-only" htmlFor="quant-answer">
                Answer the terminal query
              </label>
              <span aria-hidden="true">&gt; </span>
              {/* Never disabled: disabling mid-check dismisses the phone keyboard, which reads as
                  "no second attempt". Double-submit is guarded in submitAnswer instead. */}
              <input
                ref={inputRef}
                id="quant-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
              />
              <span className="quant-cursor" aria-hidden="true" />
            </form>
            {reply ? <p>{reply}</p> : null}
          </>
        ) : null}

        {stage === 'install' ? installLines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>) : null}

        {stage === 'prompt' ? (
          <>
            <p>START PROGRAM? [Y/N]</p>
            <div className="quant-terminal-actions">
              <button type="button" onClick={() => advance('accept')}>
                Y
              </button>
              <button
                type="button"
                onClick={() => {
                  advance('decline');
                  onDecline();
                }}
              >
                N
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

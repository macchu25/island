import type { QuestView } from '@chemimon/shared';
import { useEffect, useRef, useState } from 'react';
import { useQuests } from '../api/queries';

/** How many unfinished quests the panel lists at once. */
export const QUESTS_SHOWN = 3;
/** How long the "quest done" line stays after a quest completes. */
export const QUEST_DONE_MS = 4000;

/** `current` is the next thing to do: only it shows its hint, so the panel stays short. */
function QuestRow({ q, current }: { q: QuestView; current: boolean }) {
  const pct = Math.round((q.progress / q.goal) * 100);
  return (
    <li data-testid={`quest-${q.id}`} className={`rounded p-1.5 ${current ? 'bg-white/10' : 'bg-white/5'}`}>
      <p className={current ? 'text-sm font-bold' : 'text-xs font-bold opacity-90'}>{q.title}</p>
      {current && <p className="text-xs opacity-80">{q.hint}</p>}
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/15" role="progressbar"
          aria-label={`Tiến độ ${q.title}`} aria-valuemin={0} aria-valuemax={q.goal} aria-valuenow={q.progress}>
          <div className="h-full rounded bg-emerald-400" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs tabular-nums">{q.progress}/{q.goal}</span>
      </div>
    </li>
  );
}

/** Small side panel that tells the player what to do next. */
export function QuestPanel() {
  const quests = useQuests().data?.quests;
  const [open, setOpen] = useState(true);
  const [justDone, setJustDone] = useState<string | null>(null);
  const seenDone = useRef<Set<string> | null>(null);

  // Announce a quest that became done since the last fetch (not the ones already done on first load).
  useEffect(() => {
    if (!quests) return;
    const done = new Set(quests.filter((q) => q.done).map((q) => q.id));
    const prev = seenDone.current;
    seenDone.current = done;
    if (!prev) return;
    const fresh = quests.find((q) => q.done && !prev.has(q.id));
    if (!fresh) return;
    setJustDone(fresh.title);
    const t = setTimeout(() => setJustDone(null), QUEST_DONE_MS);
    return () => clearTimeout(t);
  }, [quests]);

  if (!quests) return null;
  const doneCount = quests.filter((q) => q.done).length;
  const active = quests.filter((q) => !q.done).slice(0, QUESTS_SHOWN);
  return (
    <section aria-label="Nhiệm vụ" className="w-60 rounded bg-black/60 p-2 text-white">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left">
        <span className="flex-1 font-bold">Nhiệm vụ</span>
        <span className="text-xs tabular-nums" aria-label="Đã xong">{doneCount}/{quests.length}</span>
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {justDone && (
        <p role="status" className="mt-2 rounded bg-emerald-600/60 px-2 py-1 text-sm">✓ Hoàn thành: {justDone}</p>
      )}
      {open && (
        active.length === 0 ? (
          <p className="mt-2 text-sm">Bạn đã xong mọi nhiệm vụ!</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {active.map((q, i) => <QuestRow key={q.id} q={q} current={i === 0} />)}
          </ul>
        )
      )}
    </section>
  );
}

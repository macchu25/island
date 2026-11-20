import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Catalog, ReactionDef, RuleConditions } from '@chemimon/shared';
import { DEFAULT_DATA_DIR, loadCatalog } from './load';
import { branchingPairs, inputKey } from './validate';

const SUB = '₀₁₂₃₄₅₆₇₈₉';
/** "Ca(OH)2" -> "Ca(OH)₂": digits after a letter or ")" become subscripts. */
export function subscript(formula: string): string {
  return formula.replace(/([A-Za-z)])(\d+)/g, (_, a: string, d: string) => a + [...d].map((x) => SUB[Number(x)]).join(''));
}

const CATALYST_VI: Record<string, string> = { none: 'không xúc tác' };
const ENV_VI: Record<string, string> = { air: 'không khí', inert: 'khí trơ', water: 'nước' };
const ACT_VI: Record<string, string> = { none: 'không kích hoạt', spark: 'tia lửa', light: 'ánh sáng' };
const GRID_MIN_T = -78;
const GRID_MAX_T = 2500;
const GRID_MAX_P = 200;
const GRID_MAX_COUNT = 4;

function rangeVi(name: string, unit: string, r: { min: number; max: number }, lo: number, hi: number): string {
  if (r.min === r.max) return `${name} = ${r.min} ${unit}`;
  if (r.max >= hi) return `${name} ≥ ${r.min} ${unit}`;
  if (r.min <= lo) return `${name} ≤ ${r.max} ${unit}`;
  return `${name} ${r.min} đến ${r.max} ${unit}`;
}

export function conditionsVi(c: RuleConditions): string {
  const parts: string[] = [];
  if (c.temperatureC) parts.push(rangeVi('nhiệt độ', '°C', c.temperatureC, GRID_MIN_T, GRID_MAX_T));
  if (c.pressureAtm) parts.push(rangeVi('áp suất', 'atm', c.pressureAtm, 1, GRID_MAX_P));
  if (c.catalyst) parts.push('xúc tác ' + c.catalyst.map((x) => CATALYST_VI[x] ?? x).join(' hoặc '));
  if (c.environment) parts.push('môi trường ' + c.environment.map((x) => ENV_VI[x] ?? x).join(' hoặc '));
  if (c.activation) parts.push(ACT_VI[c.activation] ?? c.activation);
  return parts.length ? parts.join(', ') : 'mọi điều kiện';
}

function equation(r: ReactionDef, fm: (id: string) => string): string {
  const side = (ts: ReactionDef['inputs']) =>
    ts.map((t) => (t.coefficient === 1 ? '' : `${t.coefficient} `) + subscript(fm(t.chemicalId))).join(' + ');
  return `${side(r.inputs)} → ${side(r.outputs)}`;
}

function ratioVi(r: ReactionDef, fm: (id: string) => string): string {
  if (!r.ratio) return '—';
  const [a, b] = r.inputs.map((i) => i.chemicalId).sort();
  const lbl = `${subscript(fm(a!))}/${subscript(fm(b!))}`;
  const { min, max } = r.ratio;
  if (min === max) return `${lbl} = ${min}`;
  if (max >= GRID_MAX_COUNT) return `${lbl} ≥ ${min}`;
  if (min <= 1 / GRID_MAX_COUNT) return `${lbl} ≤ ${max}`;
  return `${lbl} từ ${min} đến ${max}`;
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

/** Optional free-text `note` per rule id, read from raw YAML (the schema strips unknown keys). */
function readNotes(dataDir: string): Map<string, string> {
  const notes = new Map<string, string>();
  for (const f of ['reactions.yaml', 'drafts/reactions.yaml']) {
    const p = join(dataDir, f);
    if (!existsSync(p)) continue;
    const doc: unknown = parseYaml(readFileSync(p, 'utf8'));
    if (Array.isArray(doc)) for (const it of doc) if (it && typeof it === 'object' && 'note' in it && 'id' in it) notes.set(String(it.id), String(it.note));
  }
  return notes;
}

export function renderReview(dataDir?: string): string {
  const opt = dataDir ? { dataDir } : {};
  const approved = new Set(loadCatalog(opt).reactions.map((r) => r.id));
  const all: Catalog = loadCatalog({ ...opt, includeDrafts: true });
  const drafts = all.reactions.filter((r) => !approved.has(r.id));
  const fm = (id: string) => all.chemicals.find((x) => x.id === id)?.formula ?? id;
  const nameOf = (id: string) => subscript(fm(id));
  const notes = readNotes(dataDir ?? DEFAULT_DATA_DIR);
  const branching = branchingPairs({ ...all, reactions: drafts });

  const groups = new Map<string, ReactionDef[]>();
  for (const r of drafts) groups.set(inputKey(r), [...(groups.get(inputKey(r)) ?? []), r]);
  const keys = [...groups.keys()].sort();

  const L: string[] = ['# Danh sách duyệt nội dung phản ứng (CHEMIMON)', ''];
  L.push(
    `**Tổng quan:** ${drafts.length} phản ứng chờ duyệt, ${keys.length} cặp chất đầu vào, ${approved.size} phản ứng đã duyệt. ` +
      `Cặp rẽ nhánh (cùng cặp chất, sản phẩm khác nhau tùy điều kiện): ${branching.length}` +
      (branching.length ? ` (${branching.map((k) => k.split('+').map(nameOf).join(' + ')).join('; ')}).` : '.'),
    '',
    'Cách duyệt: gửi danh sách id được duyệt, rồi chạy `approve <id...>`. Tỷ lệ là số lượng chất thứ nhất / chất thứ hai, sắp theo id chất tăng dần.',
    '',
  );
  for (const k of keys) {
    L.push(`## ${k.split('+').map(nameOf).join(' + ')}`, '');
    L.push('| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |', '|---|---|---|---|---|---|---|');
    for (const r of groups.get(k)!.sort((a, b) => a.id.localeCompare(b.id))) {
      L.push(
        `| \`${r.id}\` | ${cell(equation(r, fm))} | ${cell(conditionsVi(r.conditions))} | ${cell(ratioVi(r, fm))} | [nguồn](${r.source}) | chưa duyệt | ${cell(notes.get(r.id) ?? '')} |`,
      );
    }
    L.push('');
  }
  return L.join('\n');
}

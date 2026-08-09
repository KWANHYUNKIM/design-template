#!/usr/bin/env node
/**
 * skel.mjs — 두 템플릿의 **골격** 겹침을 잰다 (구성 대장 §4 통과 조건 7번)
 *
 * 왜 있는가:
 *   RUN33이 RUN30과 "CSS 187줄 중 47줄(25%) 동일"로 오리지널리티 3을 받았고,
 *   그래서 관문에 "동일 CSS 줄 10% 이하" 조건을 넣었다. 그런데 RUN34에서 재 보니 22%가 나왔고,
 *   겹치는 줄은 **거의 전부 규격이 강제하는 것**이었다 —
 *   `:root` 토큰 스케일 · 스크롤 복원 가드(함정 5) · `.js` 리빌 게이트(함정 16) ·
 *   `?capture=1` · `.fold` 표 접기(함정 12·13) · CSS 리셋.
 *   **규격을 지킬수록 관문에 걸리는 모순이었다.** 보일러플레이트를 빼고 세야 한다.
 *   빼고 재니 RUN31↔34는 1.0% 였다 — 골격은 실제로 새로 짠 것이었다.
 *
 * 무엇을 세는가:
 *   `<style>` 안에서 **클래스 셀렉터로 시작하는 규칙**만. 요소 리셋(`body`,`table`,`p`…)과
 *   규격 강제 블록(`.js`,`.capture`,`.fold`)은 제외한다. 남는 것이 그 RUN이 직접 지은 골격이다.
 *
 * 사용:
 *   node scripts/skel.mjs run-31-yeoseot run-34-muwol
 *   node scripts/skel.mjs run-34-muwol --ad AD-1     # 같은 AD의 지난 RUN 전부와 대조
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'templates';
const SPEC_BLOCKS = new Set(['.js', '.capture', '.fold']);

function rules(name) {
  const file = name.endsWith('.html') ? name : `${name}.html`;
  const src = readFileSync(join(DIR, file), 'utf8');
  const a = src.indexOf('<style>'), b = src.indexOf('</style>');
  if (a < 0 || b < 0) return { set: new Set(), classes: new Set() };
  const css = src.slice(a + 7, b);
  const set = new Set(), classes = new Set();
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].split(/\s+/).join(' ').trim();
    const body = m[2].split(/\s+/).join(' ').trim();
    if (!sel.startsWith('.')) continue;                 // 요소 리셋 제외
    const base = sel.split(/[\s,:]/)[0];
    if (SPEC_BLOCKS.has(base)) continue;                 // 규격 강제 블록 제외
    set.add(sel + '{' + body + '}');
    classes.add(base);
  }
  return { set, classes };
}

const args = process.argv.slice(2);
const target = args.find(x => !x.startsWith('--'));
if (!target) { console.error('사용: node scripts/skel.mjs <A> <B>  |  node scripts/skel.mjs <B> --ad AD-1'); process.exit(1); }

let pairs;
if (args.includes('--ad')) {
  // 같은 AD 슬롯: RUN 번호 % 3 이 같은 것들
  const num = n => Number((n.match(/run-(\d+)/) || [])[1]);
  const me = num(target);
  pairs = readdirSync(DIR).filter(f => f.startsWith('run-') && f.endsWith('.html'))
    .filter(f => num(f) % 3 === me % 3 && num(f) !== me)
    .map(f => f.replace('.html', ''));
} else {
  pairs = [args.filter(x => !x.startsWith('--'))[0]];
  if (pairs[0] === target) pairs = [args.filter(x => !x.startsWith('--'))[1]].filter(Boolean);
}

const B = rules(target);
console.log(`\n${target} — 자체 골격 규칙 ${B.set.size}개 · 클래스 ${B.classes.size}개\n`);
let worst = 0;
for (const p of pairs) {
  const A = rules(p);
  const sameRules = [...B.set].filter(r => A.set.has(r));
  const sameCls = [...B.classes].filter(c => A.classes.has(c));
  const pct = B.set.size ? sameRules.length / B.set.size * 100 : 0;
  worst = Math.max(worst, pct);
  const okA = sameCls.length <= 5, okB = pct <= 10;
  console.log(`vs ${p}`);
  console.log(`   ⓐ 공유 클래스 ${sameCls.length}개 ${okA ? '✅' : '❌ (5개 이하)'}  ${sameCls.join(' ')}`);
  console.log(`   ⓑ 동일 골격 규칙 ${sameRules.length}/${B.set.size} = ${pct.toFixed(1)}% ${okB ? '✅' : '❌ (10% 이하)'}`);
  for (const r of sameRules.slice(0, 6)) console.log(`      · ${r.slice(0, 92)}`);
  console.log('');
}
process.exit(worst > 10 ? 1 : 0);

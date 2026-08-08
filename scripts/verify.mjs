#!/usr/bin/env node
/**
 * verify.mjs — 템플릿 규격 자동 검사기 (브라우저 없이 잡을 수 있는 것만)
 *
 * 이 스크립트가 "합격"을 줘도 그건 절반이다. 지금까지 잡은 결함의 절반 이상은
 * 브라우저로 눈으로 본 것들이었다 (.wrap padding 붕괴 · 사진↔캡션 불일치 ·
 * 지형이 배경과 같은 밝기 · 도판 특이도 사고). 이 검사기는 그 앞단만 거른다.
 *
 * 사용:  node scripts/verify.mjs                 # templates/ 전체
 *        node scripts/verify.mjs run-23-deulmul  # 하나만
 *        node scripts/verify.mjs --json          # CI용 JSON 출력
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'templates';
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const only = args.find(a => !a.startsWith('--'));

/* 각 검사는 {id, level, test(src) -> null | 실패메시지} */
const CHECKS = [
  { id: 'hardcoded-font-size', level: 'error',
    why: '타입 스케일이 무작위가 되면 위계 점수가 4에서 막힌다 (RUN16 학습)',
    test: s => {
      const m = s.match(/font-size\s*:\s*[0-9.]+px/g);
      return m ? `${m.length}건 — 예: ${[...new Set(m)].slice(0, 4).join(', ')}` : null;
    }},

  { id: 'keep-all', level: 'error',
    why: '없으면 한글 단어 중간이 끊긴다 ("디스플레이 산세리/프.") — RUN15',
    test: s => /word-break\s*:\s*keep-all/.test(s) ? null : 'body에 word-break:keep-all 없음' },

  { id: 'webfont-link', level: 'error',
    why: '이름만 참조하면 그 폰트가 깔린 기기에서만 보인다 — RUN15',
    test: s => {
      const refs = /Pretendard/.test(s);
      const loads = /<link[^>]+pretendard/i.test(s) || /@font-face/.test(s);
      return refs && !loads ? 'Pretendard를 참조하는데 <link>/@font-face가 없음' : null;
    }},

  { id: 'img-onerror', level: 'error',
    why: '이미지가 죽으면 레이아웃이 무너진다',
    test: s => {
      const imgs = (s.match(/<img\b/g) || []).length;
      const oe = (s.match(/onerror\s*=/g) || []).length;
      return imgs > oe ? `<img> ${imgs}개 중 onerror ${oe}개만 있음` : null;
    }},

  { id: 'scroll-guard', level: 'error',
    why: '재방문 시 페이지 중간에서 열린다. smooth와 경합하므로 auto로 내렸다 되돌려야 함 — RUN15',
    test: s => {
      if (!/scrollRestoration/.test(s)) return 'scrollRestoration 가드 없음';
      if (/scroll-behavior\s*:\s*smooth/.test(s) && !/scrollBehavior\s*=\s*'auto'/.test(s))
        return 'smooth를 쓰는데 초기 리셋 동안 auto로 내리는 처리가 없음';
      return null;
    }},

  { id: 'wrap-padding-shorthand', level: 'error',
    why: '.wrap 겸용 섹션에 padding 단축을 쓰면 .wrap의 좌우값이 죽는다 — RUN16에서 규칙화했으나 RUN23에서 재발',
    test: s => {
      // class="X wrap" 으로 쓰인 클래스명을 모으고, 그 셀렉터가 padding 단축을 쓰는지 본다
      const combos = new Set();
      for (const m of s.matchAll(/class\s*=\s*"([^"]*\bwrap\b[^"]*)"/g))
        for (const c of m[1].split(/\s+/)) if (c && c !== 'wrap') combos.add(c);
      // 단축이라도 좌우값이 살아 있으면 문제가 아니다. 좌우가 0이 되는 경우만 잡는다.
      const horizIsZero = decl => {
        const v = decl.trim().split(/\s+/);
        const h = v.length === 1 ? v[0] : v.length >= 2 ? v[1] : null; // 1값=사방, 2·3값=2번째, 4값=2번째
        return h !== null && /^0(px|rem|em|%)?$/.test(h);
      };
      const bad = [];
      for (const c of combos) {
        const re = new RegExp(`\\.${c}\\s*\\{([^}]*)\\}`, 'g');
        for (const r of s.matchAll(re)) {
          const m = r[1].match(/(?:^|;)\s*padding\s*:\s*([^;}]+)/);
          if (m && horizIsZero(m[1])) bad.push(c);
        }
      }
      return bad.length ? `.${[...new Set(bad)].join(', .')} — 좌우 padding이 0으로 덮임. padding-top/bottom으로 쪼갤 것` : null;
    }},

  { id: 'reveal-class-name', level: 'error',
    why: '.in 은 레이아웃 클래스와 충돌해 텍스트 div가 grid로 변한다',
    test: s => /\.in\s*\{[^}]*opacity\s*:\s*0/.test(s) ? '리빌 클래스로 .in 을 씀 — .rise/.vis 같은 고유명 사용' : null },

  { id: 'reduced-motion', level: 'error',
    why: '모션 접근성',
    test: s => /prefers-reduced-motion/.test(s) ? null : 'prefers-reduced-motion 폴백 없음' },

  { id: 'mobile-fallback', level: 'error',
    why: 'sticky pin/스크럽을 모바일에서 안 끄면 빈 500vh 구간이 생긴다 — P12/P13 교훈',
    test: s => {
      const pinned = /position\s*:\s*sticky/.test(s) && /translateX/.test(s);
      const hasMq = /@media\s*\(\s*max-width/.test(s);
      return pinned && !hasMq ? 'sticky+translateX 스크럽인데 max-width 미디어쿼리가 없음' : null;
    }},

  { id: 'capture-mode', level: 'warn',
    why: '없으면 디자인 툴 반출 시 리빌 섹션이 빈 프레임으로 넘어간다 — RUN16',
    test: s => /capture=1/.test(s) ? null : '?capture=1 모드 없음' },

  { id: 'grid-min-width', level: 'warn',
    why: '그리드 자식에 min-width:0 이 없으면 이미지가 텍스트 열을 찌그러뜨린다',
    test: s => {
      const grids = (s.match(/display\s*:\s*grid/g) || []).length;
      return grids > 0 && !/min-width\s*:\s*0/.test(s) ? `grid ${grids}곳인데 min-width:0 선언이 없음` : null;
    }},

  { id: 'pipeline-meta-leak', level: 'error',
    why: '화면에 RUN 번호·프리셋명·티어가 보이면 즉각적 AI 티 — RUN13',
    test: s => {
      const body = s.slice(s.indexOf('<body'));
      const stripped = body.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
      const hit = stripped.match(/RUN\s?\d{2}|프리셋\s?P\d+|티어\s?T\d/g);
      return hit ? `보이는 텍스트에 ${[...new Set(hit)].join(', ')}` : null;
    }},

  { id: 'countup-unit-span', level: 'warn',
    why: '단위가 통째 텍스트면 좁은 칸에서 줄바꿈되어 베이스라인이 어긋난다 — RUN15',
    test: s => {
      if (!/countup/.test(s)) return null;
      return /data-suf/.test(s) && !/<span class="u">/.test(s)
        ? '카운트업 단위를 span으로 분리하지 않음' : null;
    }},
];

function checkFile(path) {
  const src = readFileSync(path, 'utf8');
  const fails = [];
  for (const c of CHECKS) {
    let msg = null;
    try { msg = c.test(src); } catch (e) { msg = `검사 오류: ${e.message}`; }
    if (msg) fails.push({ id: c.id, level: c.level, msg, why: c.why });
  }
  return fails;
}

const files = readdirSync(DIR)
  .filter(f => f.endsWith('.html') && f.startsWith('run-'))
  .filter(f => !only || f.includes(only))
  .sort();

const report = files.map(f => ({ file: f, fails: checkFile(join(DIR, f)) }));

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.some(r => r.fails.some(x => x.level === 'error')) ? 1 : 0);
}

let errs = 0, warns = 0;
for (const { file, fails } of report) {
  const e = fails.filter(f => f.level === 'error');
  const w = fails.filter(f => f.level === 'warn');
  errs += e.length; warns += w.length;
  if (!fails.length) { console.log(`  ✓  ${file}`); continue; }
  console.log(`\n  ${e.length ? '✗' : '!'}  ${file}`);
  for (const f of fails) {
    console.log(`       ${f.level === 'error' ? '✗' : '!'} ${f.id} — ${f.msg}`);
    console.log(`         ↳ ${f.why}`);
  }
}

console.log(`\n  ${files.length}개 검사 · 오류 ${errs} · 경고 ${warns}`);
console.log('  ⚠ 이 검사기는 앞단만 거릅니다. 레이아웃 붕괴·사진↔캡션 불일치·대비 문제는');
console.log('    브라우저로 390 / 1024 / 1440 세 폭을 직접 봐야 잡힙니다.\n');
process.exit(errs ? 1 : 0);

#!/usr/bin/env node
/**
 * shoot.mjs — 정확한 뷰포트로 템플릿을 캡처한다 (CDP 직결)
 *
 * 왜 있는가:
 *   `chrome --headless=new --window-size=390,900` 은 **창 최소폭 500px로 클램프된다.**
 *   그래서 "390 캡처"라고 믿었던 것이 실제로는 500px에서 렌더한 뒤 390으로 잘린 그림이고,
 *   모바일 레이아웃 검증이 통째로 무효가 된다. RUN30에서 이걸로 한 번 속았다.
 *   CDP의 Emulation.setDeviceMetricsOverride 만이 진짜 390 뷰포트를 만든다.
 *
 * 사용:
 *   node scripts/shoot.mjs run-30-smin                    # 390·1024·1440 세 폭 전체 캡처
 *   node scripts/shoot.mjs run-30-smin --w 390            # 한 폭만
 *   node scripts/shoot.mjs run-30-smin --capture          # ?capture=1 붙여서
 *   node scripts/shoot.mjs run-30-smin --probe            # 오버플로·각주거리·베이스라인·열배정 검사
 *   node scripts/shoot.mjs run-30-smin --nojs            # 스크립트를 끄고 렌더 — 잉크가 0이면 백지다
 *   node scripts/shoot.mjs run-30-smin --out /tmp/shots   # 저장 위치
 *
 * 전제: 로컬 서버가 떠 있어야 한다 —  python3 -m http.server 5501
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = process.env.CHROME
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// 포트와 프로필을 프로세스별로 흩어 놓는다 — 고정하면 두 세션이 동시에 돌 때
// 서로의 브라우저에 붙어 엉뚱한 폭으로 찍힌다 (RUN31에서 실제로 당했다)
const PORT = Number(process.env.SHOOT_PORT || (9300 + (process.pid % 600)));
const ORIGIN = process.env.SHOOT_ORIGIN || 'http://localhost:5501';

const args = process.argv.slice(2);
const name = args.find(a => !a.startsWith('--'));
if (!name) { console.error('사용: node scripts/shoot.mjs run-NN-slug [--w 390] [--capture] [--probe] [--out DIR]'); process.exit(1); }
const flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const has = k => args.includes('--' + k);

const widths = flag('w') ? [Number(flag('w'))] : [390, 1024, 1440];
const outDir = flag('out', '/tmp/shots');
const url = `${ORIGIN}/templates/${name}.html${has('capture') ? '?capture=1' : ''}`;
mkdirSync(outDir, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const PROFILE = `/tmp/shoot-profile-${PORT}`;

// 시작할 때 남의(=지난 실행의) 프로필을 쓸어낸다. 살아 있는 크롬이 물고 있으면 실패하는데,
// 그건 그 실행이 알아서 지우므로 무시한다.
for (const d of readdirSync('/tmp')) {
  if (!d.startsWith('shoot-profile-') || d === `shoot-profile-${PORT}`) continue;
  try { rmSync(`/tmp/${d}`, { recursive: true, force: true }); } catch { /* 사용 중 */ }
}

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  'about:blank',
], { stdio: 'ignore' });

async function targetWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then(r => r.json());
      const page = list.find(t => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* 아직 안 뜸 */ }
    await sleep(150);
  }
  throw new Error('CDP 접속 실패 — 크롬이 뜨지 않았다');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  return { ready, send, close: () => ws.close() };
}

const PROBE = `(() => {
  const vw = innerWidth, vh = innerHeight, bad = [];
  for (const e of document.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0) continue;
    // thead{left:-9999px} 같은 의도된 시각적 숨김은 오탐이다
    if (r.right < -2000) continue;
    if (r.right > vw + 1 || r.left < -1)
      bad.push(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : '')
        + ' w=' + Math.round(r.width) + ' L=' + Math.round(r.left) + ' R=' + Math.round(r.right));
  }

  // 각주 참조 ↔ 각주 본문 거리. 한 뷰포트 안에 못 들어오면 하이라이트를 볼 수 없다 (RUN30 크리틱).
  // 차례·네비 링크는 멀어도 정상이므로 각주 참조(.fn)만 본다.
  const fn = [];
  for (const a of document.querySelectorAll('a.fn[href^="#"]')) {
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (!t) { fn.push(a.textContent.trim() + ' → 대상 없음'); continue; }
    const d = Math.round(t.getBoundingClientRect().top - a.getBoundingClientRect().top);
    if (Math.abs(d) > vh) fn.push(a.textContent.trim() + ' → ' + d + 'px (뷰포트 ' + vh + ')');
  }

  // 한 줄에 나란히 놓인 그리드 칸끼리 높이가 벌어지면 베이스라인이 어긋난 것이다 (RUN30 결함 ②).
  // 세로로 쌓인 스택은 높이가 달라도 정상이므로, top 이 같은 칸들끼리만 비교한다.
  const skew = [];
  for (const g of document.querySelectorAll('*')) {
    if (getComputedStyle(g).display !== 'grid') continue;
    const rows = new Map();
    for (const c of g.children) {
      const r = c.getBoundingClientRect();
      if (r.height === 0) continue;
      const k = Math.round(r.top / 4);
      (rows.get(k) || rows.set(k, []).get(k)).push(r.height);
    }
    for (const hs of rows.values()) {
      if (hs.length < 2) continue;
      const lo = Math.min(...hs), hi = Math.max(...hs);
      // 페이지 2단 레이아웃(좌우 기둥)은 높이가 달라도 정상이다. 리드아웃 줄만 본다.
      if (hi > 200) continue;
      if (hi - lo > 24)
        skew.push((g.className || g.tagName) + ' 한 줄 안 높이 ' + Math.round(lo) + '~' + Math.round(hi));
    }
  }

  // 넓은 트랙이 좁은 콘텐츠에 갔는가 (RUN31 결함 ②).
  // 미디어쿼리 경계에서 열 배정이 뒤집히면 표가 4칸에 갇히고 옆 칸이 통째로 빈다.
  // 같은 줄에 놓인 형제끼리 "쓰는 폭 ÷ 받은 폭"을 비교한다.
  const track = [];
  // 같은 줄에 놓인 형제를 찾는다. top 을 버킷으로 나누면 align-items:baseline 에서
  // 4열 행이 2열로 잘못 묶인다(RUN34에서 오탐). 세로 범위가 겹치는지로 묶는다.
  function sameRows(g){
    const kids = [...g.children].map(c => c.getBoundingClientRect())
      .map((r, i) => ({ el: g.children[i], r }))
      .filter(x => x.r.width >= 40 && x.r.height > 0)
      .sort((a, b) => a.r.top - b.r.top);
    const out = [];
    for (const k of kids) {
      const grp = out[out.length - 1];
      if (grp) {
        const gt = Math.min(...grp.map(x => x.r.top)), gb = Math.max(...grp.map(x => x.r.bottom));
        const ov = Math.min(gb, k.r.bottom) - Math.max(gt, k.r.top);
        if (ov > Math.min(gb - gt, k.r.height) * 0.5) { grp.push(k); continue; }
      }
      out.push([k]);
    }
    return out;
  }
  for (const g of document.querySelectorAll('*')) {
    if (getComputedStyle(g).display !== 'grid') continue;
    for (const sibs of sameRows(g)) {
      if (sibs.length !== 2) continue;               // 두 칸 나란한 자리만 본다
      // 폭으로는 "구멍"을 잴 수 없다 — 블록 자식은 언제나 부모 폭을 채우므로 여유가 0으로 나온다.
      // 실제 신호는 **세로 불균형**이다: 넓은 트랙이 짧은 콘텐츠에, 좁은 트랙이 긴 콘텐츠에 갔을 때
      // 넓은 쪽 아래가 통째로 빈다 (RUN31 901px — 넓은 칸 351px / 좁은 칸 548px).
      const m = sibs.map(x => ({ el: x.el, w: x.r.width, h: x.r.height }));
      const [a1, b1] = m;
      if (Math.min(a1.w, b1.w) < 180) continue;      // 라벨 열은 대상이 아니다
      const wide = a1.w >= b1.w ? a1 : b1, narrow = a1.w >= b1.w ? b1 : a1;
      if (wide.h < narrow.h * 0.7 && narrow.h - wide.h > 120)
        track.push('넓은 트랙이 짧은 쪽에: ' + (wide.el.className || wide.el.tagName) +
                   ' 폭' + Math.round(wide.w) + '·높이' + Math.round(wide.h) +
                   ' vs ' + (narrow.el.className || narrow.el.tagName) +
                   ' 폭' + Math.round(narrow.w) + '·높이' + Math.round(narrow.h));
    }
  }

  // 명시 grid-column 을 가진 자식 뒤에 자동배치 자식이 오면 sparse 배치가 커서를 그 뒤로 보내
  // 마지막 칸이 다음 행 1열로 떨어진다 — 세 자리 숫자가 두 줄로 쪼개졌다 (RUN34 D1).
  // 실렌더로 잡는다: 한 그리드 안에서 자식들의 행이 예상보다 많으면 경고.
  const flow = [];
  for (const g of document.querySelectorAll('*')) {
    const cs = getComputedStyle(g);
    if (cs.display !== 'grid') continue;
    const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
    if (cols < 2) continue;
    if (cs.gridAutoFlow.includes('dense')) continue;   // dense 는 구멍을 메우므로 행 수 예측이 안 된다
    const kids = [...g.children].filter(c => {
      const k = getComputedStyle(c);
      return k.position !== 'absolute' && k.display !== 'none' && c.getBoundingClientRect().height > 0;
    });
    if (kids.length < 3 || kids.length > 12) continue;
    // 행을 저자가 직접 지정했으면 예상 행 수 계산이 성립하지 않는다 — 의도된 배치다
    if (kids.some(c => getComputedStyle(c).gridRowStart !== 'auto')) continue;

    // 함정 24 의 피해 모양은 하나로 좁혀진다:
    //   **자동배치 자식이, 열을 못박은 형제 뒤에서, 혼자 한 행을 차지한다.**
    // sparse 커서가 명시 배치를 지나가면서 뒤의 자동 자식을 다음 행 1열로 떨어뜨린 결과다.
    // (「span 합으로 예상 행 수를 계산」하는 모델은 못 쓴다 — .step/.nrow 처럼 자식을 한 열에
    //  고정해 세로로 쌓는 정상 배치를 전부 오탐한다. run-21·24·25 로 확인했다.)

    // 행 묶기: align-items:baseline 이면 같은 행도 어센트 차이만큼 top 이 갈린다 (run-17, 5px)
    const rowOf = new Map();
    const sorted = [...kids].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    let r = 0, prev = null;
    for (const c of sorted) {
      const t = c.getBoundingClientRect().top;
      if (prev !== null && t - prev > 12) r++;
      rowOf.set(c, r); prev = t;
    }
    const rowCount = new Map();
    for (const c of kids) rowCount.set(rowOf.get(c), (rowCount.get(rowOf.get(c)) || 0) + 1);

    // 열을 못박은 자식 = grid-column-start 가 확정 선번호. 'span N' 은 폭만 정할 뿐 자리는 자동이다.
    const pinned = kids.map(c => /^-?\\d+$/.test(getComputedStyle(c).gridColumnStart));
    let seenPinned = false;
    for (let i = 0; i < kids.length; i++) {
      if (pinned[i]) { seenPinned = true; continue; }
      if (!seenPinned) continue;
      if (getComputedStyle(kids[i]).gridColumnStart !== 'auto') continue;
      if (rowCount.get(rowOf.get(kids[i])) !== 1) continue;
      const bb = kids[i].getBoundingClientRect();
      flow.push((g.className || g.tagName) + ' > .' + (kids[i].className || kids[i].tagName)
                + ' 자동배치가 명시 배치 뒤에서 혼자 한 행으로 밀림 (열 ' + cols
                + ', w=' + Math.round(bb.width) + ', 「'
                + kids[i].textContent.trim().replace(/\\s+/g, ' ').slice(0, 12) + '」)');
      break;
    }
    if (flow.length > 5) break;
  }

  // 접힌 표에서 셀 안 grid 아이템이 셋 이상이면 값이 라벨 열로 떨어진다 (spec 함정 12 · RUN33 재발)
  const cells = [];
  for (const td of document.querySelectorAll('td')) {
    if (getComputedStyle(td).display !== 'grid') continue;
    let items = 0;
    for (const n of td.childNodes) {
      if (n.nodeType === 1 && getComputedStyle(n).display !== 'none') items++;
      else if (n.nodeType === 3 && n.textContent.trim()) items++;
    }
    if (items > 1) cells.push((td.dataset.l || td.cellIndex) + ' 안에 grid 아이템 ' + (items + 1) + '개');
    if (cells.length > 5) break;
  }

  // SVG — viewBox 를 벗어난 도형·글자, 그리고 실렌더 글자 크기 (RUN25 §85 · RUN33 D3/D4/D5)
  const svgBad = [];
  for (const svg of document.querySelectorAll('svg[viewBox]')) {
    const vb = svg.viewBox.baseVal, rect = svg.getBoundingClientRect();
    if (!vb.width || !rect.width) continue;
    const scale = rect.width / vb.width;
    for (const el of svg.querySelectorAll('text,path,rect,line,polygon')) {
      let b; try { b = el.getBBox(); } catch { continue; }
      if (!b.width && !b.height) continue;
      if (b.x < vb.x - 1 || b.y < vb.y - 1 ||
          b.x + b.width > vb.x + vb.width + 1 || b.y + b.height > vb.y + vb.height + 1)
        svgBad.push('viewBox 밖: <' + el.tagName + '> ' + Math.round(b.x) + '~' + Math.round(b.x + b.width));
      if (el.tagName === 'text') {
        const px = parseFloat(getComputedStyle(el).fontSize) * scale;
        if (px < 12) svgBad.push('SVG 글자 실렌더 ' + px.toFixed(1) + 'px (12 미만)');
      }
      if (svgBad.length > 6) break;
    }
  }

  // 판형·호흡이 이 폭에서도 살아 있는가 (RUN33 — 데스크톱만 갈라 놓으면 무효다)
  // 컨테이너를 클래스 이름으로 찾으면 안 된다 — RUN34 는 .slab 이라 놓쳤다.
  // 성질로 찾는다: max-width 가 있고 좌우 margin 이 auto 인 블록
  const sheets = [...document.querySelectorAll('section > *')]
    .filter(e => { const c = getComputedStyle(e);
      return c.maxWidth !== 'none' && c.marginLeft === c.marginRight && parseInt(c.paddingLeft) >= 0; })
    .map(e => { const c = getComputedStyle(e); return c.paddingLeft + '|' + c.paddingRight; });
  const secs = [...document.querySelectorAll('section')]
    .map(e => { const c = getComputedStyle(e); return parseInt(c.paddingTop) + '/' + parseInt(c.paddingBottom); });
  const rhythm = { 가로판형: new Set(sheets).size, 세로조합: new Set(secs).size, 섹션: secs.length };
  const rhythmWarn = [];
  if (secs.length >= 5 && rhythm.가로판형 < 2) rhythmWarn.push('가로 판형이 한 종류 — 여백 점수가 3에 묶인다');
  if (secs.length >= 5 && rhythm.세로조합 < Math.ceil(secs.length * .6))
    rhythmWarn.push('세로 호흡 ' + rhythm.세로조합 + '조합 / 섹션 ' + secs.length + '개 — 반복이 많다');

  return JSON.stringify({ vw, scrollW: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > vw,
    docH: document.body.scrollHeight,
    overflowCount: bad.length, overflowBad: bad.slice(0, 12),
    farFootnotes: fn, gridSkew: skew.slice(0, 8), trackMismatch: track.slice(0, 6),
    foldedCells: cells, svgIssues: svgBad.slice(0, 6), gridFlow: flow.slice(0, 5), rhythm, rhythmWarn }, null, 1);
})()`;

try {
  const conn = connect(await targetWs());
  await conn.ready;
  await conn.send('Page.enable');
  await conn.send('Runtime.enable');

  if (has('nojs')) await conn.send('Emulation.setScriptExecutionDisabled', { value: true });

  for (const w of widths) {
    await conn.send('Emulation.setDeviceMetricsOverride', {
      width: w, height: 900, deviceScaleFactor: 1, mobile: w < 700,
    });
    await conn.send('Page.navigate', { url });
    await sleep(2600);
    // 전체 높이를 재서 뷰포트를 늘린 뒤 한 장으로 찍는다
    const { result } = await conn.send('Runtime.evaluate', { expression: 'document.body.scrollHeight', returnByValue: true });
    const h = Math.min(Number(result.value) || 900, 30000);

    if (has('probe')) {
      const p = await conn.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
      console.log(`\n── ${w}px ──`);
      console.log(p.result.value);
      const onLen = await conn.send('Runtime.evaluate', {
        expression: 'document.body.innerText.length', returnByValue: true });
      const onText = Number(onLen.result.value) || 0;
      // 스크립트를 끄고 한 번 더 — 리빌이 .rise{opacity:0} 인 채로 남으면 지면이 백지가 된다
      await conn.send('Emulation.setScriptExecutionDisabled', { value: true });
      await conn.send('Page.navigate', { url });
      await sleep(2200);
      const n = await conn.send('Runtime.evaluate', {
        expression: `(()=>{let hid=0;
          for(const e of document.querySelectorAll('*')){const s=getComputedStyle(e);
            if(s.opacity==='0'&&e.getBoundingClientRect().height>0)hid++}
          return JSON.stringify({hidden:hid, textLen:document.body.innerText.length})})()`,
        returnByValue: true });
      const off = JSON.parse(n.result.value);
      // 보이는 텍스트 길이를 JS 켠 것과 비교한다. opacity 개수만 세면
      // 「JS 가 만들어 넣는 내용이 애초에 마크업에 없는 것」을 원리적으로 못 잡는다 (RUN34 D2)
      const ratio = onText ? off.textLen / onText : 1;
      console.log(' ' + JSON.stringify({ noJS: {
        숨은요소: off.hidden, 텍스트: off.textLen + '/' + onText + ' = ' + (ratio * 100).toFixed(0) + '%',
        판정: (off.hidden > 3 || ratio < 0.9)
          ? '⚠ 스크립트를 끄면 내용이 사라진다' : 'OK' } }));
      await conn.send('Emulation.setScriptExecutionDisabled', { value: false });
      continue;
    }

    await conn.send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: 1, mobile: w < 700,
    });
    await sleep(900);
    const shot = await conn.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const file = join(outDir, `${name}-${w}.png`);
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`  ${w.toString().padStart(4)}px · ${h}px  →  ${file}`);
  }
  conn.close();
} finally {
  chrome.kill();
  // 프로필을 반드시 지운다. 안 지우면 실행마다 PORT 만큼 다른 디렉터리가 남고,
  // 하나가 ~10MB라 175번 돌린 뒤 1.7GB가 되어 디스크를 통째로 채웠다 (RUN35 크리틱 중 실제 발생).
  await sleep(250);
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch { /* 다음 실행의 시작 청소가 가져간다 */ }
}

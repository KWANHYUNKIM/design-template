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
 *   node scripts/shoot.mjs run-30-smin --probe            # 캡처 대신 가로 오버플로 범인 목록
 *   node scripts/shoot.mjs run-30-smin --out /tmp/shots   # 저장 위치
 *
 * 전제: 로컬 서버가 떠 있어야 한다 —  python3 -m http.server 5501
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = process.env.CHROME
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.SHOOT_PORT || 9333);
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

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=/tmp/shoot-profile-${PORT}`,
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

  return JSON.stringify({ vw, scrollW: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > vw,
    docH: document.body.scrollHeight,
    overflowCount: bad.length, overflowBad: bad.slice(0, 12),
    farFootnotes: fn, gridSkew: skew.slice(0, 8) }, null, 1);
})()`;

try {
  const conn = connect(await targetWs());
  await conn.ready;
  await conn.send('Page.enable');
  await conn.send('Runtime.enable');

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
}

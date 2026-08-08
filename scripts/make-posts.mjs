#!/usr/bin/env node
/**
 * make-posts.mjs — 인스타그램 포스팅용 카드 + 캡션 생성기
 *
 * 만드는 것:  posts/card-NN.html   1080×1350 카드 (템플릿 실물을 iframe으로 박아 넣음)
 *            posts/captions.md    캡션 + 해시태그 + 체크리스트
 *
 * 올리는 것은 자동화하지 않는다. 인스타 자동 포스팅은 비즈니스 계정 전환 +
 * Meta 앱 심사 + 토큰 발급이 필요하고, 그마저도 ToS 회색지대라 계정 정지 위험이 있다.
 * 여기서는 "올리기 직전 상태"까지만 만들고, 누르는 건 사람이 한다.
 *
 * 사용:  node scripts/make-posts.mjs
 *        node scripts/make-posts.mjs 23        # 특정 RUN만
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://kwanhyunkim.github.io/design-template/';
const only = process.argv[2];
mkdirSync('posts', { recursive: true });

function meta(file) {
  const s = readFileSync(join('templates', file), 'utf8');
  const title = (s.match(/<title>([^<]*)<\/title>/) || [, file])[1];
  const [brand, ...rest] = title.split(/—|·/);
  const accent = (s.match(/--k:\s*(#[0-9a-fA-F]{3,8})/) || [, '#7dd3a0'])[1];
  const ink = (s.match(/--ink:\s*(#[0-9a-fA-F]{3,8})/) || [, '#101215'])[1];
  const n = +file.match(/run-(\d+)/)[1];
  // 이 템플릿이 실제로 갖춘 것 — 캡션에 넣을 근거
  const has = [];
  if (/prefers-reduced-motion/.test(s)) has.push('모션 접근성 폴백');
  if (/word-break\s*:\s*keep-all/.test(s)) has.push('한글 줄바꿈 처리');
  if (/max-width\s*:\s*900px|min-width\s*:\s*900px/.test(s)) has.push('390px부터 대응');
  if (/onerror/.test(s)) has.push('이미지 실패 폴백');
  if (!/font-size\s*:\s*[0-9.]+px/.test(s)) has.push('모듈러 타입 스케일');
  return { n, file, brand: brand.trim(), desc: rest.join('·').trim(), accent, ink, has };
}

const files = readdirSync('templates')
  .filter(f => /^run-\d+.*\.html$/.test(f))
  .filter(f => !only || f.includes(String(only).padStart(2, '0')))
  .sort((a, b) => +b.match(/\d+/)[0] - +a.match(/\d+/)[0]);

const items = files.map(meta);

/* ── 1080×1350 카드 ─────────────────────────────────────────────
   템플릿을 iframe으로 실제로 띄워 축소한다. 스크린샷을 따로 안 찍어도 되고,
   템플릿을 고치면 카드도 자동으로 따라 바뀐다. */
for (const it of items) {
  const card = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>post ${it.n}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1080px;height:1350px;overflow:hidden;background:${it.ink};
       font-family:'Pretendard Variable',Pretendard,system-ui,sans-serif;color:#fff;
       display:flex;flex-direction:column;word-break:keep-all}
  .top{padding:64px 64px 40px}
  .kicker{font-family:ui-monospace,monospace;font-size:22px;letter-spacing:.16em;
          color:${it.accent};text-transform:uppercase}
  h1{font-size:78px;font-weight:900;letter-spacing:-.04em;line-height:1.08;margin-top:24px}
  .sub{font-size:30px;color:#b9c2c9;margin-top:20px;max-width:22ch;line-height:1.5}
  .shot{flex:1;margin:0 64px;border-radius:20px;overflow:hidden;position:relative;
        border:1px solid rgba(255,255,255,.12);background:#000}
  .shot iframe{width:1440px;height:1900px;border:0;transform:scale(.66);
               transform-origin:0 0;pointer-events:none}
  .bot{padding:40px 64px 60px;display:flex;align-items:center;gap:20px}
  .bot .tags{flex:1;font-size:24px;color:#8e979f;line-height:1.5}
  .bot .cta{font-size:26px;font-weight:800;background:${it.accent};color:${it.ink};
            padding:18px 34px;border-radius:100px;white-space:nowrap}
</style></head><body>
  <div class="top">
    <div class="kicker">무료 템플릿 · No.${String(it.n).padStart(2, '0')}</div>
    <h1>${it.brand}</h1>
    <div class="sub">${it.desc}</div>
  </div>
  <div class="shot"><iframe src="../templates/${it.file}" scrolling="no"></iframe></div>
  <div class="bot">
    <div class="tags">${it.has.slice(0, 3).join(' · ')}</div>
    <div class="cta">프로필 링크에서 무료</div>
  </div>
</body></html>`;
  writeFileSync(join('posts', `card-${String(it.n).padStart(2, '0')}.html`), card);
}

/* ── 캡션 ───────────────────────────────────────────────── */
const BASE_TAGS = ['#웹디자인', '#랜딩페이지', '#퍼블리싱', '#프론트엔드', '#무료템플릿',
  '#html', '#css', '#포트폴리오', '#UI디자인', '#웹퍼블리셔', '#개발자', '#사이드프로젝트'];

const caption = it => {
  const proof = it.has.length
    ? it.has.map(h => `· ${h}`).join('\n')
    : '· 파일 하나로 동작';
  return `## No.${String(it.n).padStart(2, '0')} — ${it.brand}

**카드 이미지:** \`posts/card-${String(it.n).padStart(2, '0')}.html\` (1080×1350)

\`\`\`
${it.brand} — ${it.desc}

빌드 도구도 설치도 없이, HTML 파일 하나만 열면 동작합니다.
색과 글자 크기는 파일 맨 위 :root 에 토큰으로 모여 있어서
값만 바꾸면 전체가 따라 바뀝니다.

이미 처리해 둔 것
${proof}

무료입니다. 출처를 밝히지 않아도 되고, 상업적으로 써도 됩니다.
전체 ${items.length}종은 프로필 링크에서 바로 내려받을 수 있어요.

${SITE}
\`\`\`

**해시태그**
\`\`\`
${BASE_TAGS.join(' ')}
\`\`\`
`;
};

const md = `# 인스타그램 포스팅 대기열

생성: \`node scripts/make-posts.mjs\` · 총 ${items.length}건

## 올리기 전에

1. \`posts/card-NN.html\` 을 브라우저에서 열어 **1080×1350 으로 캡처**합니다
   (Chrome 개발자도구 → 기기 툴바 → 1080×1350 → 전체 페이지 캡처)
2. 카드 안의 미리보기가 제대로 떴는지 **눈으로 확인**합니다 — iframe이 늦게 뜨면 빈 칸으로 찍힙니다
3. 아래 캡션을 붙여넣고 올립니다

## 자동 업로드를 안 하는 이유

인스타그램 API 자동 포스팅은 **비즈니스/크리에이터 계정 전환 + Meta 앱 심사 + 장기 토큰 발급**이
전제입니다. 개인 계정은 애초에 불가능하고, 심사를 통과해도 자동 포스팅은 ToS 회색지대라
계정 정지 위험이 남습니다. 그래서 여기서는 **올리기 직전까지만** 만듭니다.

## 추천 순서

점수가 높고 인터랙션이 눈에 띄는 것부터 올리는 편이 반응이 낫습니다:
**16 KELVIN → 18 CUMUL → 23 들물 → 17 BASIS → 19 BASELINE** 순.

---

${items.map(caption).join('\n---\n\n')}
`;

writeFileSync(join('posts', 'captions.md'), md);
console.log(`posts/ 생성 완료 — 카드 ${items.length}개 + captions.md`);
console.log(`카드 확인:  http://localhost:5500/posts/card-${String(items[0].n).padStart(2, '0')}.html`);

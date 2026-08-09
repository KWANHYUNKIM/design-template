# 추출 스크립트

`claude-in-chrome` 의 `javascript_tool` 로 대상 페이지에서 실행한다.
**끝까지 스크롤한 뒤 재야 한다** — 지연 로드 섹션이 빠지면 표본이 반쪽이 된다.

```js
// 1) 지연 로드를 깨우고 원위치
for(let i=0;i<8;i++){ scrollTo(0,document.body.scrollHeight*i/8); await new Promise(r=>setTimeout(r,350)) }
scrollTo(0,0); await new Promise(r=>setTimeout(r,600));

const cs = n => getComputedStyle(n);
const vis = [...document.querySelectorAll('body *')].filter(n=>{
  const r = n.getBoundingClientRect(); return r.width>0 && r.height>0;
});
// 자기 자신이 텍스트를 직접 가진 노드만 — 부모까지 세면 분포가 왜곡된다
const txt = vis.filter(n => [...n.childNodes].some(c => c.nodeType===3 && c.textContent.trim().length>1));
const cnt = a => { const m={}; a.forEach(v=>m[v]=(m[v]||0)+1);
                   return Object.entries(m).sort((x,y)=>y[1]-x[1]) };
const px = v => parseFloat(v)||0;
// 포인트색 판정 — 대상 브랜드의 색역에 맞게 고칠 것
const isAcc = v => { const m=v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if(!m) return false;
                     const [,r,g,b]=m.map(Number); return r>200 && g>60 && g<160 && b<80 };

JSON.stringify({
  nodes: vis.length, docH: document.body.scrollHeight,
  type:   cnt(txt.map(n=>{const s=cs(n); return s.fontSize+'/'+s.fontWeight+'/'+s.lineHeight})).slice(0,14),
  // ★ 큰 타입은 크기·행간만 재면 안 된다 — 아래 세 필드가 없으면 숫자를 정확히 옮기고도 다른 물건이 나온다
  bigType: txt.filter(n=>parseFloat(cs(n).fontSize)>=40).slice(0,12).map(n=>{
            const s=cs(n), t=n.textContent.trim();
            return {fs:s.fontSize, lh:s.lineHeight, ws:s.whiteSpace,
                    chars:t.length, lines:Math.round(n.getBoundingClientRect().height/parseFloat(s.lineHeight))};
          }),
  family: cnt(txt.map(n=>cs(n).fontFamily.split(',')[0].replace(/["']/g,''))).slice(0,5),
  space:  cnt(vis.flatMap(n=>{const s=cs(n);
            return [s.paddingTop,s.paddingBottom,s.marginTop,s.marginBottom].filter(v=>v!=='0px'&&px(v)>0)})).slice(0,16),
  textColor: cnt(txt.map(n=>cs(n).color)).slice(0,8),
  bg:     cnt(vis.map(n=>cs(n).backgroundColor).filter(v=>v!=='rgba(0, 0, 0, 0)')).slice(0,8),
  accentUse: cnt(vis.flatMap(n=>{const s=cs(n); const o=[];
            if(isAcc(s.backgroundColor)) o.push('bg:'+n.tagName);
            if(isAcc(s.color))           o.push('text:'+n.tagName);
            if(isAcc(s.borderTopColor) && px(s.borderTopWidth)>0) o.push('border:'+n.tagName);
            return o})).slice(0,8),
  radius: cnt(vis.map(n=>cs(n).borderRadius).filter(v=>v!=='0px')).slice(0,8),
  shadowCount: vis.filter(n=>cs(n).boxShadow!=='none').length,
  maxW:   cnt(vis.map(n=>cs(n).maxWidth).filter(v=>v!=='none'&&v!=='100%')).slice(0,5),
  gaps:   cnt(vis.map(n=>cs(n).gap).filter(v=>v&&v!=='normal')).slice(0,8),
  motion: cnt(vis.map(n=>cs(n).transitionDuration+' '+cs(n).transitionTimingFunction)
            .filter(v=>!v.startsWith('0s'))).slice(0,6),
  sections: [...document.querySelectorAll('section,header,footer')].slice(0,16)
            .map(n=>n.tagName+':'+Math.round(n.getBoundingClientRect().height))
})
```

## 읽는 법 — 숫자를 규칙으로 바꾸는 곳

측정값을 그대로 옮기면 표가 될 뿐이다. 아래를 물어야 시스템이 된다.

### 타입

- **단계가 몇 개인가.** 넷뿐인 회사도 있고 열둘인 회사도 있다
- **배수가 규칙적인가.** 1.25배 모듈러인가, 아니면 14→16→20→32처럼 불규칙한가
- **같은 크기에 행간을 몇 종 쓰는가.** 이게 크기 단계보다 중요할 때가 있다
  (당근은 14px 하나에 행간 19/24/27 세 종을 쓴다 — 크기를 안 늘리고 역할을 가른다)
- 굵기는 몇 종인가. 400/700만 쓰는가, 500·600까지 쓰는가

### 간격

- **기준 단위**가 4인가 8인가. 실사용 대역은 어디인가
- 큰 값(섹션 사이)과 작은 값(요소 사이)의 비율
- `gap` 최빈값 — 리스트가 얼마나 조밀한가

### 컬러

- **텍스트 최빈색이 먹인가 회색인가.** 회색이 더 많으면 "본문 대부분이 보조"라는 뜻이다
- **포인트색이 실제로 쓰인 자리를 전부 나열한다.** 배경? 텍스트? 테두리? SVG만?
  → 여기서 규칙 한 문장이 나온다

### 표면

- **`shadowCount` 가 0이면 그것 자체가 강한 규칙이다** — 층위를 배경색 차이로만 만든다는 뜻
- 라운드 최빈값. 0인지 6인지 16인지에 따라 완전히 다른 물건이 된다

### 모션

- duration 중앙값. 0.15s와 0.4s는 성격이 다르다
- easing 이름. `ease` 인지 커스텀 `cubic-bezier` 인지

## ★ 집계표는 "얼마나"는 알려주지만 "어디에"는 안 알려준다

두 함정이 실제로 터졌다. 둘 다 **숫자를 정확히 옮기고도 다른 물건이 나온** 경우다.

### ① 큰 타입의 행간은 행간이 아닐 수 있다

한 측정에서 `160px / 행간 113px (0.71)` 이 나와 두 줄 헤드라인에 그대로 걸었더니
**글자가 겹쳐 못 읽는 화면**이 됐다. 다시 재보니 원본의 160px 노드 11개가 전부
`chars:2 · lines:1 · white-space:normal` 이었다 — **두 글자짜리 토큰이고 절대 줄바꿈을 안 한다.**
113px은 행간이 아니라 **한 덩어리 상자를 조인 값**이었다.
여러 줄짜리는 따로 `58 / 72(1.25) / 700 + pre-line` 으로 직접 줄을 끊고 있었다.

**40px 이상 텍스트는 `chars` · `lines` · `whiteSpace` 를 함께 본다.**
한 줄짜리 토큰의 행간을 여러 줄에 적용하지 않는다.

### ② 최빈값은 컴포넌트 반복 수에 휘둘린다

간격 최빈이 `16px` 95회로 나와 원본(26px)과 뒤집힌 사례가 있었는데,
**95회 중 90회가 `TD`/`TH` 셀 패딩**이었다(원본에는 표가 없었다).
습관 진단이 아니라 표를 하나 넣은 결과였다.

**충실도 대조에서 최빈값이 어긋나면 태그별로 쪼개 보고 판단한다.**

```js
cnt(vis.map(n=>n.tagName+':'+cs(n).paddingTop).filter(v=>!v.endsWith(':0px'))).slice(0,20)
```

## 두 번째 페이지로 확정한다

같은 회사의 다른 페이지를 재서 **분포가 같으면 시스템, 다르면 그 페이지만의 사고**다.
`refs/<회사>.md` 에는 두 표본에서 모두 나온 값만 시스템으로 적는다.

## 내 산출물 재기

같은 스크립트를 로컬 산출물에 그대로 돌린다. `isAcc` 판정만 내 포인트색에 맞게 고친다.
두 표를 나란히 놓고 SKILL.md 5단계의 합격선으로 대조한다.

# 구조 추출 — 좌표까지 뜬다

`design-ref` 의 추출이 **분포**(무엇이 몇 번)를 잰다면, 이쪽은 **구조**(무엇이 어디에 얼마나 크게)를 뜬다.
`claude-in-chrome` 의 `javascript_tool` 로 대상 페이지에서 실행한다.

**반드시 끝까지 스크롤한 뒤 잰다.** 지연 로드 섹션이 빠지면 뼈대가 반쪽이 된다.

## ① 섹션 골격

```js
for(let i=0;i<10;i++){ scrollTo(0,document.body.scrollHeight*i/10); await new Promise(r=>setTimeout(r,400)) }
scrollTo(0,0); await new Promise(r=>setTimeout(r,800));

const cs = n => getComputedStyle(n);
const rc = n => n.getBoundingClientRect();
const top = n => Math.round(rc(n).top + scrollY);

// 최상위 블록 — section 이 없는 사이트도 있으므로 body 직계까지 훑는다
const roots = [...document.querySelectorAll('body > *, main > *, section, header, footer')]
  .filter(n => rc(n).height > 40 && rc(n).width > 200);

JSON.stringify(roots.slice(0,40).map((n,i) => ({
  i, tag: n.tagName,
  cls: (typeof n.className==='string' ? n.className : '').slice(0,40),
  y: top(n), h: Math.round(rc(n).height), w: Math.round(rc(n).width),
  bg: cs(n).backgroundColor,
  pad: cs(n).paddingTop + ' / ' + cs(n).paddingBottom,
  imgs: n.querySelectorAll('img,picture,video').length,
  grids: [...n.querySelectorAll('*')].filter(x=>cs(x).display==='grid').length,
  cards: n.querySelectorAll('li,article,[class*=card],[class*=item]').length,
  btns: n.querySelectorAll('button,a[class*=btn],a[role=button]').length,
  heads: [...n.querySelectorAll('h1,h2,h3')].map(h=>cs(h).fontSize).slice(0,3)
})))
```

이걸로 **"히어로 500px → 프로모션 224px → 카드열 665px"** 같은 뼈대가 숫자로 나온다.

## ② 그리드 지도

```js
const cs = n => getComputedStyle(n);
JSON.stringify([...document.querySelectorAll('*')]
  .filter(n => { const s=cs(n); return (s.display==='grid'||s.display==='flex') && n.children.length>2 })
  .map(n => ({
    tag: n.tagName, cls:(typeof n.className==='string'?n.className:'').slice(0,30),
    disp: cs(n).display,
    cols: cs(n).gridTemplateColumns.split(' ').length,
    colSpec: cs(n).gridTemplateColumns.slice(0,80),
    gap: cs(n).gap, wrap: cs(n).flexWrap,
    kids: n.children.length,
    w: Math.round(n.getBoundingClientRect().width)
  })).slice(0,30))
```

**열수와 자식 수가 뼈대의 핵심이다.** 4열 × 2줄인지 5열 × 3줄인지에 따라 페이지가 완전히 달라진다.

## ③ 이미지 슬롯

```js
JSON.stringify([...document.querySelectorAll('img,video')].map(i=>{
  const r=i.getBoundingClientRect();
  return { w:Math.round(r.width), h:Math.round(r.height),
           ratio:+(r.width/r.height).toFixed(2),
           fit:getComputedStyle(i).objectFit,
           y:Math.round(r.top+scrollY) };
}).filter(x=>x.w>40).slice(0,40))
```

**비율만 옮기면 된다.** 원본 이미지는 가져오지 않는다 —
공개 산출물은 발명한 사진이나 CSS 도형으로 같은 비율의 슬롯을 채운다.

## ④ 타입 역할표

크기만 재면 "어디에 쓰였는지"를 모른다. **자리와 함께** 본다.

```js
const cs=n=>getComputedStyle(n);
const txt=[...document.querySelectorAll('body *')]
  .filter(n=>[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim().length>1));
const m={};
txt.forEach(n=>{
  const s=cs(n), k=s.fontSize+'/'+s.fontWeight;
  const t=n.textContent.trim();
  (m[k]=m[k]||{n:0,tags:{},chars:[],lines:[]});
  m[k].n++; m[k].tags[n.tagName]=(m[k].tags[n.tagName]||0)+1;
  if(m[k].chars.length<5){ m[k].chars.push(t.length);
    m[k].lines.push(Math.round(n.getBoundingClientRect().height/parseFloat(s.lineHeight)||1)); }
});
JSON.stringify(Object.entries(m).sort((a,b)=>b[1].n-a[1].n).slice(0,14));
```

★ **`chars` 와 `lines` 가 없으면 큰 타입에서 사고가 난다.**
한 측정에서 `160px / 행간 113px(0.71)` 을 두 줄 헤드라인에 걸었다가 글자가 겹쳤는데,
원본은 **두 글자짜리 한 줄 토큰**이었고 113px은 행간이 아니라 상자를 조인 값이었다.

## ⑤ 컴포넌트 인벤토리

반복 블록의 **종류와 개수**를 센다. 뼈대 재현의 합격 여부가 여기서 갈린다.

```js
const sig = n => n.tagName+'.'+(typeof n.className==='string'?n.className.split(' ')[0]:'');
const m={};
document.querySelectorAll('li,article,[class*=card],[class*=item],[class*=tile]')
  .forEach(n=>{ const r=n.getBoundingClientRect();
    if(r.height<40) return;
    const k=sig(n)+' '+Math.round(r.width)+'×'+Math.round(r.height);
    m[k]=(m[k]||0)+1; });
JSON.stringify(Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,20))
```

## 산출물에 같은 스크립트를 돌린다

**대조는 눈이 아니라 좌표로 한다.** 두 결과를 나란히 놓고 SKILL.md 5단계의 합격선으로 본다.

섹션 높이가 15% 넘게 벌어지면 **콘텐츠 분량이 다른 것**이다 —
글자 수를 원본 대역으로 맞춘다. CSS를 고칠 문제가 아니다.

## 캐러셀·아코디언

닫힌 상태만 재면 절반을 놓친다. **각 상태를 따로 잰다.**

```js
// 예: 탭을 하나씩 눌러 가며 잰다
for (const b of document.querySelectorAll('[role=tab]')) {
  b.click(); await new Promise(r=>setTimeout(r,400));
  /* 여기서 ①~⑤ 중 필요한 것을 재고 결과를 모은다 */
}
```

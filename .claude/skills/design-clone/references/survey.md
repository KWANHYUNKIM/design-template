# 답사 — 짓기 전에 걸어 다닌다

측정만으로는 **정지된 한 장**밖에 못 만든다.
클릭하면 무엇이 열리는지, 어디로 가는지, 몇 개의 상태가 있는지는 **걸어 다녀야** 안다.

이 문서는 **설계자 역할**의 절차다. 구현은 이게 끝난 뒤에 시작한다.

## 왜 먼저 하는가

구현부터 시작하면 **범위를 모른 채 짓게 된다.**
카드를 다 만들고 나서 "누르면 상세가 떠야 하네"를 알면 뼈대를 다시 짠다.

답사가 먼저 답해야 할 것은 하나다 — **어디까지 만들 것인가.**

## 1. 클릭 가능한 것을 전부 센다

```js
const rc=n=>n.getBoundingClientRect();
const vis=n=>{const r=rc(n);return r.width>0&&r.height>0};
const cls=n=>(typeof n.className==='string'?n.className:'').split(' ')[0].slice(0,24);
const items=[...document.querySelectorAll('a[href],button,[role=button],[role=tab],[onclick],summary,label[for]')]
  .filter(vis).map(n=>({
    kind:n.tagName+(n.getAttribute('role')?':'+n.getAttribute('role'):''),
    txt:(n.textContent||'').trim().slice(0,22),
    href:(n.getAttribute('href')||'').slice(0,60),
    cls:cls(n), y:Math.round(rc(n).top+scrollY)
  }));
// 같은 컴포넌트의 반복은 하나로 접는다 — 카드 24개를 24줄로 세면 지도가 안 보인다
const seen={}, out=[];
items.forEach(i=>{ const k=i.kind+'|'+i.cls; seen[k]=(seen[k]||0)+1; if(seen[k]===1) out.push(i) });
JSON.stringify({total:items.length, unique:out.length, counts:seen, sample:out.slice(0,40)})
```

`total` 과 `unique` 의 차이가 곧 **반복 컴포넌트의 규모**다.

## 2. 무엇이 어떻게 열리는가 — 네 종류로 가른다

| 종류 | 판별 | 복제 방법 |
|---|---|---|
| **페이지 이동** | `href` 가 다른 경로 | 뷰 스위칭 (한 파일 안) |
| **모달·드로어** | 클릭 후 `body` 에 오버레이가 생김 | 오버레이 뷰 |
| **인플레이스 전환** | 같은 자리 내용만 바뀜 (탭·필터·정렬) | 데이터 필터 |
| **펼침** | 높이만 늘어남 (아코디언·더보기) | `hidden` 토글 |

판별하는 법 — **누르기 전후를 비교한다.**

```js
async function probe(el){
  const before={h:document.body.scrollHeight,url:location.href,
                nodes:document.querySelectorAll('body *').length};
  el.click(); await new Promise(r=>setTimeout(r,600));
  const after={h:document.body.scrollHeight,url:location.href,
               nodes:document.querySelectorAll('body *').length};
  return {url:before.url!==after.url, dh:after.h-before.h, dn:after.nodes-before.nodes};
}
```

- `url` 이 바뀌면 **페이지 이동**
- `dn` 이 크게 늘고 `dh` 는 그대로면 **모달**(오버레이가 얹힘)
- `dh` 만 늘면 **펼침**
- 둘 다 거의 안 변하면 **인플레이스 전환**

## 3. 상태를 센다

정적 화면만 재면 **빈 상태·로딩·에러**를 놓친다. 실제로 눌러서 만들어 본다.

- 필터를 걸어 **결과 0건**을 만든다 → 빈 상태 문구·그림
- 탭을 전부 눌러 본다 → 탭마다 내용 종류가 같은가 다른가
- 폼에 잘못된 값을 넣는다 → 에러 표시 자리
- 캐러셀을 끝까지 넘긴다 → 순환하는가 멈추는가

## 4. 설계서를 쓴다 — `refs/<회사>/survey.md`

```
## 화면 목록
| # | 화면 | 진입 | 종류 | 뼈대 | 복제 |
|---|---|---|---|---|---|
| 1 | 홈 | / | 페이지 | 17섹션 9,033px | ✅ |
| 2 | 제품 상세 | 카드 클릭 | 페이지 | 갤러리+스펙표+구매바 | ✅ |
| 3 | 장바구니 | 헤더 아이콘 | 드로어 | 목록+합계+주문버튼 | ✅ |
| 4 | 카테고리 | GNB 호버 | 드롭다운 | 4열 대분류 | ✅ |
| 5 | 검색 | 헤더 검색 | 페이지 | 필터+결과 그리드 | △ 결과만 |
| 6 | 로그인 | 헤더 링크 | 페이지 | — | ❌ 범위 밖 |

## 플로우
홈 → (카드) → 상세 → (담기) → 장바구니 → (주문) → 주문서
홈 → (GNB) → 카테고리 → (선택) → 목록 → 상세

## 상태
- 장바구니 비었을 때 / 담겼을 때
- 검색 결과 0건
- 품절 배지
- 캐러셀 첫 장·끝 장

## 범위 판정
만든다: 1·2·3·4 + 검색 결과
안 만든다: 로그인·결제·주문조회 (인증·결제는 복제 대상이 아니다)
```

**`복제` 열에 ❌ 를 적는 것이 이 문서의 핵심이다.**
전부 만들 수는 없다. 무엇을 안 만드는지 먼저 정해야 구현이 끝난다.

## 5. 범위를 정하는 기준

만든다 — **화면이 있고, 그 화면이 그 서비스의 성격을 보여주는 것.**
목록·상세·장바구니·필터·카테고리가 여기 든다.

안 만든다 — **인증·결제·개인정보.**
로그인 폼을 흉내내는 것은 복제가 아니라 위험한 물건을 만드는 일이다.
이 저장소는 **자격증명이나 결제 정보를 받는 화면을 만들지 않는다.** 껍데기라도 만들지 않는다.

주문서까지는 만들되 **결제 단계 직전에서 멈춘다.**

## 6. 구현에 넘긴다

설계서가 끝나면 `rebuild.md` 로 간다. 구현은 설계서의 **화면 목록 순서대로** 짓는다.
중간에 화면이 늘면 설계서를 먼저 고치고 온다 — 문서 없이 늘리면 범위가 다시 흐려진다.

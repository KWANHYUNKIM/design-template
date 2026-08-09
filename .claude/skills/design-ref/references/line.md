# 선 검사 — 통과 못 하면 배포하지 않는다

산출물이 **공개 갤러리(github.io)에 올라간다.** 그래서 이 검사는 권고가 아니라 차단이다.

`taste` 스킬 §5가 태도를 적었다면, 이 문서는 **기계가 잡을 수 있는 형태**로 옮긴 것이다.
사람이 지키는 것과 검사기가 막는 것은 다르다 — RUN16에서 직접 쓴 규칙이 RUN23에서 여섯 섹션 전부 재발했다.

## 검사 5종

`scripts/verify.mjs` 에 추가한다. `ref-` 로 시작하는 파일에만 적용한다.

### 1. `ref-brand-leak` (error)

산출물의 **보이는 텍스트**에 대상 회사명·서비스명·도메인이 남아 있으면 오류.

```js
{ id:'ref-brand-leak', level:'error',
  only: f => /^ref-/.test(f),
  why: '그 회사인 척하는 순간 참고가 아니라 사칭이 된다',
  test: s => {
    const BRANDS = ['당근','daangn','토스','toss','배민','배달의민족','baemin',
                    '쿠팡','coupang','네이버','naver','카카오','kakao'];
    const body = s.slice(s.indexOf('<body'))
                  .replace(/<!--[\s\S]*?-->/g,'')      // 주석은 추적정보라 허용
                  .replace(/<script[\s\S]*?<\/script>/g,'');
    const hit = BRANDS.filter(b => new RegExp(b,'i').test(body));
    return hit.length ? `보이는 텍스트에 대상 브랜드: ${hit.join(', ')}` : null;
  }}
```

**주석은 예외다.** `<!-- 시스템 출처: refs/daangn.md -->` 는 추적정보라 남겨야 한다.
화면에 보이면 안 되는 것이지 파일에 있으면 안 되는 게 아니다
(파이프라인 메타 규칙과 같은 원리다).

### 2. `ref-asset-host` (error)

그 회사 CDN·에셋 호스트를 참조하면 오류. 로고·아이콘·사진 원본이 딸려오는 경로다.

```js
{ id:'ref-asset-host', level:'error',
  only: f => /^ref-/.test(f),
  why: '그 회사의 사진·아이콘 원본은 가져오지 않는다',
  test: s => {
    const HOSTS = ['daangn.com','toss.im','tossface','baemin.com','woowahan.com',
                   'coupangcdn','pstatic.net','kakaocdn.net','karrotmarket'];
    const hit = HOSTS.filter(h => s.includes(h));
    return hit.length ? `외부 에셋 호스트 참조: ${hit.join(', ')}` : null;
  }}
```

### 3. `ref-source-note` (error)

`ref-` 산출물은 **어느 시스템을 측정해 만들었는지 주석으로 밝혀야** 한다.
출처를 숨기는 순간 참고가 아니라 도용처럼 보인다.

```js
{ id:'ref-source-note', level:'error',
  only: f => /^ref-/.test(f),
  why: '출처를 밝히는 것이 참고와 도용을 가른다',
  test: s => /<!--[^>]*refs\/[a-z0-9-]+\.md/.test(s)
    ? null : '<!-- 시스템 출처: refs/<회사>.md --> 주석이 없음' }
```

### 4. `ref-svg-logo` (warn)

인라인 SVG의 `path` 가 30개를 넘으면 로고·아이콘 세트를 통째로 옮겼을 가능성이 있다.
자동 판정은 불가하니 경고로 두고 사람이 본다.

### 5. `ref-copy-verbatim` (수동)

**자동화하지 않는다.** 원문 카피를 한 문장이라도 그대로 옮겼는지는 만든 쪽이 안다.
`refs/<회사>.md` 에 **원문 카피를 적어 두지 않는 것**으로 유혹 자체를 없앤다 —
측정값만 적고 문장은 적지 않는다.

## `refs/*.md` 에 적지 않는 것

측정 문서에도 선이 있다.

- ❌ 원문 카피 문장 (한 줄도)
- ❌ 로고 SVG 경로 데이터
- ❌ 그 회사 이미지 URL
- ✅ 숫자·색값·셀렉터 구조·규칙 문장(내가 도출한 것)

**측정 문서는 "무엇이 어떻게 짜여 있는가"만 담는다.** "무엇이라고 쓰여 있는가"는 담지 않는다.

## 사람이 마지막에 보는 것

검사기를 다 통과해도 아래는 눈으로 본다.

1. 이 페이지를 그 회사 사람이 봤을 때 **자기네 페이지로 오인할 여지**가 있는가
2. 브랜드명을 지웠을 뿐 **나머지가 통째로 그 회사**인가
3. 발명한 브랜드가 그 회사와 **같은 업종**인가 — 같은 업종이면 오인 위험이 커진다.
   시스템은 가져오되 **업종은 옮기는 편이 안전하다**

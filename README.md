# Flowly — 랜딩 페이지 템플릿

Figma 스타일의 모던한 **기업/서비스 랜딩 페이지** 템플릿입니다.
빌드 도구 없이 `index.html`을 브라우저에서 바로 열면 동작합니다.

## 기술 스택
- **HTML** — 시맨틱 마크업
- **Tailwind CSS** (CDN) — 유틸리티 기반 스타일링
- **Vanilla JS** — 스크롤 애니메이션, 네비게이션, FAQ 아코디언
- **Pretendard** — 한글 웹폰트

## 폴더 구조
```
figma-landing/
├── index.html        # 메인 페이지 (모든 섹션)
├── css/styles.css    # Tailwind 위에 얹는 커스텀 스타일
├── js/main.js        # 인터랙션 스크립트
├── assets/           # 이미지 등 정적 파일
└── README.md
```

## 포함된 섹션
1. 고정 네비게이션 (스크롤 반응)
2. 히어로 (그라데이션 + 떠다니는 목업)
3. 신뢰 로고 스트립
4. 기능 카드 그리드 (6개)
5. 쇼케이스 (좌우 교차 배치)
6. 통계(Stats) 배너
7. 고객 후기
8. 가격 요금제 (3단)
9. FAQ 아코디언
10. CTA 배너 + 푸터

## 실행 방법
파일을 더블클릭해서 열거나, 로컬 서버로 실행:
```bash
cd figma-landing
python3 -m http.server 5500
# 브라우저에서 http://localhost:5500 접속
```

## 커스터마이징
- **브랜드명/문구**: `index.html`의 텍스트를 직접 수정
- **색상 테마**: `index.html` 상단 `tailwind.config`의 `colors.brand` 값 변경
- **폰트**: `<head>`의 Pretendard 링크 교체

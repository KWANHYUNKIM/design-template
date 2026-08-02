// ===== Flowly — 인터랙션 스크립트 =====

document.addEventListener('DOMContentLoaded', () => {
  /* 1) 스크롤 등장 애니메이션 (IntersectionObserver) */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target); // 한 번만 실행
        }
      });
    },
    { threshold: 0.12 }
  );

  // 같은 그룹(형제) 안에서는 살짝 시차를 줘 계단식으로 등장
  revealEls.forEach((el) => {
    const siblings = Array.from(el.parentElement.querySelectorAll(':scope > [data-reveal]'));
    const idx = siblings.indexOf(el);
    if (idx > 0) el.style.setProperty('--reveal-delay', `${Math.min(idx, 5) * 0.08}s`);
    io.observe(el);
  });

  /* 2) 네비게이션 바 — 스크롤 시 그림자 강조 */
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    const bar = navbar.querySelector('div');
    if (window.scrollY > 20) {
      bar.classList.add('shadow-lg', 'bg-white/90');
      bar.classList.remove('bg-white/70');
    } else {
      bar.classList.remove('shadow-lg', 'bg-white/90');
      bar.classList.add('bg-white/70');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 3) FAQ 아코디언 */
  document.querySelectorAll('.faq-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-a');
      const icon = item.querySelector('.faq-icon');
      const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';

      // 다른 항목 모두 닫기
      document.querySelectorAll('.faq-a').forEach((a) => (a.style.maxHeight = '0px'));
      document.querySelectorAll('.faq-icon').forEach((i) => {
        i.textContent = '+';
        i.classList.remove('rotate-45');
      });

      if (!isOpen) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.textContent = '×';
      }
    });
  });

  /* 4) 앵커 링크 부드러운 스크롤 (네비 높이 보정) */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
});

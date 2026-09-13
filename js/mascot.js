/**
 * 吉祥物 (LiyuChillGuy) 自由拖曳與互動邏輯
 * 支援滑鼠 (Desktop) 與觸控 (Mobile) 自由拖曳至全螢幕任何角落
 * 點擊顯示高中學測衝刺名師激勵語錄
 * 雙擊可快速歸位回左下角
 */

(function () {
  const mascot = document.getElementById("mascot-container");
  if (!mascot) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let hasMoved = false;

  // 初始化位置：確保左下角停駐且以 left/top 絕對數值計算
  function initMascotPosition() {
    const rect = mascot.getBoundingClientRect();
    mascot.style.left = `${rect.left}px`;
    mascot.style.top = `${rect.top}px`;
    mascot.style.bottom = "auto";
    mascot.style.right = "auto";
  }

  // 頁面載入後初始化坐標
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(initMascotPosition, 100);
  });
  window.addEventListener("resize", () => {
    clampToViewport();
  });

  function clampToViewport() {
    const rect = mascot.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let newLeft = rect.left;
    let newTop = rect.top;

    if (newLeft < 0) newLeft = 10;
    if (newLeft + rect.width > winWidth) newLeft = winWidth - rect.width - 10;

    if (newTop < 0) newTop = 10;
    if (newTop + rect.height > winHeight) newTop = winHeight - rect.height - 10;

    mascot.style.left = `${newLeft}px`;
    mascot.style.top = `${newTop}px`;
  }

  // 滑鼠事件
  mascot.addEventListener("mousedown", (e) => {
    // 忽略右鍵
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY);
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    dragMove(e.clientX, e.clientY);
  });

  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    endDrag();
  });

  // 觸控事件 (Mobile)
  mascot.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    if (e.touches.length === 1) {
      dragMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault(); // 防止滾動
    }
  }, { passive: false });

  window.addEventListener("touchend", () => {
    if (!isDragging) return;
    endDrag();
  });

  function startDrag(clientX, clientY) {
    isDragging = true;
    hasMoved = false;
    startX = clientX;
    startY = clientY;

    const rect = mascot.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    mascot.classList.add("is-dragging");
  }

  function dragMove(clientX, clientY) {
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    // 若移動超過 6px 認定為拖曳，非單純點擊
    if (Math.hypot(deltaX, deltaY) > 6) {
      hasMoved = true;
    }

    let nextLeft = initialLeft + deltaX;
    let nextTop = initialTop + deltaY;

    // 視窗邊界限制保護
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const mascotWidth = mascot.offsetWidth;
    const mascotHeight = mascot.offsetHeight;

    nextLeft = Math.max(8, Math.min(winWidth - mascotWidth - 8, nextLeft));
    nextTop = Math.max(8, Math.min(winHeight - mascotHeight - 8, nextTop));

    mascot.style.left = `${nextLeft}px`;
    mascot.style.top = `${nextTop}px`;
    mascot.style.bottom = "auto";
    mascot.style.right = "auto";
  }

  function endDrag() {
    isDragging = false;
    mascot.classList.remove("is-dragging");
  }

  // 雙擊吉祥物：自動返回左下角預設位置
  mascot.addEventListener("dblclick", () => {
    mascot.style.left = "24px";
    mascot.style.top = `${window.innerHeight - mascot.offsetHeight - 24}px`;
  });

  // 全螢幕模式自動跟隨：確保簡報全螢幕投影時吉祥物依然顯示，並可自由拖曳
  function handleFullscreenChange() {
    const fsEl = document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement || 
                 document.msFullscreenElement;
    if (fsEl) {
      fsEl.appendChild(mascot);
      mascot.style.zIndex = "99999";
    } else {
      document.body.appendChild(mascot);
      mascot.style.zIndex = "99999";
    }
    setTimeout(clampToViewport, 80);
  }

  ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach(evt => {
    document.addEventListener(evt, handleFullscreenChange);
  });

  // 對外公開 API
  window.GSAT_MASCOT = {
    resetPosition: () => {
      mascot.style.left = "24px";
      mascot.style.top = `${window.innerHeight - mascot.offsetHeight - 24}px`;
    },
    clampToViewport: clampToViewport,
    handleFullscreenChange: handleFullscreenChange
  };
})();

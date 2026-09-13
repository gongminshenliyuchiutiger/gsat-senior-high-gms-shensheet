/**
 * 核心應用程式控制中樞 (App Controller)
 * 整合 18 單元講義、模式切換、即時搜尋、字級調整與學測衝刺倒數
 */

(function () {
  let units = window.GSAT_UNITS || [];
  let currentUnitId = 1;
  let currentMode = "presentation"; // 'presentation' | 'reading' | 'quiz'
  let currentFontSize = 16;

  // DOM 元素
  const unitTitleText = document.getElementById("unit-title-text");
  const unitCategoryTag = document.getElementById("unit-category-tag");
  const btnPrevUnit = document.getElementById("btn-prev-unit");
  const btnNextUnit = document.getElementById("btn-next-unit");
  const unitSelectBtn = document.getElementById("unit-select-btn");
  const currentUnitLabel = document.getElementById("current-unit-label");

  // 模式容器
  const presContainer = document.getElementById("presentation-container");
  const readingContainer = document.getElementById("reading-container");
  const quizContainer = document.getElementById("quiz-mode-container");
  const readingContent = document.getElementById("reading-content");
  const tocList = document.getElementById("toc-list");
  const quizModeQuestions = document.getElementById("quiz-mode-questions");

  // 模式切換按鈕
  const modeBtns = document.querySelectorAll(".mode-btn");

  // 單元選單彈窗
  const unitMenuModal = document.getElementById("unit-menu-modal");
  const btnCloseUnitMenu = document.getElementById("btn-close-unit-menu");

  // 搜尋彈窗
  const searchInput = document.getElementById("global-search-input");
  const searchModal = document.getElementById("search-modal-backdrop");
  const searchModalInput = document.getElementById("search-modal-input");
  const searchResultsList = document.getElementById("search-results-list");
  const btnCloseSearch = document.getElementById("btn-close-search");

  // 輔助工具
  const btnTheme = document.getElementById("btn-toggle-theme");
  const btnFontPlus = document.getElementById("btn-font-plus");
  const btnFontMinus = document.getElementById("btn-font-minus");
  const countdownDaysSpan = document.getElementById("countdown-days");

  // 初始化
  function init() {
    initTheme();
    renderUnitMenu();

    // 支援 URL 參數 (例如 ?mode=quiz&theme=light)
    const urlParams = new URLSearchParams(window.location.search);
    const paramTheme = urlParams.get("theme");
    const paramMode = urlParams.get("mode");

    if (paramTheme && (paramTheme === "light" || paramTheme === "dark")) {
      document.documentElement.setAttribute("data-theme", paramTheme);
      localStorage.setItem("gsat_theme", paramTheme);
      updateThemeIcon(paramTheme);
    }

    if (paramMode && ["presentation", "reading", "quiz"].includes(paramMode)) {
      currentMode = paramMode;
    }

    // 檢查 URL Hash (例如 #unit-1-quiz 或 #quiz 或 #light)
    const hash = window.location.hash;
    if (hash.includes("quiz")) currentMode = "quiz";
    if (hash.includes("reading")) currentMode = "reading";
    if (hash.includes("presentation")) currentMode = "presentation";
    if (hash.includes("light")) {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("gsat_theme", "light");
      updateThemeIcon("light");
    }
    const unitMatch = hash.match(/unit-(\d+)/);
    if (unitMatch) {
      const parsedId = parseInt(unitMatch[1], 10);
      if (parsedId >= 1 && parsedId <= units.length) {
        currentUnitId = parsedId;
      }
    }

    loadUnit(currentUnitId);
    if (currentMode !== "presentation") {
      switchMode(currentMode);
    }
    const paramSlide = urlParams.get("slide");
    if (paramSlide && currentMode === "presentation") {
      const sIdx = parseInt(paramSlide, 10);
      if (!isNaN(sIdx) && window.GSAT_PRESENTATION) {
        setTimeout(() => {
          window.GSAT_PRESENTATION.goToSlide(sIdx - 1);
        }, 150);
      }
    }
    bindEvents();
  }

  // 載入指定單元
  function loadUnit(unitId) {
    const unit = units.find(u => u.id === unitId) || units[0];
    if (!unit) return;

    currentUnitId = unit.id;
    window.location.hash = `#unit-${unit.id}`;

    // 更新頂部資訊橫幅（主標題與括號子重點換行顯示）
    if (unitTitleText) {
      const match = unit.title.match(/^(.*?)[\s]*([（\(].*)$/);
      if (match) {
        unitTitleText.innerHTML = `<div>${match[1].trim()}</div><div style="font-size: 0.82em; opacity: 0.88; margin-top: 4px; font-weight: 700; color: var(--accent-cyan);">${match[2].trim()}</div>`;
      } else {
        unitTitleText.textContent = unit.title;
      }
    }
    if (currentUnitLabel) {
      const match = unit.title.match(/^(.*?)[\s]*([（\(].*)$/);
      if (match) {
        currentUnitLabel.innerHTML = `
          <strong class="unit-nav-main">${match[1].trim()}</strong>
          <span class="unit-nav-sub">${match[2].trim()}</span>
        `;
      } else {
        currentUnitLabel.innerHTML = `<strong class="unit-nav-main">${unit.title}</strong>`;
      }
    }
    if (unitCategoryTag) {
      unitCategoryTag.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${unit.category}（第 ${unit.id} 單元 / 共 18 單元）`;
    }

    // 更新單元前後導覽按鈕
    if (btnPrevUnit) btnPrevUnit.disabled = currentUnitId <= 1;
    if (btnNextUnit) btnNextUnit.disabled = currentUnitId >= units.length;

    // 依據當前模式載入相應視圖
    if (currentMode === "presentation") {
      if (window.GSAT_PRESENTATION) {
        window.GSAT_PRESENTATION.loadUnitSlides(unit);
      }
    } else if (currentMode === "reading") {
      renderReadingMode(unit);
    } else if (currentMode === "quiz") {
      renderQuizMode(unit);
    }

    // 更新單元選單中的高亮
    document.querySelectorAll(".unit-item-btn").forEach(btn => {
      const id = parseInt(btn.getAttribute("data-unit-id"), 10);
      if (id === currentUnitId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 切換模式
  function switchMode(mode) {
    currentMode = mode;

    modeBtns.forEach(btn => {
      if (btn.getAttribute("data-mode") === mode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    if (mode !== "presentation" && window.GSAT_PRESENTATION && window.GSAT_PRESENTATION.closePen) {
      window.GSAT_PRESENTATION.closePen();
    }

    if (presContainer) presContainer.classList.remove("active");
    if (readingContainer) readingContainer.classList.remove("active");
    if (quizContainer) quizContainer.classList.remove("active");

    const currentUnit = units.find(u => u.id === currentUnitId) || units[0];

    if (mode === "presentation") {
      presContainer.classList.add("active");
      if (window.GSAT_PRESENTATION) {
        window.GSAT_PRESENTATION.loadUnitSlides(currentUnit);
      }
    } else if (mode === "reading") {
      readingContainer.classList.add("active");
      renderReadingMode(currentUnit);
    } else if (mode === "quiz") {
      quizContainer.classList.add("active");
      renderQuizMode(currentUnit);
    }
  }

  // 將通用 Emoji 轉換為標準 Font Awesome 圖標
  function replaceEmojisWithFontAwesome(text) {
    if (!text) return "";
    if (window.GSAT_QUIZ && window.GSAT_QUIZ.replaceEmojisWithFontAwesome) {
      return window.GSAT_QUIZ.replaceEmojisWithFontAwesome(text);
    }
    return text
      .replace(/📝/g, '<i class="fa-solid fa-pen-to-square"></i>')
      .replace(/📌/g, '<i class="fa-solid fa-thumbtack"></i>')
      .replace(/[☑✔]/g, '<i class="fa-solid fa-check text-success"></i>')
      .replace(/[☒✘]/g, '<i class="fa-solid fa-xmark text-danger"></i>')
      .replace(/💡/g, '<i class="fa-solid fa-lightbulb"></i>')
      .replace(/🎉/g, '<i class="fa-solid fa-circle-check text-success"></i>')
      .replace(/💪/g, '<i class="fa-solid fa-circle-xmark text-danger"></i>');
  }

  // 渲染講義精讀模式
  function renderReadingMode(unit) {
    if (!readingContent) return;

    let mdText = unit.content;

    // 把立即演練或公民神演練區塊轉化為互動卡片標記
    const quizBlocks = [];
    const quizRegex = />\s*###\s*(?:<i[^>]*><\/i>\s*)?(?:📝\s*)?(?:立即演練|公民神演練)[！!]?[\s\S]*?(?=(?:\r?\n---|\r?\n##|$))/g;

    let replacedMd = mdText.replace(quizRegex, (match) => {
      const quizObj = window.GSAT_QUIZ.parseQuizBlock(match);
      const placeholder = `%%QUIZ_PLACEHOLDER_${quizBlocks.length}%%`;
      quizBlocks.push(quizObj);
      return `\n\n${placeholder}\n\n`;
    });

    // 轉換所有 Emoji 為 Font Awesome 圖標
    replacedMd = replaceEmojisWithFontAwesome(replacedMd);

    // Marked.js 解析（包含 KaTeX 數學公式安全保護）
    let renderedHtml = window.parseMarkdownWithMath
      ? window.parseMarkdownWithMath(replacedMd)
      : (window.marked ? window.marked.parse(replacedMd) : replacedMd);

    // 回填題目互動卡片
    quizBlocks.forEach((q, idx) => {
      const placeholder = `%%QUIZ_PLACEHOLDER_${idx}%%`;
      const quizHtml = window.GSAT_QUIZ.renderQuizHtml(q, idx, false);
      renderedHtml = renderedHtml.replace(placeholder, quizHtml);
    });

    readingContent.innerHTML = renderedHtml;

    // 自動建置大綱目錄 TOC
    buildToc(readingContent);

    // KaTeX 數學公式渲染
    if (window.renderMathInElement) {
      window.renderMathInElement(readingContent, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    }
  }

  // 自動提取章節標題建置側邊目錄
  function buildToc(contentEl) {
    if (!tocList || !contentEl) return;
    tocList.innerHTML = "";

    const headings = contentEl.querySelectorAll("h2, h3");
    if (headings.length === 0) {
      tocList.innerHTML = '<li class="toc-item"><span style="color:var(--text-muted);font-size:0.82rem;">（本單元無次級標題）</span></li>';
      return;
    }

    headings.forEach((h, index) => {
      let text = h.textContent.trim();
      text = text.replace(/^(?:<i[^>]*><\/i>\s*)+/gi, "").replace(/^[📌📝\s]+/, "").trim();
      const slug = `heading-${index}`;
      h.id = slug;

      const isH2 = h.tagName.toLowerCase() === "h2";
      const li = document.createElement("li");
      li.className = `toc-item ${isH2 ? 'level-2' : 'level-3'}`;
      li.innerHTML = `
        <a href="#${slug}">
          <i class="${isH2 ? 'fa-solid fa-folder-open' : 'fa-solid fa-thumbtack'}"></i> ${text}
        </a>
      `;

      li.querySelector("a").addEventListener("click", (e) => {
        e.preventDefault();
        h.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      tocList.appendChild(li);
    });
  }

  // 渲染學測題庫模式
  function renderQuizMode(unit) {
    if (!quizModeQuestions) return;

    // 抓取當前單元中所有的立即演練或公民神演練
    const raw = unit.content;
    const quizRegex = />\s*###\s*(?:<i[^>]*><\/i>\s*)?(?:📝\s*)?(?:立即演練|公民神演練)[！!]?[\s\S]*?(?=(?:\r?\n---|\r?\n##|$))/g;
    const quizzes = [];
    let match;
    while ((match = quizRegex.exec(raw)) !== null) {
      const q = window.GSAT_QUIZ.parseQuizBlock(match[0]);
      if (q) quizzes.push(q);
    }

    document.getElementById("quiz-count-stat").textContent = `${quizzes.length} 題`;

    if (quizzes.length === 0) {
      quizModeQuestions.innerHTML = `
        <div style="text-align:center; padding: 40px; background:var(--bg-surface); border-radius:var(--radius-md); border:1px solid var(--border-color);">
          <i class="fa-solid fa-clipboard-check" style="font-size: 2.5rem; color: #10b981; margin-bottom: 12px;"></i>
          <h3>本單元練習題已同步整合至講義核心段落！</h3>
          <p style="color:var(--text-muted); margin-top: 8px;">請切換至【簡報投影模式】或【講義精讀模式】隨堂演練！</p>
        </div>
      `;
      return;
    }

    let html = "";
    quizzes.forEach((q, idx) => {
      html += window.GSAT_QUIZ.renderQuizHtml(q, idx, false);
    });

    quizModeQuestions.innerHTML = html;

    // KaTeX 數學公式渲染
    if (window.renderMathInElement) {
      window.renderMathInElement(quizModeQuestions, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    }
  }

  // 渲染單元切換選單清單
  function renderUnitMenu() {
    const socialGrid = document.getElementById("units-grid-social");
    const lawGrid = document.getElementById("units-grid-law");
    const econGrid = document.getElementById("units-grid-econ");

    if (!socialGrid || !lawGrid || !econGrid) return;

    socialGrid.innerHTML = "";
    lawGrid.innerHTML = "";
    econGrid.innerHTML = "";

    units.forEach(u => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unit-item-btn";
      btn.setAttribute("data-unit-id", u.id);
      const match = u.title.match(/^(.*?)[\s]*([（\(].*)$/);
      if (match) {
        btn.innerHTML = `
          <i class="fa-solid fa-book-bookmark"></i>
          <span class="unit-menu-item-text">
            <strong class="unit-menu-main">${match[1].trim()}</strong>
            <span class="unit-menu-sub">${match[2].trim()}</span>
          </span>
        `;
      } else {
        btn.innerHTML = `
          <i class="fa-solid fa-book-bookmark"></i>
          <span class="unit-menu-item-text">
            <strong class="unit-menu-main">${u.title}</strong>
          </span>
        `;
      }

      btn.addEventListener("click", () => {
        loadUnit(u.id);
        unitMenuModal.classList.remove("open");
      });

      if (u.id <= 6) {
        socialGrid.appendChild(btn);
      } else if (u.id <= 12) {
        lawGrid.appendChild(btn);
      } else {
        econGrid.appendChild(btn);
      }
    });
  }

  // 全域即時搜尋
  function handleSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      searchResultsList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">請輸入欲搜尋之學測核心關鍵字（如：外部性、罪刑法定、兩公約、比例原則...）</div>';
      return;
    }

    const results = [];
    units.forEach(u => {
      const titleMatch = u.title.toLowerCase().includes(q);
      const contentIndex = u.content.toLowerCase().indexOf(q);

      if (titleMatch || contentIndex !== -1) {
        let snippet = "";
        if (contentIndex !== -1) {
          const start = Math.max(0, contentIndex - 35);
          const end = Math.min(u.content.length, contentIndex + 65);
          snippet = "..." + u.content.substring(start, end).replace(/\r?\n/g, " ") + "...";
        } else {
          snippet = "單元標題完全符合搜尋關鍵字。";
        }

        results.push({
          unit: u,
          snippet: snippet
        });
      }
    });

    if (results.length === 0) {
      searchResultsList.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px;"><i class="fa-solid fa-face-meh"></i> 查無與「${query}」相符之講義內容</div>`;
      return;
    }

    let html = "";
    results.forEach(res => {
      // 標註關鍵字高亮
      const safeRegex = new RegExp(`(${q})`, "gi");
      const highlightedSnippet = res.snippet.replace(safeRegex, '<strong style="color:#fde047;background:rgba(234,179,8,0.2);padding:1px 4px;border-radius:4px;">$1</strong>');

      html += `
        <div class="search-result-item" data-unit-id="${res.unit.id}">
          <div class="search-result-unit">
            <i class="fa-solid fa-graduation-cap"></i> ${res.unit.title}
          </div>
          <div class="search-result-snippet">
            ${highlightedSnippet}
          </div>
        </div>
      `;
    });

    searchResultsList.innerHTML = html;

    // 綁定點擊跳轉
    searchResultsList.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => {
        const uId = parseInt(item.getAttribute("data-unit-id"), 10);
        loadUnit(uId);
        searchModal.classList.remove("open");
      });
    });
  }

  // 學測倒數計時計算
  function initCountdown() {
    if (!countdownDaysSpan) return;
    const now = new Date();
    // 學測通常於每年 1 月中下旬 (1/20) 舉行
    let examYear = now.getFullYear();
    let examDate = new Date(examYear, 0, 20);
    if (now > examDate) {
      examDate = new Date(examYear + 1, 0, 20);
    }
    const diffTime = examDate - now;
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    countdownDaysSpan.textContent = `倒數 ${diffDays} 天`;
  }

  // 深淺主題切換
  function initTheme() {
    const savedTheme = localStorage.getItem("gsat_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("gsat_theme", nextTheme);
    updateThemeIcon(nextTheme);
  }

  function updateThemeIcon(theme) {
    if (!btnTheme) return;
    if (theme === "dark") {
      btnTheme.innerHTML = '<i class="fa-solid fa-sun" style="color:#f59e0b;"></i>';
      btnTheme.title = "切換至淺色模式";
    } else {
      btnTheme.innerHTML = '<i class="fa-solid fa-moon" style="color:#2563eb;"></i>';
      btnTheme.title = "切換至深色模式";
    }
  }

  // 事件綁定
  function bindEvents() {
    // 模式切換按鈕
    modeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        switchMode(mode);
      });
    });

    // 單元前後切換按鈕
    if (btnPrevUnit) {
      btnPrevUnit.addEventListener("click", () => {
        if (currentUnitId > 1) loadUnit(currentUnitId - 1);
      });
    }
    if (btnNextUnit) {
      btnNextUnit.addEventListener("click", () => {
        if (currentUnitId < units.length) loadUnit(currentUnitId + 1);
      });
    }

    // 單元選單開啟 / 關閉
    if (unitSelectBtn) {
      unitSelectBtn.addEventListener("click", () => {
        unitMenuModal.classList.add("open");
      });
    }
    if (btnCloseUnitMenu) {
      btnCloseUnitMenu.addEventListener("click", () => {
        unitMenuModal.classList.remove("open");
      });
    }
    if (unitMenuModal) {
      unitMenuModal.addEventListener("click", (e) => {
        if (e.target === unitMenuModal) unitMenuModal.classList.remove("open");
      });
    }

    // 搜尋功能
    if (searchInput) {
      searchInput.addEventListener("focus", () => {
        searchModal.classList.add("open");
        if (searchModalInput) {
          searchModalInput.value = searchInput.value;
          searchModalInput.focus();
          handleSearch(searchInput.value);
        }
      });
    }
    if (searchModalInput) {
      searchModalInput.addEventListener("input", (e) => {
        handleSearch(e.target.value);
      });
    }
    if (btnCloseSearch) {
      btnCloseSearch.addEventListener("click", () => {
        searchModal.classList.remove("open");
      });
    }
    if (searchModal) {
      searchModal.addEventListener("click", (e) => {
        if (e.target === searchModal) searchModal.classList.remove("open");
      });
    }

    // 主題切換
    if (btnTheme) btnTheme.addEventListener("click", toggleTheme);

    // 字體大小縮放
    if (btnFontPlus) {
      btnFontPlus.addEventListener("click", () => {
        if (currentFontSize < 24) {
          currentFontSize += 2;
          document.documentElement.style.fontSize = `${currentFontSize}px`;
        }
      });
    }
    if (btnFontMinus) {
      btnFontMinus.addEventListener("click", () => {
        if (currentFontSize > 13) {
          currentFontSize -= 2;
          document.documentElement.style.fontSize = `${currentFontSize}px`;
        }
      });
    }

    // 全域鍵盤快捷鍵：Ctrl+K 或 / 開啟搜尋
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey && e.key.toLowerCase() === "k") || (e.key === "/" && e.target.tagName !== "INPUT")) {
        e.preventDefault();
        searchModal.classList.add("open");
        if (searchModalInput) {
          searchModalInput.focus();
        }
      }
      if (e.key === "Escape") {
        if (searchModal) searchModal.classList.remove("open");
        if (unitMenuModal) unitMenuModal.classList.remove("open");
      }
    });
  }

  // 啟動應用
  window.addEventListener("DOMContentLoaded", init);

  window.GSAT_APP = {
    loadUnit: loadUnit,
    switchMode: switchMode,
    renderReadingMode: renderReadingMode,
    renderQuizMode: renderQuizMode
  };
})();

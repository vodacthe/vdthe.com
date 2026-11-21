(function () {
  "use strict";

  const meta = window.__PORTFOLIO_META__ || {
    locale: "en",
    rootPrefix: "",
    currentIndex: 1,
    totalChapters: 6,
    ui: {},
    pages: [],
    cmdEntries: [],
  };

  const ui = meta.ui || {};
  const isFileProtocol = window.location.protocol === "file:";

  function fixFileHref(href) {
    if (!isFileProtocol || !href) return href;
    if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return href;
    const [pathPart, hashPart] = href.split("#");
    if (pathPart === "." || pathPart === "./") {
      return "index.html" + (hashPart ? "#" + hashPart : "");
    }
    if (pathPart.endsWith("/")) {
      return pathPart + "index.html" + (hashPart ? "#" + hashPart : "");
    }
    return href;
  }

  function applyRootAndFileLinks(scope) {
    const root = scope || document;
    root.querySelectorAll("a[data-rel-root]").forEach((a) => {
      const relTarget = a.getAttribute("data-rel-root");
      if (relTarget) a.setAttribute("href", (meta.rootPrefix || "") + relTarget);
    });
    root.querySelectorAll("img[data-rel-root]").forEach((img) => {
      const relTarget = img.getAttribute("data-rel-root");
      if (relTarget) img.setAttribute("src", (meta.rootPrefix || "") + relTarget);
    });
    if (isFileProtocol) {
      root.querySelectorAll("a[href]").forEach((a) => {
        const raw = a.getAttribute("href");
        const fixed = fixFileHref(raw);
        if (fixed !== raw) a.setAttribute("href", fixed);
      });
    }
  }

  function initCodeWindows(scope) {
    (scope || document).querySelectorAll("[data-code-window]").forEach((win) => {
      if (win.dataset.bound === "1") return;
      win.dataset.bound = "1";
      const tabs = win.querySelectorAll("[data-code-tab]");
      const panels = win.querySelectorAll("[data-code-panel]");
      const copyBtn = win.querySelector("[data-copy-code]");

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const id = tab.getAttribute("data-code-tab");
          tabs.forEach((t) => {
            const active = t === tab;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", active ? "true" : "false");
          });
          panels.forEach((p) => {
            p.classList.toggle("is-active", p.getAttribute("data-code-panel") === id);
          });
        });
      });

      if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
          const activePanel = win.querySelector(".code-panel.is-active code");
          if (!activePanel) return;
          try {
            await navigator.clipboard.writeText(activePanel.textContent || "");
            const oldText = copyBtn.textContent;
            copyBtn.textContent = ui.copiedCode || "Copied";
            setTimeout(() => {
              copyBtn.textContent = oldText;
            }, 1400);
          } catch {
            // Clipboard permission unavailable; ignore silently
          }
        });
      }
    });
  }

  function initFilters(scope) {
    (scope || document).querySelectorAll("[data-filter-group]").forEach((group) => {
      if (group.dataset.bound === "1") return;
      group.dataset.bound = "1";
      const groupName = group.getAttribute("data-filter-group");
      const chapter = group.closest(".chapter") || document;
      const target = chapter.querySelector(`[data-filter-target="${groupName}"]`);
      if (!target) return;

      const buttons = group.querySelectorAll("[data-filter-value]");
      const items = target.querySelectorAll("[data-category]");

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const val = btn.getAttribute("data-filter-value");
          buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
          items.forEach((item) => {
            const match = val === "all" || item.getAttribute("data-category") === val;
            item.classList.toggle("is-hidden", !match);
          });
        });
      });
    });
  }

  function initSkillSearch(scope) {
    (scope || document).querySelectorAll("[data-skill-search]").forEach((input) => {
      if (input.dataset.bound === "1") return;
      input.dataset.bound = "1";
      const chapter = input.closest(".chapter") || document;
      const grid = chapter.querySelector('[data-filter-target="skills"]');
      if (!grid) return;
      const cards = grid.querySelectorAll(".skill-card");

      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        cards.forEach((card) => {
          const tags = card.querySelectorAll(".skill-tag");
          let anyMatch = false;
          tags.forEach((tag) => {
            const text = tag.getAttribute("data-skill-text") || "";
            const hit = q.length > 0 && text.includes(q);
            tag.classList.toggle("is-match", hit);
            if (!q || hit) anyMatch = true;
          });
          const titleHit = !q || (card.querySelector("h3")?.textContent || "").toLowerCase().includes(q);
          card.classList.toggle("is-hidden", Boolean(q) && !anyMatch && !titleHit);
        });
      });
    });
  }

  // Lightbox controller for media galleries
  const lightboxDialog = document.getElementById("lightbox-dialog");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const lightboxRaw = document.getElementById("lightbox-raw");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const lightboxClose = document.getElementById("lightbox-close");
  let activeGalleryItems = [];
  let activeGalleryIdx = 0;

  function showLightboxAt(idx) {
    if (!lightboxDialog || !activeGalleryItems.length) return;
    const total = activeGalleryItems.length;
    activeGalleryIdx = ((idx % total) + total) % total;
    const item = activeGalleryItems[activeGalleryIdx];
    const href = item.getAttribute("href") || "";
    const title = item.getAttribute("data-lightbox-title") || "";
    const caption = item.getAttribute("data-lightbox-caption") || "";

    if (lightboxImg) {
      lightboxImg.src = href;
      lightboxImg.alt = title ? `${title} — ${caption}` : "Preview";
    }
    if (lightboxTitle) lightboxTitle.textContent = title;
    if (lightboxCaption) lightboxCaption.textContent = caption;
    if (lightboxCounter) {
      lightboxCounter.textContent = `${String(activeGalleryIdx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    }
    if (lightboxRaw) lightboxRaw.href = href;
  }

  function initMediaGalleries(scope) {
    (scope || document).querySelectorAll("[data-media-gallery]").forEach((galleryEl) => {
      if (galleryEl.dataset.bound === "1") return;
      galleryEl.dataset.bound = "1";
      const triggers = Array.from(galleryEl.querySelectorAll("a[data-lightbox-item]"));
      triggers.forEach((trigger, idx) => {
        trigger.addEventListener("click", (ev) => {
          if (!lightboxDialog || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
          ev.preventDefault();
          activeGalleryItems = triggers;
          showLightboxAt(idx);
          if (typeof lightboxDialog.showModal === "function") {
            if (!lightboxDialog.open) lightboxDialog.showModal();
          } else {
            lightboxDialog.setAttribute("open", "open");
          }
        });
      });
    });
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => showLightboxAt(activeGalleryIdx - 1));
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => showLightboxAt(activeGalleryIdx + 1));
  }
  if (lightboxClose && lightboxDialog) {
    lightboxClose.addEventListener("click", () => lightboxDialog.close());
  }
  if (lightboxDialog) {
    lightboxDialog.addEventListener("click", (e) => {
      if (e.target === lightboxDialog) lightboxDialog.close();
    });
  }

  function initChapterInteractions(scope) {
    applyRootAndFileLinks(scope);
    initCodeWindows(scope);
    initFilters(scope);
    initSkillSearch(scope);
    initMediaGalleries(scope);
  }

  // Theme management
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("vdt-theme", next);
      } catch {
        // Ignore storage restrictions
      }
    });
  }

  // Print / Export PDF
  const printBtn = document.getElementById("print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  // Scroll Progress & Back to Top
  const progressBar = document.getElementById("scroll-progress");
  function updateScrollProgress() {
    if (!progressBar) return;
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    const pct = maxScroll > 0 ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)) : 0;
    progressBar.style.width = `${pct.toFixed(1)}%`;
  }
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  updateScrollProgress();

  const topBtn = document.getElementById("back-to-top");
  if (topBtn) {
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // Continuous Scroll Streaming + Active Tab/HUD Tracking
  const streamContainer = document.getElementById("chapter-stream");
  const sentinel = document.getElementById("stream-sentinel");
  const streamStatus = document.getElementById("stream-status");
  const streamToggleBtn = document.getElementById("stream-toggle");
  const hudStatus = document.getElementById("hud-status");
  const headerTabs = document.querySelectorAll(".ide-tab[data-tab-index]");

  const streamData = Array.isArray(window.__PORTFOLIO_STREAM__) ? window.__PORTFOLIO_STREAM__ : [];
  let loadedCount = 1;
  let maxLoadedIndex = Number(meta.currentIndex || 1);
  let activeIndex = maxLoadedIndex;

  let streamEnabled = true;
  try {
    const saved = localStorage.getItem("vdt-stream");
    if (saved === "off") streamEnabled = false;
  } catch {
    // Ignore storage restrictions
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function updateHud() {
    if (hudStatus) {
      hudStatus.textContent = `${ui.loadedModules || "LOADED"} ${loadedCount}/${meta.totalChapters} · ${pad2(activeIndex)}/${pad2(meta.totalChapters)}`;
    }
    headerTabs.forEach((tab) => {
      const idx = Number(tab.getAttribute("data-tab-index"));
      const isActive = idx === activeIndex;
      tab.classList.toggle("is-active", isActive);
      const nav = tab.parentElement;
      if (isActive && nav && nav.scrollWidth > nav.clientWidth && tab.scrollIntoView) {
        tab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    });
  }

  function updateStreamUi() {
    if (streamToggleBtn) {
      streamToggleBtn.setAttribute("aria-pressed", streamEnabled ? "true" : "false");
      const stateWord = streamEnabled ? ui.streamOn || "ON" : ui.streamOff || "OFF";
      streamToggleBtn.textContent = `${ui.streamLabel || "Stream"}: ${stateWord}`;
    }
    if (streamStatus) {
      let msg = ui.streamBannerIdle || "Scroll continuously to load remaining modules.";
      if (maxLoadedIndex >= meta.totalChapters) {
        msg = ui.streamBannerDone || "All modules loaded.";
      } else if (!streamEnabled) {
        msg = ui.streamBannerPaused || "Streaming paused.";
      }
      streamStatus.innerHTML = `<span class="mono-prompt">&gt;</span> ${msg}`;
    }
  }

  const chapterObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const idx = Number(entry.target.getAttribute("data-chapter-index"));
                if (idx && idx !== activeIndex) {
                  activeIndex = idx;
                  updateHud();
                }
              }
            });
          },
          { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
        )
      : null;

  if (chapterObserver && streamContainer) {
    streamContainer.querySelectorAll(".chapter").forEach((ch) => chapterObserver.observe(ch));
  }

  let isAppending = false;
  function appendNextChapter() {
    if (!streamEnabled || isAppending || !streamContainer || maxLoadedIndex >= meta.totalChapters) return;
    const nextIdx = maxLoadedIndex + 1;
    const payload = streamData.find((c) => Number(c.index) === nextIdx);
    if (!payload) return;

    isAppending = true;
    if (streamStatus) {
      streamStatus.innerHTML = `<span class="mono-prompt">&gt;</span> ${ui.streamBannerLoading || "Streaming"} ${pad2(nextIdx)}/${pad2(meta.totalChapters)}: ${payload.file}`;
    }

    const template = document.createElement("template");
    template.innerHTML = payload.html.trim();
    const newChapter = template.content.firstElementChild;
    if (newChapter) {
      newChapter.classList.add("is-streamed");
      streamContainer.appendChild(newChapter);
      initChapterInteractions(newChapter);
      if (chapterObserver) chapterObserver.observe(newChapter);
      maxLoadedIndex = nextIdx;
      loadedCount += 1;
      updateHud();
    }

    updateStreamUi();
    updateScrollProgress();
    isAppending = false;

    if (sentinel && streamEnabled && maxLoadedIndex < meta.totalChapters) {
      requestAnimationFrame(() => {
        const rect = sentinel.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 300) {
          appendNextChapter();
        }
      });
    }
  }

  if (sentinel && "IntersectionObserver" in window) {
    const sentinelObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          appendNextChapter();
        }
      },
      { rootMargin: "0px 0px 300px 0px", threshold: 0 }
    );
    sentinelObserver.observe(sentinel);
  }

  if (streamToggleBtn) {
    streamToggleBtn.addEventListener("click", () => {
      streamEnabled = !streamEnabled;
      try {
        localStorage.setItem("vdt-stream", streamEnabled ? "on" : "off");
      } catch {
        // Ignore storage restrictions
      }
      updateStreamUi();
      if (streamEnabled && sentinel) {
        const rect = sentinel.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 300) {
          appendNextChapter();
        }
      }
    });
  }

  // Command Palette (<dialog>)
  const cmdDialog = document.getElementById("cmd-palette");
  const cmdTrigger = document.getElementById("cmd-trigger");
  const cmdClose = document.getElementById("cmd-close");
  const cmdInput = document.getElementById("cmd-input");
  const cmdList = document.getElementById("cmd-list");

  function getAllCmdEntries() {
    const base = Array.isArray(meta.cmdEntries) ? meta.cmdEntries : [];
    const prefix = meta.rootPrefix || "";
    const langSwitch = document.querySelector(".lang-switch");
    const extra = [
      {
        group: "AI / Data",
        label: "llms.txt — AI Crawler Summary",
        keywords: "llms ai markdown summary",
        href: prefix + "llms.txt",
      },
      {
        group: "AI / Data",
        label: "llms-full.txt — Full Technical Dossier",
        keywords: "llms full markdown cv",
        href: prefix + "llms-full.txt",
      },
      {
        group: "AI / Data",
        label: "resume.json — JSON Resume v1.0.0",
        keywords: "json resume ats",
        href: prefix + "resume.json",
      },
      ...(langSwitch
        ? [
            {
              group: "Action",
              label: langSwitch.getAttribute("title") || "Switch Language (EN / VI)",
              keywords: "language english vietnamese en vi",
              href: langSwitch.getAttribute("href") || "./",
            },
          ]
        : []),
      {
        group: "Action",
        label: meta.locale === "vi" ? "Đổi giao diện Sáng / Tối" : "Toggle Dark / Light Theme",
        keywords: "theme dark light color mode",
        action: () => themeBtn && themeBtn.click(),
      },
      {
        group: "Action",
        label: meta.locale === "vi" ? "Bật / Tắt cuộn tải liên tục" : "Toggle Continuous Scroll Stream",
        keywords: "stream scroll infinite pagination",
        action: () => streamToggleBtn && streamToggleBtn.click(),
      },
      {
        group: "Action",
        label: ui.printButton || "Export PDF / Print",
        keywords: "print pdf export cv",
        action: () => window.print(),
      },
    ];
    return base.concat(extra);
  }

  function renderCmdList(query) {
    if (!cmdList) return;
    const q = (query || "").trim().toLowerCase();
    const entries = getAllCmdEntries();
    const filtered = entries
      .filter((item) => {
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          (item.keywords || "").toLowerCase().includes(q) ||
          (item.group || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 14);

    cmdList.innerHTML = "";
    if (!filtered.length) {
      const li = document.createElement("li");
      li.className = "muted-note";
      li.textContent = ui.cmdEmpty || "No results.";
      cmdList.appendChild(li);
      return;
    }

    filtered.forEach((item) => {
      const li = document.createElement("li");
      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      const groupSpan = document.createElement("span");
      groupSpan.className = "cmd-group";
      groupSpan.textContent = item.group;

      if (typeof item.action === "function") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.append(labelSpan, groupSpan);
        btn.addEventListener("click", () => {
          cmdDialog.close();
          item.action();
        });
        li.appendChild(btn);
      } else {
        const a = document.createElement("a");
        a.href = fixFileHref(item.href);
        a.append(labelSpan, groupSpan);
        a.addEventListener("click", (ev) => {
          const hashIdx = item.href.indexOf("#");
          if (hashIdx !== -1) {
            const targetId = item.href.slice(hashIdx + 1);
            const inDom = document.getElementById(targetId);
            if (inDom) {
              ev.preventDefault();
              cmdDialog.close();
              if (typeof window.__v2RevealTarget === "function") {
                window.__v2RevealTarget(targetId);
              } else {
                inDom.scrollIntoView({ behavior: "smooth" });
              }
              return;
            }
          }
          cmdDialog.close();
        });
        li.appendChild(a);
      }
      cmdList.appendChild(li);
    });
  }

  function openCmdPalette() {
    if (!cmdDialog) return;
    renderCmdList("");
    if (typeof cmdDialog.showModal === "function") {
      cmdDialog.showModal();
    } else {
      cmdDialog.setAttribute("open", "open");
    }
    if (cmdInput) {
      cmdInput.value = "";
      cmdInput.focus();
    }
  }

  if (cmdTrigger && cmdDialog) {
    cmdTrigger.addEventListener("click", openCmdPalette);
  }
  if (cmdClose && cmdDialog) {
    cmdClose.addEventListener("click", () => cmdDialog.close());
  }
  if (cmdDialog) {
    cmdDialog.addEventListener("click", (e) => {
      if (e.target === cmdDialog) cmdDialog.close();
    });
  }
  if (cmdInput) {
    cmdInput.addEventListener("input", () => renderCmdList(cmdInput.value));
    cmdInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const firstAction = cmdList?.querySelector("a, button");
        if (firstAction) firstAction.click();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (cmdDialog?.open) {
        cmdDialog.close();
      } else {
        openCmdPalette();
      }
      return;
    }
    if (lightboxDialog?.open) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showLightboxAt(activeGalleryIdx - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        showLightboxAt(activeGalleryIdx + 1);
      }
    }
  });

  // Initialize first chapter & UI states
  initChapterInteractions(document);
  updateHud();
  updateStreamUi();
})();

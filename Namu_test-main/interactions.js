export function setupWikiInteractions(root) {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const hoverPointer = matchMedia("(hover: hover) and (pointer: fine)");
  const foldings = new Map();
  const titles = new Map();
  const preview = document.createElement("div");
  preview.className = "nm-footnote-preview";
  preview.id = `${root.id || "wiki"}-footnote-preview`;
  preview.setAttribute("popover", "manual");
  preview.setAttribute("role", "dialog");
  preview.setAttribute("aria-label", "각주 내용");
  const supportsPopover = typeof preview.showPopover === "function";
  let activeNote = null;
  let showTimer, hideTimer, exitTimer, positionFrame, revealFrame;

  function toggleFolding(details, animate) {
    const previous = foldings.get(details);
    const target = !(previous?.target ?? details.open);
    const start = details.getBoundingClientRect().height;
    const original = previous?.original ?? {
      height: details.style.height,
      overflow: details.style.overflow,
      transition: details.style.transition,
    };
    previous?.cancel();

    const restore = () => {
      details.open = target;
      Object.assign(details.style, original);
      foldings.delete(details);
    };
    if (!animate || reducedMotion.matches) {
      restore();
      return;
    }

    details.style.transition = "none";
    details.style.height = "auto";
    details.open = target;
    const end = details.getBoundingClientRect().height;
    details.open = true;
    details.style.overflow = "hidden";
    details.style.height = `${start}px`;
    void details.offsetHeight;
    details.style.transition = "height var(--nm-collapse-duration) var(--nm-ease-out)";

    const finish = (event) => {
      if (event && (event.target !== details || event.propertyName !== "height")) return;
      cancel();
      restore();
    };
    const frame = requestAnimationFrame(() => { details.style.height = `${end}px`; });
    const duration = parseFloat(getComputedStyle(details).getPropertyValue("--nm-collapse-duration")) || 200;
    const timer = setTimeout(() => finish(), duration + 80);
    const cancel = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      details.removeEventListener("transitionend", finish);
    };
    details.addEventListener("transitionend", finish);
    foldings.set(details, { target, original, cancel, finish: () => finish() });
  }

  function noteContent(note) {
    const href = note.getAttribute("href");
    if (!href?.startsWith("#")) return null;
    let id;
    try { id = decodeURIComponent(href.slice(1)); } catch { return null; }
    const anchor = root.ownerDocument.getElementById(id);
    return anchor && root.contains(anchor) ? anchor.closest(".footnote-list") : null;
  }

  function positionPreview() {
    if (!activeNote || !preview.matches(":popover-open")) return;
    const anchor = activeNote.getBoundingClientRect();
    if (!activeNote.isConnected || !activeNote.getClientRects().length) {
      hidePreview(true);
      return;
    }
    const gap = 8;
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    if (anchor.bottom < 0 || anchor.top > height) {
      hidePreview(true);
      return;
    }
    const above = anchor.top - gap * 2;
    const below = height - anchor.bottom - gap * 2;
    preview.style.maxHeight = `${Math.max(24, Math.min(320, Math.max(above, below)))}px`;
    const panel = preview.getBoundingClientRect();
    const topSide = panel.height <= above || above >= below;
    const left = Math.max(gap, Math.min(anchor.left + anchor.width / 2 - panel.width / 2, width - panel.width - gap));
    const top = Math.max(gap, Math.min(topSide ? anchor.top - panel.height - gap : anchor.bottom + gap, height - panel.height - gap));
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
  }

  function schedulePosition() {
    cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(positionPreview);
  }

  function hidePreview(immediate = false) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    clearTimeout(exitTimer);
    cancelAnimationFrame(revealFrame);
    cancelAnimationFrame(positionFrame);
    preview.removeAttribute("data-visible");
    const finish = () => {
      if (supportsPopover && preview.matches(":popover-open")) preview.hidePopover();
      activeNote?.removeAttribute("aria-details");
      activeNote = null;
    };
    if (immediate) finish();
    else exitTimer = setTimeout(finish, 125);
  }

  function showPreview(note, keyboard = false) {
    if (!supportsPopover) return;
    const content = noteContent(note);
    if (!content) return;
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    clearTimeout(exitTimer);
    if (activeNote !== note) {
      activeNote?.removeAttribute("aria-details");
      const copy = content.cloneNode(true);
      copy.removeAttribute("id");
      copy.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
      preview.replaceChildren(copy);
      activeNote = note;
      note.setAttribute("aria-details", preview.id);
    }
    preview.style.transition = keyboard ? "none" : "";
    if (!preview.isConnected) root.append(preview);
    if (!preview.matches(":popover-open")) preview.showPopover();
    positionPreview();
    
    void preview.offsetHeight;
    cancelAnimationFrame(revealFrame);
    revealFrame = requestAnimationFrame(() => preview.setAttribute("data-visible", ""));
  }

  function keepPreview() {
    clearTimeout(hideTimer);
    clearTimeout(exitTimer);
    if (activeNote) preview.setAttribute("data-visible", "");
  }

  function scheduleHide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      const focused = document.activeElement;
      if (preview.contains(focused) || activeNote?.contains(focused)) return;
      hidePreview();
    }, 120);
  }

  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || event.target.closest("a, button, input, select, textarea")) return;
    const summary = event.target.closest("summary");
    const details = summary?.parentElement;
    if (details?.matches("details.wiki-folding") && root.contains(details)) {
      event.preventDefault();
      hidePreview(true);
      
      toggleFolding(details, event.detail !== 0);
      return;
    }
    const heading = event.target.closest(".wiki-heading");
    if (!heading || !root.contains(heading)) return;
    const content = heading.nextElementSibling;
    if (!content?.classList.contains("wiki-heading-content")) return;
    hidePreview(true);
    const folded = heading.classList.toggle("wiki-heading-folded");
    content.classList.toggle("wiki-heading-content-folded", folded);
  });

  root.addEventListener("pointerover", (event) => {
    if (!hoverPointer.matches || event.pointerType === "touch" || !(event.target instanceof Element)) return;
    const note = event.target.closest("a.wiki-fn-content");
    if (!note || preview.contains(note) || note.contains(event.relatedTarget)) return;
    keepPreview();
    clearTimeout(showTimer);
    const instant = activeNote && preview.matches(":popover-open");
    showTimer = setTimeout(() => showPreview(note), instant ? 0 : 100);
  });
  root.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element)) return;
    const note = event.target.closest("a.wiki-fn-content");
    if (!note || note.contains(event.relatedTarget) || preview.contains(event.relatedTarget)) return;
    scheduleHide();
  });
  preview.addEventListener("pointerenter", keepPreview);
  preview.addEventListener("pointerleave", scheduleHide);
  root.addEventListener("focusin", (event) => {
    if (!(event.target instanceof Element) || preview.contains(event.target)) return;
    const note = event.target.closest("a.wiki-fn-content");
    if (note) showPreview(note, true);
  });
  root.addEventListener("focusout", (event) => {
    if (preview.contains(event.relatedTarget) || activeNote?.contains(event.relatedTarget)) return;
    scheduleHide();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !activeNote) return;
    const trigger = activeNote;
    const returnFocus = preview.contains(document.activeElement);
    if (returnFocus) trigger.focus({ preventScroll: true });
    hidePreview(true);
    event.preventDefault();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!preview.contains(event.target) && !activeNote?.contains(event.target)) hidePreview(true);
  });
  window.addEventListener("scroll", schedulePosition, true);
  window.addEventListener("resize", schedulePosition);
  const observer = new ResizeObserver(schedulePosition);
  observer.observe(preview);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) [...foldings.values()].forEach((state) => state.finish());
  });

  return {
    refresh() {
      if (!supportsPopover) return;
      root.querySelectorAll("a.wiki-fn-content[title]").forEach((note) => {
        if (!noteContent(note)) return;
        titles.set(note, note.getAttribute("title"));
        note.removeAttribute("title");
      });
    },
    reset() {
      hidePreview(true);
      preview.remove();
      [...foldings.values()].forEach((state) => state.finish());
      titles.forEach((title, note) => note.setAttribute("title", title));
      titles.clear();
    },
  };
}

(function () {
  "use strict";

  var STORAGE_KEY = "itemTracker.items.v2";
  var TITLE_KEY = "itemTracker.title.v1";
  var LAST_UPDATED_KEY = "itemTracker.lastUpdated.v1";
  var CUSTOM_DEFAULT_KEY = "itemTracker.customDefault.v1";
  var DEFAULT_TITLE = "Items List";
  var SAVE_DEBOUNCE_MS = 500;

  // [name, spec] — pre-loaded on first run; restorable any time via "Restore".
  // Quantities are intentionally left blank for the user to fill in.
  var DEFAULT_ITEMS_DATA = [
    ["Coca-Cola Original", "500ml"],
    ["Coca-Cola Zero Sugar", "500ml"],
    ["Diet Coke", "500ml"],
    ["Sprite", "500ml"],
    ["Fanta Orange", "500ml"],
    ["Canada Dry Strawberry", "500ml"],
    ["Fresca", "500ml"],
    ["Smart Water", "591ml"],
    ["Smart Water Alkaline", "591ml"],
    ["Minute Maid Apple Juice", "355ml"],
    ["Fuze Lemon", "500ml"],
    ["Fuze Raspberry", "500ml"],
    ["Monster Ruby Red", "473ml"],
    ["Monster Ultra Wild Passion", "473ml"],
    ["Monster Aussie Lemonade", "473ml"],
    ["Monster Mean Bean", "473ml"],
    ["Monster Energy (original)", "473ml"],
    ["Monster Ultra Peachy Keen", "473ml"],
    ["Monster Mango Loco", "473ml"],
    ["Red Bull Original", "473ml"],
    ["BodyArmor Strawberry Banana", "473ml"],
    ["Vitamin Water Orange", "355ml"],
    ["Vitamin Water Blueberry Pomegranate", "355ml"],
    ["Monster Blue Hawaiian", "355ml"],
    ["Powerade Fruit Punch", "700ml"],
    ["Powerade Mixed Berry", "700ml"],
    ["Powerade Melon", "700ml"],
    ["NOS Energy", "473ml"],
    ["Coca-Cola Cherry Float", "500ml"],
    ["Coca-Cola Vanilla", "500ml"],
    ["BodyArmor Fruit Punch", "473ml"],
    ["Red Bull Pink Edition", "250ml"],
    ["Red Bull Pink Edition", "355ml"],
    ["Red Bull Summer Edition", "250ml"],
    ["Red Bull Ice Edition", "250ml"],
    ["Red Bull Original", "250ml"],
    ["Red Bull Sugar Free", "250ml"],
    ["Red Bull", "355ml"],
    ["Monster Salted Caramel", "473ml"],
    ["Monster Irish Creme", "473ml"],
    ["Red Bull Sugar Free", "473ml"],
    ["Red Bull Summer Edition", "473ml"],
    ["Red Bull", "473ml"],
    ["Smart Water", "700ml"],
    ["Smart Water", "1L"]
  ];

  var itemsBody = document.getElementById("itemsBody");
  var emptyRow = document.getElementById("emptyRow");
  var emptyRowCell = emptyRow.querySelector("td");
  var listTitleInput = document.getElementById("listTitle");
  var docDateEl = document.getElementById("docDate");
  var docUpdatedEl = document.getElementById("docUpdated");
  var saveStatusEl = document.getElementById("saveStatus");
  var searchInput = document.getElementById("searchInput");

  var isFirstRun = localStorage.getItem(STORAGE_KEY) === null;
  var items = loadItems();
  var saveTimer = null;
  var searchQuery = "";

  // ---------- persistence ----------

  function factoryDefaultItems() {
    return DEFAULT_ITEMS_DATA.map(function (row) {
      return { id: uid(), name: row[0], spec: row[1], qty: "", comment: "" };
    });
  }

  // "Set Default" lets the user save their current list as a custom
  // baseline; once saved, "Restore" brings back that snapshot instead of
  // the factory list. Falls back to the factory list until one is saved.
  function loadCustomDefault() {
    try {
      var raw = localStorage.getItem(CUSTOM_DEFAULT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("Failed to load custom default from localStorage", e);
      return null;
    }
  }

  // Quantities are never carried over here — a saved custom default may
  // have had quantities filled in when it was captured, but restoring
  // (or first-loading) a default list should always start with blank
  // quantities for the user to fill in fresh.
  function getDefaultItems() {
    var custom = loadCustomDefault();
    if (!custom || !custom.length) return factoryDefaultItems();
    return custom.map(function (item) {
      return { id: uid(), name: item.name || "", spec: item.spec || "", qty: "", comment: item.comment || "" };
    });
  }

  function loadItems() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : getDefaultItems();
    } catch (e) {
      console.error("Failed to load items from localStorage", e);
      return getDefaultItems();
    }
  }

  function loadText(key, fallback) {
    var v = localStorage.getItem(key);
    return v === null ? fallback : v;
  }

  function persistNow() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setSaveStatus("saved");
    recordLastUpdated();
  }

  function recordLastUpdated() {
    var now = new Date();
    localStorage.setItem(LAST_UPDATED_KEY, now.toISOString());
    renderLastUpdated(now);
  }

  function renderLastUpdated(date) {
    if (!date) {
      docUpdatedEl.textContent = "";
      return;
    }
    docUpdatedEl.textContent = "Last updated: " + date.toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric"
    }) + " " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function scheduleSave() {
    setSaveStatus("saving");
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      persistNow();
    }, SAVE_DEBOUNCE_MS);
  }

  function setSaveStatus(state) {
    if (state === "saving") {
      saveStatusEl.textContent = "Saving…";
      saveStatusEl.classList.add("is-saving");
    } else {
      saveStatusEl.textContent = "Saved";
      saveStatusEl.classList.remove("is-saving");
    }
  }

  // ---------- helpers ----------

  function uid() {
    return "id-" + Math.random().toString(36).slice(2) + "-" + performance.now().toString(36);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = String(str == null ? "" : str);
    return div.innerHTML;
  }

  // ---------- rendering ----------
  // Rows are rendered once per structural change (add/delete/init, or a
  // search keystroke). Edits to existing cells update the data model
  // directly without re-rendering, so inputs never lose focus while typing.

  function matchesSearch(item) {
    if (!searchQuery) return true;
    return (item.name || "").toLowerCase().indexOf(searchQuery) !== -1 ||
      (item.spec || "").toLowerCase().indexOf(searchQuery) !== -1 ||
      (item.comment || "").toLowerCase().indexOf(searchQuery) !== -1;
  }

  function render() {
    itemsBody.innerHTML = "";
    var visibleItems = items.filter(matchesSearch);

    if (items.length === 0) {
      emptyRowCell.textContent = "No items yet. Click \"Add\" to get started.";
      emptyRow.style.display = "";
    } else if (visibleItems.length === 0) {
      emptyRowCell.textContent = "No items match your search.";
      emptyRow.style.display = "";
    } else {
      emptyRow.style.display = "none";
    }

    visibleItems.forEach(function (item, index) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td class=\"col-name\"><div class=\"name-cell\"><span class=\"row-badge\">" + (index + 1) + "</span><input type=\"text\" class=\"cell-name\" data-id=\"" + item.id + "\" data-field=\"name\" value=\"" + escapeHtml(item.name) + "\" placeholder=\"Item name\"></div></td>" +
        "<td class=\"col-spec\" data-label=\"Spec\"><input type=\"text\" class=\"cell-spec\" data-id=\"" + item.id + "\" data-field=\"spec\" value=\"" + escapeHtml(item.spec) + "\" placeholder=\"Spec / details\"></td>" +
        "<td class=\"col-comment\" data-label=\"Comment\"><input type=\"text\" class=\"cell-comment\" data-id=\"" + item.id + "\" data-field=\"comment\" value=\"" + escapeHtml(item.comment) + "\" placeholder=\"Add a comment (optional)\"></td>" +
        "<td class=\"col-qty\" data-label=\"Qty\"><div class=\"qty-stepper\">" +
          "<button type=\"button\" class=\"qty-btn\" data-action=\"qty-decrement\" data-id=\"" + item.id + "\" title=\"Decrease quantity\" aria-label=\"Decrease quantity\">&minus;</button>" +
          "<input type=\"text\" inputmode=\"numeric\" class=\"cell-qty\" data-id=\"" + item.id + "\" data-field=\"qty\" value=\"" + escapeHtml(item.qty) + "\" placeholder=\"0\">" +
          "<button type=\"button\" class=\"qty-btn\" data-action=\"qty-increment\" data-id=\"" + item.id + "\" title=\"Increase quantity\" aria-label=\"Increase quantity\">&plus;</button>" +
        "</div></td>" +
        "<td class=\"col-actions\">" +
          "<button type=\"button\" class=\"delete-btn\" data-action=\"delete\" data-id=\"" + item.id + "\" title=\"Delete item\" aria-label=\"Delete item\">&times;</button>" +
        "</td>";
      itemsBody.appendChild(tr);
    });
  }

  // ---------- actions ----------

  function clearSearch() {
    searchQuery = "";
    searchInput.value = "";
  }

  // Two items are duplicates if their name AND spec match, case-insensitive
  // and trimmed (qty/comment don't factor in) — this lets legitimately
  // distinct variants like "Smart Water" 591ml vs 1L coexist, and skips the
  // check entirely for not-yet-named rows so adding several blank items in
  // a row is never blocked.
  function findDuplicate(id, name, spec) {
    name = name.trim().toLowerCase();
    if (!name) return null;
    spec = spec.trim().toLowerCase();
    return items.find(function (i) {
      return i.id !== id && i.name.trim().toLowerCase() === name && i.spec.trim().toLowerCase() === spec;
    }) || null;
  }

  function addItem() {
    // clear any active search filter so the new blank item is guaranteed
    // to be visible and focusable, regardless of what was typed
    clearSearch();
    var item = { id: uid(), name: "", spec: "", qty: "", comment: "" };
    items.push(item);
    render();
    persistNow();
    var nameInput = itemsBody.querySelector('input[data-id="' + item.id + '"][data-field="name"]');
    if (nameInput) nameInput.focus();
  }

  function deleteItem(id) {
    var item = items.find(function (i) { return i.id === id; });
    var label = (item && item.name.trim()) || "this item";
    if (!confirm("Delete \"" + label + "\"?")) return;
    items = items.filter(function (i) { return i.id !== id; });
    render();
    persistNow();
  }

  function clearAll() {
    if (!confirm("This will reset every item's quantity to blank. Continue?")) return;
    items.forEach(function (item) { item.qty = ""; });
    render();
    persistNow();
  }

  function restoreDefaults() {
    if (!confirm("This will replace your current list with the default list. Continue?")) return;
    items = getDefaultItems();
    clearSearch();
    render();
    persistNow();
  }

  function sortAlphabetically() {
    items.sort(function (a, b) {
      return a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase());
    });
    render();
    persistNow();
  }

  function saveAsDefault() {
    if (!confirm("Save the current list as your default? \"Restore\" will bring back this exact version from now on.")) return;
    localStorage.setItem(CUSTOM_DEFAULT_KEY, JSON.stringify(items));
  }

  function stepQty(id, delta) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    var current = parseInt(item.qty, 10);
    if (isNaN(current) || current < 0) current = 0;
    var next = current + delta;
    if (next < 0) next = 0;
    item.qty = String(next);
    var input = itemsBody.querySelector('input[data-id="' + id + '"][data-field="qty"]');
    if (input) input.value = item.qty;
    scheduleSave();
  }

  function isPrintable(item) {
    return Number(item.qty) > 0 || Boolean(item.comment && item.comment.trim());
  }

  function shareFilenameBase() {
    var slug = (listTitleInput.value.trim() || DEFAULT_TITLE)
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "item_list";
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var dateStr = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    var timeStr = pad(now.getHours()) + pad(now.getMinutes());
    return slug + "_at_" + dateStr + "_" + timeStr;
  }

  // ---------- shareable image ----------
  // Renders the current list as a PNG via <canvas> (no DOM screenshot lib,
  // no print/PDF pipeline) so sharing is just "produce an image file" —
  // something every platform's share sheet / Photos / Messages handles
  // reliably, unlike the old print-to-PDF dialog. Same "what's printable"
  // rule as before: an item needs a quantity set (qty > 0) or a comment to
  // be worth sharing.

  var SHARE_WIDTH = 420; // narrow, receipt-like proportions rather than a document/page width
  var SHARE_SCALE = 2; // retina-ish output resolution
  var SHARE_FONT_DISPLAY = "'Playfair Display', Georgia, 'Times New Roman', serif";
  var SHARE_COLORS = {
    bg: "#fffdf8",
    text: "#2b241c",
    muted: "#8a7c66",
    border: "#e2d7bf",
    qtyBg: "#2f9e44",
    qtyText: "#ffffff"
  };

  // Wraps text to fit maxWidth using ctx's current font, breaking on spaces
  // and falling back to character-level breaks for single overlong words.
  function wrapText(ctx, text, maxWidth) {
    var words = text.split(/\s+/).filter(Boolean);
    var lines = [];
    var line = "";

    function breakWord(word) {
      var chunk = "";
      for (var i = 0; i < word.length; i++) {
        var next = chunk + word[i];
        if (chunk && ctx.measureText(next).width > maxWidth) {
          lines.push(chunk);
          chunk = word[i];
        } else {
          chunk = next;
        }
      }
      return chunk;
    }

    words.forEach(function (word) {
      var candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        return;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      line = ctx.measureText(word).width <= maxWidth ? word : breakWord(word);
    });

    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  // Lays out the whole doc onto a throwaway measuring context first (to
  // get the exact content height), then replays the same draw instructions
  // onto a canvas sized to fit — so there's no leftover blank space.
  function buildShareCanvas() {
    var PAD_X = 32;
    var PAD_TOP = 36;
    var PAD_BOTTOM = 30;
    var QTY_BADGE_DIAM = 28;
    var QTY_BADGE_GAP = 10;
    var contentWidth = SHARE_WIDTH - PAD_X * 2;

    var measure = document.createElement("canvas").getContext("2d");
    var ops = [];
    var y = PAD_TOP;

    var title = listTitleInput.value.trim() || DEFAULT_TITLE;
    var dateLabel = "Generated: " + new Date().toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric"
    });

    measure.font = "700 26px " + SHARE_FONT_DISPLAY;
    wrapText(measure, title, contentWidth).forEach(function (line) {
      ops.push({ type: "text", text: line, x: PAD_X, y: y, font: measure.font, color: SHARE_COLORS.text });
      y += 32;
    });

    y += 4;
    measure.font = "13px " + SHARE_FONT_DISPLAY;
    ops.push({ type: "text", text: dateLabel, x: PAD_X, y: y, font: measure.font, color: SHARE_COLORS.muted });
    y += 26;

    var printableItems = items.filter(isPrintable);

    if (printableItems.length === 0) {
      measure.font = "italic 15px " + SHARE_FONT_DISPLAY;
      ops.push({ type: "text", text: "No items to share.", x: PAD_X, y: y, font: measure.font, color: SHARE_COLORS.muted });
      y += 24;
    } else {
      printableItems.forEach(function (item, index) {
        if (index > 0) {
          ops.push({ type: "rule", x1: PAD_X, x2: SHARE_WIDTH - PAD_X, y: y, color: SHARE_COLORS.border });
          y += 14;
        } else {
          y += 4;
        }

        var name = item.name.trim() || "(unnamed item)";
        var hasQty = Number(item.qty) > 0;
        var qtyWidth = hasQty ? QTY_BADGE_DIAM + QTY_BADGE_GAP : 0;

        measure.font = "600 18px " + SHARE_FONT_DISPLAY;
        var nameLines = wrapText(measure, name, contentWidth - qtyWidth);

        nameLines.forEach(function (line, i) {
          ops.push({ type: "text", text: line, x: PAD_X, y: y, font: "600 18px " + SHARE_FONT_DISPLAY, color: SHARE_COLORS.text });
          if (i === 0 && hasQty) {
            // Center the badge on the actual ink of the name line next to
            // it (not a guessed offset), so it lines up with that row
            // regardless of font metrics.
            var lineMetrics = measure.measureText(line);
            var lineMid = y - (lineMetrics.actualBoundingBoxAscent - lineMetrics.actualBoundingBoxDescent) / 2;
            ops.push({
              type: "qtyBadge",
              cx: SHARE_WIDTH - PAD_X - QTY_BADGE_DIAM / 2,
              cy: lineMid,
              radius: QTY_BADGE_DIAM / 2,
              qty: item.qty
            });
          }
          y += 24;
        });

        if (item.spec && item.spec.trim()) {
          measure.font = "13px " + SHARE_FONT_DISPLAY;
          wrapText(measure, item.spec.trim(), contentWidth).forEach(function (line) {
            ops.push({ type: "text", text: line, x: PAD_X, y: y, font: "13px " + SHARE_FONT_DISPLAY, color: SHARE_COLORS.muted });
            y += 19;
          });
        }

        if (item.comment && item.comment.trim()) {
          measure.font = "italic 12.5px " + SHARE_FONT_DISPLAY;
          wrapText(measure, item.comment.trim(), contentWidth).forEach(function (line) {
            ops.push({ type: "text", text: line, x: PAD_X, y: y, font: "italic 12.5px " + SHARE_FONT_DISPLAY, color: SHARE_COLORS.muted });
            y += 18;
          });
        }

        y += 8;
      });
    }

    y += PAD_BOTTOM - 8;

    var canvas = document.createElement("canvas");
    canvas.width = SHARE_WIDTH * SHARE_SCALE;
    canvas.height = Math.round(y) * SHARE_SCALE;
    var ctx = canvas.getContext("2d");
    ctx.scale(SHARE_SCALE, SHARE_SCALE);
    ctx.fillStyle = SHARE_COLORS.bg;
    ctx.fillRect(0, 0, SHARE_WIDTH, y);
    ctx.textBaseline = "alphabetic";

    ops.forEach(function (op) {
      if (op.type === "rule") {
        ctx.strokeStyle = op.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(op.x1, op.y - 7);
        ctx.lineTo(op.x2, op.y - 7);
        ctx.stroke();
        return;
      }
      if (op.type === "qtyBadge") {
        ctx.beginPath();
        ctx.arc(op.cx, op.cy, op.radius, 0, Math.PI * 2);
        ctx.fillStyle = SHARE_COLORS.qtyBg;
        ctx.fill();

        var qtyLabel = String(op.qty);
        ctx.font = "700 14px " + SHARE_FONT_DISPLAY;
        ctx.fillStyle = SHARE_COLORS.qtyText;
        ctx.textAlign = "center";
        // "middle"/"center" alignment centers on the font's advance-box
        // metrics, which for a serif display face don't line up with where
        // the glyph is actually inked (especially off-center for a single
        // digit). Measure the glyph's own rendered bounding box instead and
        // center on that — correct for both axes, not just the baseline.
        ctx.textBaseline = "alphabetic";
        var qtyMetrics = ctx.measureText(qtyLabel);
        var qtyTextH = qtyMetrics.actualBoundingBoxAscent + qtyMetrics.actualBoundingBoxDescent;
        var qtyBaselineY = op.cy + qtyTextH / 2 - qtyMetrics.actualBoundingBoxDescent;
        var qtyXOffset = (qtyMetrics.actualBoundingBoxRight - qtyMetrics.actualBoundingBoxLeft) / 2;
        ctx.fillText(qtyLabel, op.cx - qtyXOffset, qtyBaselineY);
        return;
      }
      ctx.font = op.font;
      ctx.fillStyle = op.color;
      ctx.textAlign = op.align === "right" ? "right" : "left";
      ctx.fillText(op.text, op.x, op.y);
    });

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error("canvas.toBlob failed"));
      }, "image/png");
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Tries the native share sheet with the image as a file attachment first
  // (best-supported file type for iOS/Android share targets); if the
  // platform can't share files, falls back to a plain download so the user
  // still ends up with the image to send however they like.
  function shareList() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      persistNow();
    }

    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();

    fontsReady.then(function () {
      var canvas = buildShareCanvas();
      return canvasToBlob(canvas);
    }).then(function (blob) {
      var filename = shareFilenameBase() + ".png";
      var title = listTitleInput.value.trim() || DEFAULT_TITLE;

      if (navigator.canShare && (function () {
        try {
          return navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] });
        } catch (e) {
          return false;
        }
      })()) {
        var file = new File([blob], filename, { type: "image/png" });
        return navigator.share({ files: [file], title: title }).catch(function (err) {
          if (err && err.name === "AbortError") return;
          downloadBlob(blob, filename);
        });
      }

      downloadBlob(blob, filename);
    }).catch(function (err) {
      console.error("Share failed", err);
    });
  }

  function updateDocDate() {
    var now = new Date();
    docDateEl.textContent = "Generated: " + now.toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric"
    });
  }

  // ---------- event wiring ----------

  itemsBody.addEventListener("input", function (e) {
    var input = e.target.closest("input[data-field]");
    if (!input) return;
    var id = input.getAttribute("data-id");
    var field = input.getAttribute("data-field");
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item[field] = input.value;
    scheduleSave();
  });

  // Duplicate check (same name + spec) runs on blur rather than on every
  // keystroke, so nothing gets rejected mid-typing — only once the user
  // moves on does an offending edit get reverted.
  itemsBody.addEventListener("focusin", function (e) {
    var input = e.target.closest('input[data-field="name"], input[data-field="spec"]');
    if (!input) return;
    input.dataset.prevValue = input.value;
  });

  itemsBody.addEventListener("focusout", function (e) {
    var input = e.target.closest('input[data-field="name"], input[data-field="spec"]');
    if (!input) return;
    var id = input.getAttribute("data-id");
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    var dup = findDuplicate(id, item.name, item.spec);
    if (!dup) return;
    alert("\"" + item.name.trim() + "\"" + (item.spec.trim() ? " (" + item.spec.trim() + ")" : "") + " already exists in the list. Reverting this change.");
    var field = input.getAttribute("data-field");
    var prevValue = input.dataset.prevValue || "";
    item[field] = prevValue;
    input.value = prevValue;
    scheduleSave();
  });

  itemsBody.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    var id = btn.getAttribute("data-id");
    if (action === "delete") deleteItem(id);
    else if (action === "qty-increment") stepQty(id, 1);
    else if (action === "qty-decrement") stepQty(id, -1);
  });

  searchInput.addEventListener("input", function () {
    searchQuery = searchInput.value.trim().toLowerCase();
    render();
  });

  // ---------- floating action cluster ----------

  var fabToggle = document.getElementById("fabToggle");
  var fabMenu = document.getElementById("fabMenu");

  function closeFabMenu() {
    fabMenu.classList.remove("is-open");
    fabToggle.classList.remove("is-open");
    fabToggle.setAttribute("aria-expanded", "false");
  }

  fabToggle.addEventListener("click", function () {
    var open = fabMenu.classList.toggle("is-open");
    fabToggle.classList.toggle("is-open", open);
    fabToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // any action inside the mini menu collapses it back afterward
  fabMenu.addEventListener("click", function (e) {
    if (e.target.closest(".fab-mini")) closeFabMenu();
  });

  document.addEventListener("click", function (e) {
    if (fabMenu.classList.contains("is-open") && !e.target.closest(".fab-cluster")) {
      closeFabMenu();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeFabMenu();
  });

  // ---------- back to top ----------
  // Separate from the fab-cluster on purpose — a navigation shortcut, not
  // a list action — so it lives in its own corner and only appears once
  // there's something to scroll back up to.
  var backToTopBtn = document.getElementById("backToTopBtn");
  var BACK_TO_TOP_SHOW_AFTER_PX = 300;

  window.addEventListener("scroll", function () {
    backToTopBtn.classList.toggle("is-visible", window.scrollY > BACK_TO_TOP_SHOW_AFTER_PX);
  }, { passive: true });

  backToTopBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("addRowBtn").addEventListener("click", addItem);
  document.getElementById("clearAllBtn").addEventListener("click", clearAll);
  document.getElementById("restoreDefaultsBtn").addEventListener("click", restoreDefaults);
  document.getElementById("saveDefaultBtn").addEventListener("click", saveAsDefault);
  document.getElementById("sortBtn").addEventListener("click", sortAlphabetically);
  document.getElementById("shareBtn").addEventListener("click", shareList);

  listTitleInput.addEventListener("input", function () {
    localStorage.setItem(TITLE_KEY, listTitleInput.value);
    document.title = (listTitleInput.value.trim() || DEFAULT_TITLE);
  });

  // save immediately if the user navigates away mid-debounce
  window.addEventListener("beforeunload", function () {
    if (saveTimer) {
      clearTimeout(saveTimer);
      persistNow();
    }
  });

  if (!Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      var el = this;
      while (el) {
        if (el.matches(selector)) return el;
        el = el.parentElement;
      }
      return null;
    };
  }

  // ---------- init ----------

  listTitleInput.value = loadText(TITLE_KEY, DEFAULT_TITLE);
  document.title = (listTitleInput.value.trim() || DEFAULT_TITLE);
  updateDocDate();
  var lastUpdatedRaw = localStorage.getItem(LAST_UPDATED_KEY);
  renderLastUpdated(lastUpdatedRaw ? new Date(lastUpdatedRaw) : null);
  render();
  if (isFirstRun) {
    persistNow();
  } else {
    setSaveStatus("saved");
  }
})();

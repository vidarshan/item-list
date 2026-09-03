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
    ["Fanta Zero Sugar", "500ml"],
    ["Canada Dry Ginger Ale", "500ml"],
    ["Canada Dry Strawberry", "500ml"],
    ["Canada Dry Peach Mango", "500ml"],
    ["Fresca", "500ml"],
    ["Smart Water", "591ml"],
    ["Smart Water", "1L"],
    ["Smart Water Alkaline", "591ml"],
    ["Smart Water Alkaline", "1L"],
    ["Minute Maid Orange Juice", "355ml"],
    ["Fuze Lemon / Citron", ""],
    ["Fuze Raspberry / Framboise", ""],
    ["Powerade Fruit Punch", ""],
    ["Powerade Orange", ""],
    ["Powerade Mixed Berry", ""],
    ["Powerade Melon", ""],
    ["BodyArmor Strawberry Banana", ""],
    ["Vitamin Water Orange", ""],
    ["Vitamin Water Blueberry Pomegranate", ""],
    ["Vitamin Water Blueberry Pomegranate Zero Sugar", ""],
    ["Core Power Chocolate", "414ml"],
    ["Monster Energy Green", "355ml"],
    ["Monster Energy", "473ml"],
    ["Monster Ultra Peachy Keen", "473ml"],
    ["Monster Blue Hawaiian", "355ml"],
    ["Monster Mango Loco", "473ml"],
    ["Java Monster Loca Moka", "444ml"],
    ["Red Bull Original", "250ml"],
    ["Red Bull Zero / Sugar Free", "250ml"],
    ["Red Bull Zero / Sugar Free", "355ml"],
    ["Red Bull Pink Edition", "250ml"],
    ["Red Bull Pink Edition", "355ml"],
    ["Red Bull Lilac Edition", "355ml"],
    ["Red Bull Summer Edition", "250ml"],
    ["Red Bull Ice Edition", "250ml"],
    ["Full Throttle", "473ml"],
    ["NOS Energy", "473ml"],
    ["Reign Energy", "473ml"]
  ];

  var itemsBody = document.getElementById("itemsBody");
  var emptyRow = document.getElementById("emptyRow");
  var emptyRowCell = emptyRow.querySelector("td");
  var listTitleInput = document.getElementById("listTitle");
  var docDateEl = document.getElementById("docDate");
  var docUpdatedEl = document.getElementById("docUpdated");
  var saveStatusEl = document.getElementById("saveStatus");
  var printDoc = document.getElementById("printDoc");
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

  function getDefaultItems() {
    var custom = loadCustomDefault();
    if (!custom || !custom.length) return factoryDefaultItems();
    return custom.map(function (item) {
      return { id: uid(), name: item.name || "", spec: item.spec || "", qty: item.qty || "", comment: item.comment || "" };
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

    visibleItems.forEach(function (item) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td class=\"col-name\"><input type=\"text\" class=\"cell-name\" data-id=\"" + item.id + "\" data-field=\"name\" value=\"" + escapeHtml(item.name) + "\" placeholder=\"Item name\"></td>" +
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
    if (!confirm("This will permanently delete all items from this browser. Continue?")) return;
    items = [];
    clearSearch();
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

  function hasPositiveQty(item) {
    return Number(item.qty) > 0;
  }

  // Builds a plain, static rendering of the current list for Print/Save as PDF.
  // This is a separate element from the live editable table, so the exported
  // document is just the content — no buttons, inputs, or app chrome. Items
  // with no quantity set (blank or 0) are left out, since a shareable list
  // is only useful for what actually needs to be picked up.
  function buildPrintDoc() {
    var html = "";
    var printableItems = items.filter(hasPositiveQty);

    if (printableItems.length === 0) {
      html += "<div class=\"pd-empty\">No items with a quantity to share.</div>";
    } else {
      printableItems.forEach(function (item) {
        var name = escapeHtml(item.name) || "(unnamed item)";
        var spec = escapeHtml(item.spec);
        var qty = escapeHtml(item.qty);
        var comment = escapeHtml(item.comment);
        html += "<div class=\"pd-item\">" +
          "<div class=\"pd-name\">" + name + "</div>" +
          "<div class=\"pd-row\">" +
            "<span class=\"pd-spec\">" + (spec || "&nbsp;") + "</span>" +
            "<span class=\"pd-qty\">Qty: " + qty + "</span>" +
          "</div>" +
          (comment ? "<div class=\"pd-comment\">" + comment + "</div>" : "") +
        "</div>";
      });
    }

    printDoc.innerHTML = html;
  }

  // Measures the built print-doc's real content height and sets the @page
  // height to match, so a short list doesn't end with a long blank gap.
  // Height is capped at MAX_PAGE_HEIGHT_IN — a phone-screen-like proportion —
  // so a long list paginates into multiple screen-sized pages instead of one
  // huge page, which most mobile PDF viewers shrink-to-fit and render tiny.
  // printDoc is normally display:none, so it's briefly laid out off-screen
  // at the true print content width to get an accurate scrollHeight, then
  // restored — happens within one synchronous pass, so nothing is visibly
  // shown on screen.
  function updatePrintPageSize() {
    var PAGE_WIDTH_IN = 3.5;
    var MAX_PAGE_HEIGHT_IN = 7.5; // ~9:19.5, close to a typical phone screen
    var SIDE_MARGIN_MM = 5; // matches @page margin's left/right value
    var TOP_BOTTOM_MARGIN_MM = 10; // matches @page margin's top/bottom value

    var prevCssText = printDoc.style.cssText;
    printDoc.style.cssText =
      "display:block; position:fixed; visibility:hidden; left:-9999px; top:0; " +
      "width:calc(" + PAGE_WIDTH_IN + "in - " + (SIDE_MARGIN_MM * 2) + "mm);";

    var contentHeightPx = printDoc.scrollHeight;

    printDoc.style.cssText = prevCssText;

    var fittedHeightIn = (contentHeightPx / 96) + ((TOP_BOTTOM_MARGIN_MM * 2) / 25.4) + 0.15;
    var heightIn = Math.min(fittedHeightIn, MAX_PAGE_HEIGHT_IN);

    var styleEl = document.getElementById("printPageSize");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "printPageSize";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = "@page { size: " + PAGE_WIDTH_IN + "in " + heightIn.toFixed(2) + "in; }";
  }

  // Browsers suggest document.title as the default filename in the
  // "Save as PDF" dialog, so this is set right before printing and
  // restored to the normal tab title in "afterprint".
  function printFilename() {
    var slug = (listTitleInput.value.trim() || DEFAULT_TITLE)
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "item_list";
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var dateStr = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    var timeStr = pad(now.getHours()) + pad(now.getMinutes());
    return slug + "_at_" + dateStr + "_" + timeStr;
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

  document.getElementById("addRowBtn").addEventListener("click", addItem);
  document.getElementById("clearAllBtn").addEventListener("click", clearAll);
  document.getElementById("restoreDefaultsBtn").addEventListener("click", restoreDefaults);
  document.getElementById("saveDefaultBtn").addEventListener("click", saveAsDefault);
  document.getElementById("printBtn").addEventListener("click", function () {
    // flush any pending debounced save before generating the shareable doc
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      persistNow();
    }
    window.print();
  });

  // rebuild the plain print doc, refit the page height, and set the
  // suggested filename right before printing, however it was triggered
  // (our button, Ctrl/Cmd+P, or the browser's print menu)
  window.addEventListener("beforeprint", function () {
    buildPrintDoc();
    updatePrintPageSize();
    document.title = printFilename();
  });

  window.addEventListener("afterprint", function () {
    document.title = (listTitleInput.value.trim() || DEFAULT_TITLE);
  });

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

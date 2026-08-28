(function () {
  "use strict";

  var STORAGE_KEY = "itemTracker.items.v2";
  var TITLE_KEY = "itemTracker.title.v1";
  var LAST_UPDATED_KEY = "itemTracker.lastUpdated.v1";
  var DEFAULT_TITLE = "Items List";
  var SAVE_DEBOUNCE_MS = 500;

  // [name, spec, qty] — pre-loaded on first run; restorable any time via "Restore Default List"
  var DEFAULT_ITEMS_DATA = [
    ["Coca-Cola Original", "500ml", 4],
    ["Coca-Cola Zero Sugar", "500ml", 5],
    ["Diet Coke", "500ml", 4],
    ["Sprite", "500ml", 4],
    ["Fanta Orange", "500ml", 1],
    ["Fanta Zero Sugar", "500ml", 2],
    ["Canada Dry Ginger Ale", "500ml", 1],
    ["Canada Dry Strawberry", "500ml", 1],
    ["Canada Dry Peach Mango", "500ml", 3],
    ["Fresca", "500ml", 3],
    ["Smart Water", "591ml", 2],
    ["Smart Water", "1L", 2],
    ["Smart Water Alkaline", "591ml", 2],
    ["Smart Water Alkaline", "1L", 4],
    ["Minute Maid Orange Juice", "355ml", 1],
    ["Fuze Lemon / Citron", "", 1],
    ["Fuze Raspberry / Framboise", "", 3],
    ["Powerade Fruit Punch", "", 6],
    ["Powerade Orange", "", 7],
    ["Powerade Mixed Berry", "", 4],
    ["Powerade Melon", "", 4],
    ["BodyArmor Strawberry Banana", "", 2],
    ["Vitamin Water Orange", "", 3],
    ["Vitamin Water Blueberry Pomegranate", "", 2],
    ["Vitamin Water Blueberry Pomegranate Zero Sugar", "", 3],
    ["Core Power Chocolate", "414ml", 1],
    ["Monster Energy Green", "355ml", 7],
    ["Monster Energy", "473ml", 1],
    ["Monster Ultra Peachy Keen", "473ml", 2],
    ["Monster Blue Hawaiian", "355ml", 5],
    ["Monster Mango Loco", "473ml", 2],
    ["Java Monster Loca Moka", "444ml", 1],
    ["Red Bull Original", "250ml", 2],
    ["Red Bull Zero / Sugar Free", "250ml", 5],
    ["Red Bull Zero / Sugar Free", "355ml", 3],
    ["Red Bull Pink Edition", "250ml", 1],
    ["Red Bull Pink Edition", "355ml", 2],
    ["Red Bull Lilac Edition", "355ml", 1],
    ["Red Bull Summer Edition", "250ml", 2],
    ["Red Bull Ice Edition", "250ml", 2],
    ["Full Throttle", "473ml", 1],
    ["NOS Energy", "473ml", 1],
    ["Reign Energy", "473ml", 3]
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

  function defaultItems() {
    return DEFAULT_ITEMS_DATA.map(function (row) {
      return { id: uid(), name: row[0], spec: row[1], qty: row[2] };
    });
  }

  function loadItems() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultItems();
    } catch (e) {
      console.error("Failed to load items from localStorage", e);
      return defaultItems();
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
      (item.spec || "").toLowerCase().indexOf(searchQuery) !== -1;
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
        "<td class=\"col-qty\" data-label=\"Qty\"><input type=\"text\" inputmode=\"numeric\" class=\"cell-qty\" data-id=\"" + item.id + "\" data-field=\"qty\" value=\"" + escapeHtml(item.qty) + "\" placeholder=\"0\"></td>" +
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
    var item = { id: uid(), name: "", spec: "", qty: "" };
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
    if (!confirm("This will replace your current list with the original default list. Continue?")) return;
    items = defaultItems();
    clearSearch();
    render();
    persistNow();
  }

  // Builds a plain, static rendering of the current list for Print/Save as PDF.
  // This is a separate element from the live editable table, so the exported
  // document is just the content — no buttons, inputs, or app chrome.
  function buildPrintDoc() {
    var html = "";

    if (items.length === 0) {
      html += "<div class=\"pd-empty\">No items.</div>";
    } else {
      items.forEach(function (item) {
        var name = escapeHtml(item.name) || "(unnamed item)";
        var spec = escapeHtml(item.spec);
        var qty = escapeHtml(item.qty) || "0";
        html += "<div class=\"pd-item\">" +
          "<div class=\"pd-name\">" + name + "</div>" +
          "<div class=\"pd-row\">" +
            "<span class=\"pd-spec\">" + (spec || "&nbsp;") + "</span>" +
            "<span class=\"pd-qty\">Qty: " + qty + "</span>" +
          "</div>" +
        "</div>";
      });
    }

    printDoc.innerHTML = html;
  }

  // Measures the built print-doc's real content height and overrides the
  // @page height to fit it exactly, so the PDF doesn't end with a long
  // blank gap after the list. printDoc is normally display:none, so it's
  // briefly laid out off-screen at the true print content width to get an
  // accurate scrollHeight, then restored — happens within one synchronous
  // pass, so nothing is visibly shown on screen.
  function updatePrintPageSize() {
    var PAGE_WIDTH_IN = 4;
    var SIDE_MARGIN_MM = 6; // matches @page margin's left/right value
    var TOP_BOTTOM_MARGIN_MM = 10; // matches @page margin's top/bottom value

    var prevCssText = printDoc.style.cssText;
    printDoc.style.cssText =
      "display:block; position:fixed; visibility:hidden; left:-9999px; top:0; " +
      "width:calc(" + PAGE_WIDTH_IN + "in - " + (SIDE_MARGIN_MM * 2) + "mm);";

    var contentHeightPx = printDoc.scrollHeight;

    printDoc.style.cssText = prevCssText;

    var heightIn = (contentHeightPx / 96) + ((TOP_BOTTOM_MARGIN_MM * 2) / 25.4) + 0.15;

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
    var btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;
    deleteItem(btn.getAttribute("data-id"));
  });

  searchInput.addEventListener("input", function () {
    searchQuery = searchInput.value.trim().toLowerCase();
    render();
  });

  document.getElementById("addRowBtn").addEventListener("click", addItem);
  document.getElementById("clearAllBtn").addEventListener("click", clearAll);
  document.getElementById("restoreDefaultsBtn").addEventListener("click", restoreDefaults);
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

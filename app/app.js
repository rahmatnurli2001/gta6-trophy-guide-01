(function () {
  "use strict";

  var STORAGE_KEY = "gta6-trophy-guide-progress-v1";
  var DATA_URL = "data/trophies.json";
  var TOTAL = 55;

  var GRADES = ["platinum", "gold", "silver", "bronze"];
  var GRADE_LABELS = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };
  var GRADE_ICONS = { platinum: "P", gold: "G", silver: "S", bronze: "B" };

  var ROADMAP = [
    { title: "Story chapters 1\u20135 + final mission", desc: "Play the main story in order. Story trophies unlock as chapters complete \u2014 do not rush past side moments flagged as missable.", match: ["story"] },
    { title: "Character finales", desc: "Finish each protagonist's finale arc and the choices that close their story.", match: ["story"] },
    { title: "Activities & challenges", desc: "Sports, races, side jobs and skill challenges across Leonida. Mop up the activity trophies while the map is still open.", match: ["activity"] },
    { title: "Collectibles & counts", desc: "The long grind: hidden packages, wildlife, photos and every counted pickup. Use the per-trophy count shown in each detail panel.", match: ["collectible"] },
    { title: "Cleanup & 100% completion", desc: "Sweep the remaining missables and one-off moments, then confirm the platinum pops at 54/55 earned.", match: ["missable"] }
  ];

  var trophies = [];
  var earned = {};
  var hideSpoilers = true;
  var filters = { kind: "all", grade: "all", status: "all", query: "" };
  var selectedId = null;

  var gridEl = document.getElementById("trophy-grid");
  var countEl = document.getElementById("progress-count");
  var pctEl = document.getElementById("progress-pct");
  var fillEl = document.getElementById("progress-fill");
  var noteEl = document.getElementById("progress-note");
  var gradeCountsEl = document.getElementById("grade-counts");
  var resultCountEl = document.getElementById("result-count");
  var emptyStateEl = document.getElementById("empty-state");
  var roadmapEl = document.getElementById("roadmap-stages");
  var missableEl = document.getElementById("missable-list");
  var detailPanel = document.getElementById("detail-panel");
  var detailBody = document.getElementById("detail-body");
  var searchInput = document.getElementById("search");
  var spoilerToggle = document.getElementById("spoiler-toggle");

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { return; }
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        earned = parsed;
      }
    } catch (err) {
      earned = {};
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(earned));
    } catch (err) {
      /* storage unavailable (private mode) \u2014 progress still works for this session */
    }
  }

  function isEarned(t) {
    return !!earned[t.id];
  }

  function isHiddenSpoiler(t) {
    return hideSpoilers && t.kind === "story" && !isEarned(t);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function gradeOf(t) {
    return (t.grade || "").toLowerCase();
  }

  function kindOf(t) {
    return (t.kind || "").toLowerCase();
  }

  function updateProgress() {
    var total = trophies.length || TOTAL;
    var earnedCount = 0;
    var byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    var gradeTotals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    trophies.forEach(function (t) {
      var g = gradeOf(t);
      if (gradeTotals[g] != null) { gradeTotals[g] += 1; }
      if (isEarned(t)) {
        earnedCount += 1;
        if (byGrade[g] != null) { byGrade[g] += 1; }
      }
    });
    var pct = total ? Math.round((earnedCount / total) * 100) : 0;
    countEl.textContent = earnedCount + "/" + total;
    pctEl.textContent = pct + "%";
    fillEl.style.width = pct + "%";
    if (earnedCount === total && total > 0) {
      noteEl.textContent = "Platinum earned \u2014 every trophy in Leonida is yours.";
    } else {
      noteEl.textContent = (total - earnedCount) + " to go. Tap a trophy card to mark it earned. Progress saves on this device.";
    }
    gradeCountsEl.innerHTML = GRADES.map(function (g) {
      var totalG = gradeTotals[g] || 0;
      return '<span class="grade-pill"><span class="dot dot-' + g + '"></span>' +
        GRADE_LABELS[g] + " " + (byGrade[g] || 0) + "/" + totalG + "</span>";
    }).join("");
  }

  function matchesFilters(t) {
    if (filters.kind !== "all" && kindOf(t) !== filters.kind) { return false; }
    if (filters.grade !== "all" && gradeOf(t) !== filters.grade) { return false; }
    if (filters.status === "earned" && !isEarned(t)) { return false; }
    if (filters.status === "not-earned" && isEarned(t)) { return false; }
    if (filters.query) {
      var hay = ((t.name || "") + " " + (t.description || "") + " " + (t.guide || "") + " " +
        (t.missableNote || "") + " " + (t.storyChapter || "")).toLowerCase();
      if (hay.indexOf(filters.query) === -1) { return false; }
    }
    return true;
  }

  function renderGrid() {
    var visible = trophies.filter(matchesFilters);
    resultCountEl.textContent = visible.length + " of " + trophies.length + " trophies shown";
    emptyStateEl.hidden = visible.length !== 0;
    gridEl.innerHTML = visible.map(function (t) {
      var hidden = isHiddenSpoiler(t);
      var name = hidden ? "Hidden trophy" : escapeHtml(t.name);
      var desc = hidden
        ? '<p class="trophy-hidden-note">Hidden trophy \u2014 earn it to reveal.</p>'
        : '<p class="trophy-desc">' + escapeHtml(t.description || "") + "</p>";
      var meta = [];
      if (t.count) { meta.push("Count: " + escapeHtml(t.count)); }
      if (t.storyChapter) { meta.push(escapeHtml(t.storyChapter)); }
      var missableBadge = t.missable
        ? '<span class="badge badge-missable">Missable</span>'
        : "";
      return '<button type="button" class="trophy-card' + (isEarned(t) ? " earned" : "") +
        '" data-id="' + escapeHtml(t.id) + '">' +
        '<span class="trophy-top"><span class="trophy-icon">' + GRADE_ICONS[gradeOf(t)] + "</span>" +
        '<span class="trophy-name">' + name + "</span></span>" +
        '<span class="badge badge-' + escapeHtml(gradeOf(t)) + '">' + escapeHtml(GRADE_LABELS[gradeOf(t)] || t.grade) + "</span>" +
        missableBadge + desc +
        (meta.length ? '<p class="trophy-meta">' + meta.join(" &middot; ") + "</p>" : "") +
        "</button>";
    }).join("");
  }

  function stageTrophies(stage, index) {
    var picked = [];
    if (index === 0 || index === 1) {
      picked = trophies.filter(function (t) { return kindOf(t) === "story"; });
      if (index === 1) { picked = picked.slice(Math.ceil(picked.length / 2)); }
      if (index === 0) { picked = picked.slice(0, Math.ceil(picked.length / 2)); }
    } else if (index === 2) {
      picked = trophies.filter(function (t) { return kindOf(t) === "activity"; });
    } else if (index === 3) {
      picked = trophies.filter(function (t) { return kindOf(t) === "collectible"; });
    } else {
      picked = trophies.filter(function (t) { return !!t.missable; });
    }
    return picked;
  }

  function renderRoadmap() {
    roadmapEl.innerHTML = ROADMAP.map(function (stage, index) {
      var list = stageTrophies(stage, index);
      var done = list.filter(isEarned).length;
      var items = list.map(function (t) {
        var label = isHiddenSpoiler(t) ? "Hidden story trophy" : escapeHtml(t.name);
        return '<li class="' + (isEarned(t) ? "done" : "") + '">' + label + "</li>";
      }).join("");
      return "<li>" +
        '<span class="stage-num">' + (index + 1) + "</span>" +
        "<h3>" + escapeHtml(stage.title) + "</h3>" +
        '<p class="stage-meta">' + done + "/" + list.length + " earned</p>" +
        '<p class="stage-desc">' + escapeHtml(stage.desc) + "</p>" +
        (items ? '<ul class="stage-trophies">' + items + "</ul>" : "") +
        "</li>";
    }).join("");
  }

  function renderMissable() {
    var list = trophies.filter(function (t) { return !!t.missable; });
    if (!list.length) {
      missableEl.innerHTML = '<p class="section-intro">No missable trophies flagged in the data yet.</p>';
      return;
    }
    missableEl.innerHTML = list.map(function (t) {
      var name = isHiddenSpoiler(t) ? "Hidden story trophy" : escapeHtml(t.name);
      var note = t.missableNote || "Missable \u2014 do this before moving past the moment.";
      return '<article class="missable-card' + (isEarned(t) ? " earned" : "") + '">' +
        '<span class="missable-flag" aria-hidden="true">!</span>' +
        "<div><h3>" + name + "</h3>" +
        '<p class="missable-note">' + escapeHtml(note) + "</p>" +
        (t.guide && !isHiddenSpoiler(t) ? "<p>" + escapeHtml(t.guide) + "</p>" : "") +
        "</div></article>";
    }).join("");
  }

  function renderAll() {
    updateProgress();
    renderGrid();
    renderRoadmap();
    renderMissable();
    if (selectedId) { openDetail(selectedId, true); }
  }

  function findTrophy(id) {
    for (var i = 0; i < trophies.length; i++) {
      if (String(trophies[i].id) === String(id)) { return trophies[i]; }
    }
    return null;
  }

  function openDetail(id, keepOpen) {
    var t = findTrophy(id);
    if (!t) { return; }
    selectedId = id;
    var hidden = isHiddenSpoiler(t);
    var sources = Array.isArray(t.sources) ? t.sources : [];
    var sourceList = sources.map(function (s) {
      var label = escapeHtml(s.name || s.url || "Source");
      var url = escapeHtml(s.url || "");
      return '<li><a href="' + url + '" target="_blank" rel="noopener">' + label + "</a></li>";
    }).join("");
    var facts = [];
    if (t.count) { facts.push("<strong>Count:</strong> " + escapeHtml(t.count)); }
    if (t.storyChapter) { facts.push("<strong>Chapter:</strong> " + escapeHtml(t.storyChapter)); }
    facts.push("<strong>Type:</strong> " + escapeHtml(t.kind || ""));
    facts.push("<strong>Status:</strong> " + (isEarned(t) ? "Earned" : "Not earned"));
    detailBody.innerHTML =
      '<span class="badge badge-' + escapeHtml(gradeOf(t)) + '">' + escapeHtml(GRADE_LABELS[gradeOf(t)] || t.grade) + "</span>" +
      (t.missable ? '<span class="badge badge-missable">Missable</span>' : "") +
      "<h3>" + (hidden ? "Hidden trophy" : escapeHtml(t.name)) + "</h3>" +
      (hidden
        ? '<p class="trophy-hidden-note">Hidden trophy \u2014 earn it to reveal the name, description and guide.</p>'
        : '<p class="trophy-desc">' + escapeHtml(t.description || "") + "</p>" +
          '<p class="detail-guide-label">How to earn it</p>' +
          '<p class="detail-guide">' + escapeHtml(t.guide || "No guide text yet.") + "</p>") +
      (t.missable && t.missableNote
        ? '<p class="detail-warning">Missable: ' + escapeHtml(t.missableNote) + "</p>"
        : "") +
      '<p class="detail-facts">' + facts.join("<br>") + "</p>" +
      (sourceList
        ? '<div class="detail-sources"><h4>Sources</h4><ul>' + sourceList + "</ul></div>"
        : "") +
      '<button type="button" class="detail-toggle-btn' + (isEarned(t) ? " earned-state" : "") + '" id="detail-toggle">' +
      (isEarned(t) ? "Mark as not earned" : "Mark as earned") + "</button>";
    detailPanel.hidden = false;
    var toggleBtn = document.getElementById("detail-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        toggleEarned(t.id);
      });
    }
    if (!keepOpen) {
      detailPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function closeDetail() {
    selectedId = null;
    detailPanel.hidden = true;
    detailBody.innerHTML = "";
  }

  function toggleEarned(id) {
    if (earned[id]) { delete earned[id]; } else { earned[id] = true; }
    saveProgress();
    renderAll();
  }

  function setFilter(group, value, button) {
    filters[group] = value;
    var groupEl = document.querySelector('.filter-group[data-filter="' + group + '"]');
    if (groupEl) {
      var buttons = groupEl.querySelectorAll("button");
      buttons.forEach(function (b) { b.classList.toggle("active", b === button); });
    }
    renderGrid();
  }

  function exportProgress() {
    var payload = {
      game: "GTA VI",
      exportedAt: new Date().toISOString(),
      earned: Object.keys(earned).filter(function (id) { return earned[id]; })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "gta6-trophy-progress.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importProgress(file) {
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        var list = null;
        if (Array.isArray(parsed)) { list = parsed; }
        else if (parsed && Array.isArray(parsed.earned)) { list = parsed.earned; }
        else if (parsed && typeof parsed === "object") {
          list = Object.keys(parsed).filter(function (k) { return parsed[k]; });
        }
        if (!list) { throw new Error("Unrecognised progress file"); }
        var next = {};
        list.forEach(function (id) {
          if (typeof id === "string" && findTrophy(id)) { next[id] = true; }
        });
        earned = next;
        saveProgress();
        renderAll();
        noteEl.textContent = "Progress imported: " + Object.keys(next).length + " trophies earned.";
      } catch (err) {
        noteEl.textContent = "Import failed: that file is not a valid progress export.";
      }
    };
    reader.readAsText(file);
  }

  gridEl.addEventListener("click", function (event) {
    var card = event.target.closest(".trophy-card");
    if (!card) { return; }
    openDetail(card.getAttribute("data-id"), false);
  });

  document.querySelectorAll(".filter-group").forEach(function (groupEl) {
    groupEl.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) { return; }
      setFilter(groupEl.getAttribute("data-filter"), button.getAttribute("data-value"), button);
    });
  });

  searchInput.addEventListener("input", function () {
    filters.query = searchInput.value.trim().toLowerCase();
    renderGrid();
  });

  spoilerToggle.addEventListener("change", function () {
    hideSpoilers = spoilerToggle.checked;
    renderAll();
  });

  document.getElementById("export-btn").addEventListener("click", exportProgress);
  document.getElementById("import-btn").addEventListener("click", function () {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file").addEventListener("change", function (event) {
    importProgress(event.target.files && event.target.files[0]);
    event.target.value = "";
  });
  document.getElementById("detail-close").addEventListener("click", closeDetail);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { closeDetail(); }
  });

  loadProgress();
  hideSpoilers = spoilerToggle.checked;

  fetch(DATA_URL)
    .then(function (response) {
      if (!response.ok) { throw new Error("Failed to load trophy data (" + response.status + ")"); }
      return response.json();
    })
    .then(function (data) {
      trophies = Array.isArray(data.trophies) ? data.trophies : [];
      renderAll();
    })
    .catch(function (err) {
      gridEl.innerHTML = "";
      emptyStateEl.hidden = false;
      emptyStateEl.textContent = "Could not load the trophy list. Check that data/trophies.json is present and reload the page.";
      resultCountEl.textContent = "";
      noteEl.textContent = "Data failed to load: " + err.message;
    });
})();

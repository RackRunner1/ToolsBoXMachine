(() => {
  "use strict";

  var ELAPSED_WINDOW_MS = 48 * 60 * 60 * 1000;

  var elDays = document.getElementById("ny-days");
  var elHours = document.getElementById("ny-hours");
  var elMinutes = document.getElementById("ny-minutes");
  var elSeconds = document.getElementById("ny-seconds");
  var elStatus = document.getElementById("ny-status");
  var elStatusText = document.getElementById("ny-status-text");
  var elYearLabel = document.getElementById("ny-year-label");
  var elTargetYear = document.getElementById("ny-target-year");
  var elTargetLine = document.getElementById("ny-target-line");
  var elFill = document.getElementById("ny-progress-fill");
  var elPct = document.getElementById("ny-progress-pct");
  var elProgressLabel = document.getElementById("ny-progress-label");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function getTimeZoneName() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz || "Local time";
    } catch (e) {
      return "Local time";
    }
  }

  function formatTargetDate(d, tz) {
    try {
      return d.toLocaleString("en-US", {
        timeZone: tz,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return d.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  // Returns { mode, diffMs, targetYear, yearStart, yearEnd } where
  // mode is "countdown" (time left until Jan 1) or "elapsed"
  // (time passed since Jan 1, shown during the 48h after New Year).
  function computeState(now) {
    var y = now.getFullYear();
    var yearStart = new Date(y, 0, 1, 0, 0, 0, 0);
    var yearEnd = new Date(y + 1, 0, 1, 0, 0, 0, 0);
    var sinceNewYear = now.getTime() - yearStart.getTime();
    if (sinceNewYear >= 0 && sinceNewYear < ELAPSED_WINDOW_MS) {
      return { mode: "elapsed", diffMs: sinceNewYear, targetYear: y, yearStart: yearStart, yearEnd: yearEnd };
    }
    return { mode: "countdown", diffMs: yearEnd.getTime() - now.getTime(), targetYear: y + 1, yearStart: yearStart, yearEnd: yearEnd };
  }

  function render() {
    var now = new Date();
    var tz = getTimeZoneName();
    var state = computeState(now);
    var diff = Math.max(0, state.diffMs);

    var totalSec = Math.floor(diff / 1000);
    var d = Math.floor(totalSec / 86400);
    var h = Math.floor((totalSec % 86400) / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;

    elDays.textContent = String(d);
    elHours.textContent = pad(h);
    elMinutes.textContent = pad(m);
    elSeconds.textContent = pad(s);

    if (state.mode === "elapsed") {
      elStatus.classList.add("elapsed");
      elStatusText.textContent = "Time since New Year";
      elYearLabel.innerHTML = "Welcome to <strong>" + state.targetYear + "</strong>";
      elTargetYear.textContent = String(state.targetYear);
      elTargetLine.innerHTML =
        "New Year was: <strong>" +
        formatTargetDate(state.yearStart, tz) +
        "</strong>";
    } else {
      elStatus.classList.remove("elapsed");
      elStatusText.textContent = "Time until New Year";
      elYearLabel.innerHTML =
        "Counting down to <strong>" + state.targetYear + "</strong>";
      elTargetYear.textContent = String(state.targetYear);
      elTargetLine.innerHTML =
        "New Year: <strong>" +
        formatTargetDate(state.yearEnd, tz) +
        "</strong>";
    }

    // During the 48h that follow New Year the bar stays full: the milestone
    // has just been reached. Once that window closes it drops to the real
    // progress through the calendar year.
    elProgressLabel.textContent =
      state.mode === "elapsed" ? "New Year progress" : "Year progress";

    var pct = 100;
    if (state.mode === "countdown") {
      var yearLen = state.yearEnd.getTime() - state.yearStart.getTime();
      var yearDone = now.getTime() - state.yearStart.getTime();
      pct = Math.min(100, Math.max(0, (yearDone / yearLen) * 100));
    }
    elFill.style.width = pct.toFixed(3) + "%";
    elPct.textContent = pct.toFixed(2) + "%";
  }

  render();
  setInterval(render, 1000);

  // Fullscreen
  var card = document.getElementById("ny-card");
  var fullscreenBtn = document.getElementById("ny-fullscreen-btn");
  var ICON_EXPAND = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>';
  var ICON_COMPRESS = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>';

  function isFullscreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  }

  if (card && fullscreenBtn) {
    fullscreenBtn.addEventListener("click", function () {
      if (!isFullscreen()) {
        if (card.requestFullscreen) {
          card.requestFullscreen().catch(function (err) { console.error(err); });
        } else if (card.webkitRequestFullscreen) {
          card.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    });

    var syncFullscreen = function () {
      var on = isFullscreen();
      card.classList.toggle("ny-fullscreen", on);
      fullscreenBtn.innerHTML = on ? ICON_COMPRESS : ICON_EXPAND;
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
  }

  // Exposed for testing.
  if (typeof window !== "undefined") {
    window.__nyComputeState = computeState;
    window.__nyElapsedWindowMs = ELAPSED_WINDOW_MS;
  }
})();

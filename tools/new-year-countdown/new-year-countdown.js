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
  var elTimezone = document.getElementById("ny-timezone");
  var elTargetDate = document.getElementById("ny-target-date");
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

  function getOffsetLabel(date) {
    var offMin = -date.getTimezoneOffset();
    var sign = offMin >= 0 ? "+" : "-";
    var abs = Math.abs(offMin);
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    return "GMT" + sign + h + (m ? ":" + pad(m) : "");
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
      elProgressLabel.textContent = "New Year progress";
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
      elProgressLabel.textContent = "Year progress";
    }

    elTimezone.textContent = tz + " (" + getOffsetLabel(now) + ")";

    var yearLen = state.yearEnd.getTime() - state.yearStart.getTime();
    var yearDone = now.getTime() - state.yearStart.getTime();
    var pct = Math.min(100, Math.max(0, (yearDone / yearLen) * 100));
    elFill.style.width = pct.toFixed(3) + "%";
    elPct.textContent = pct.toFixed(2) + "%";

    document.title =
      d + "d " + pad(h) + ":" + pad(m) + ":" + pad(s) +
      (state.mode === "elapsed" ? " since " : " until ") +
      state.targetYear + " | TBXM";
  }

  render();
  setInterval(render, 250);

  // Exposed for testing.
  if (typeof window !== "undefined") {
    window.__nyComputeState = computeState;
    window.__nyElapsedWindowMs = ELAPSED_WINDOW_MS;
  }
})();

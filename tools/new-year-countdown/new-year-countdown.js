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
    var options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    try {
      return d.toLocaleString("en-US", Object.assign({ timeZone: tz }, options));
    } catch (e) {
      return d.toLocaleString("en-US", options);
    }
  }

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

    elStatus.classList.toggle("elapsed", state.mode === "elapsed");

    if (state.mode === "elapsed") {
      elStatusText.textContent = "Time since New Year";
      elYearLabel.innerHTML = "Welcome to <strong>" + state.targetYear + "</strong>";
      elTargetLine.innerHTML =
        "New Year was: <strong>" +
        formatTargetDate(state.yearStart, tz) +
        "</strong>";
    } else {
      elStatusText.textContent = "Time until New Year";
      elYearLabel.innerHTML =
        "Counting down to <strong>" + state.targetYear + "</strong>";
      elTargetLine.innerHTML =
        "New Year: <strong>" +
        formatTargetDate(state.yearEnd, tz) +
        "</strong>";
    }

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

  var card = document.getElementById("ny-card");
  var fullscreenBtn = document.getElementById("ny-fullscreen-btn");
  var ICON_EXPAND = fullscreenBtn.innerHTML;
  var ICON_COMPRESS = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>';

  function isNativeFullscreen() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function setFullscreen(on) {
    card.classList.toggle("ny-fullscreen", on);
    fullscreenBtn.innerHTML = on ? ICON_COMPRESS : ICON_EXPAND;
  }

  fullscreenBtn.addEventListener("click", function () {
    if (!card.classList.contains("ny-fullscreen")) {
      setFullscreen(true);
      if (card.requestFullscreen) {
        card.requestFullscreen().catch(function (err) { console.error(err); });
      } else if (card.webkitRequestFullscreen) {
        card.webkitRequestFullscreen();
      }
    } else {
      setFullscreen(false);
      if (isNativeFullscreen()) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }
  });

  var syncFullscreen = function () {
    setFullscreen(isNativeFullscreen());
  };

  document.addEventListener("fullscreenchange", syncFullscreen);
  document.addEventListener("webkitfullscreenchange", syncFullscreen);
})();

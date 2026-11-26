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
  var elFaqAnswer = document.getElementById("ny-faq-answer");
  var elLiveAnswer = document.getElementById("ny-live-answer");
  var lastLiveAnswer = "";

  // The page can be updated independently of this script (or served from a
  // cache), so never assume an element exists: a missing node must not stop the
  // countdown from ticking.
  function setText(el, value) {
    if (el) {
      el.textContent = value;
    }
  }

  function setHTML(el, value) {
    if (el) {
      el.innerHTML = value;
    }
  }

  function setWidth(el, value) {
    if (el && el.style) {
      el.style.width = value;
    }
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function plural(n, unit) {
    return n + " " + unit + (n === 1 ? "" : "s");
  }

  function formatRemaining(d, h, m) {
    if (d > 0) return plural(d, "day") + " and " + plural(h, "hour");
    if (h > 0) return plural(h, "hour") + " and " + plural(m, "minute");
    return plural(m, "minute");
  }

  function formatDay(d) {
    try {
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return d.toDateString();
    }
  }

  function setLiveAnswer(text) {
    if (!elLiveAnswer || text === lastLiveAnswer) return;
    lastLiveAnswer = text;
    elLiveAnswer.textContent = text;
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

    setText(elDays, String(d));
    setText(elHours, pad(h));
    setText(elMinutes, pad(m));
    setText(elSeconds, pad(s));

    if (elStatus) {
      elStatus.classList.toggle("elapsed", state.mode === "elapsed");
    }

    if (state.mode === "elapsed") {
      setText(
        elFaqAnswer,
        "New Year started " + formatRemaining(d, h, m) + " ago, on January 1st at 00:00."
      );
      setLiveAnswer(
        "New Year " + state.targetYear + " started " +
        formatRemaining(d, h, m) + " ago, on January 1st at 00:00 local time."
      );
      setText(elStatusText, "Time since New Year");
      setHTML(elYearLabel, "Welcome to <strong>" + state.targetYear + "</strong>");
      setHTML(
        elTargetLine,
        "New Year was: <strong>" +
        formatTargetDate(state.yearStart, tz) +
        "</strong>"
      );
    } else {
      setText(
        elFaqAnswer,
        "There are " + formatRemaining(d, h, m) +
        " until New Year, on " + formatDay(state.yearEnd) + " at 00:00 in your timezone."
      );
      setLiveAnswer(
        "New Year " + state.targetYear + " starts in " +
        formatRemaining(d, h, m) + ", on " +
        formatDay(state.yearEnd) + " at 00:00 local time."
      );
      setText(elStatusText, "Time until New Year");
      setHTML(
        elYearLabel,
        "Counting down to <strong>" + state.targetYear + "</strong>"
      );
      setHTML(
        elTargetLine,
        "New Year: <strong>" +
        formatTargetDate(state.yearEnd, tz) +
        "</strong>"
      );
    }

    setText(
      elProgressLabel,
      state.mode === "elapsed" ? "New Year progress" : "Year progress"
    );

    var yearLen = state.yearEnd.getTime() - state.yearStart.getTime();
    var yearDone = now.getTime() - state.yearStart.getTime();
    var pct = yearLen > 0
      ? Math.min(100, Math.max(0, (yearDone / yearLen) * 100))
      : 0;
    setWidth(elFill, pct.toFixed(3) + "%");
    setText(elPct, pct.toFixed(2) + "%");
  }

  // Start the timer before the first paint so a DOM mismatch can never leave
  // the countdown frozen.
  setInterval(render, 1000);
  try {
    render();
  } catch (error) {
    if (window.console && console.error) {
      console.error("[New Year Countdown] first render failed:", error);
    }
  }

  var card = document.getElementById("ny-card");
  var fullscreenBtn = document.getElementById("ny-fullscreen-btn");
  if (card && fullscreenBtn) {
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
  }
})();

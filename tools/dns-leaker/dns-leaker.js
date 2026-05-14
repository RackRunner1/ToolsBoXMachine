const startTestBtn = document.getElementById("start-test");
const resultsDiv = document.getElementById("results");
const resultsContent = document.getElementById("results-content");

let peerConnection = null;
let candidates = [];

function createPeerConnection() {
  const config = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      candidates.push(event.candidate);
    }
  };

  peerConnection.onicegatheringstatechange = () => {
    if (peerConnection.iceGatheringState === "complete") {
      displayResults();
    }
  };

  // Create a dummy data channel to trigger ICE candidate gathering
  const dataChannel = peerConnection.createDataChannel("test");

  // Create offer to start the process
  peerConnection
    .createOffer()
    .then((offer) => peerConnection.setLocalDescription(offer))
    .catch((error) => {
      console.error("Error creating offer:", error);
      showError("Failed to create peer connection");
    });
}

function displayResults() {
  const uniqueIPs = new Set();
  const ipDetails = [];

  candidates.forEach((candidate) => {
    if (candidate.candidate) {
      const parts = candidate.candidate.split(" ");
      if (parts.length >= 5) {
        const ip = parts[4];
        const type = parts[7];

        if (ip && !uniqueIPs.has(ip)) {
          uniqueIPs.add(ip);
          ipDetails.push({
            ip: ip,
            type: type || "unknown",
            protocol: parts[2] || "unknown",
          });
        }
      }
    }
  });

  let html = "";

  if (ipDetails.length === 0) {
    html = `
      <div style="text-align: center; padding: 2rem; color: #64748b;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.5;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>No network candidates detected. This might indicate a restrictive network environment.</p>
      </div>
    `;
  } else {
    html = `
      <p style="color: #64748b; margin-bottom: 1rem;">
        Found ${ipDetails.length} unique network candidate${ipDetails.length > 1 ? "s" : ""}:
      </p>
      <div class="ip-list">
    `;

    ipDetails.forEach((detail) => {
      const isLocal =
        detail.ip.startsWith("192.168.") ||
        detail.ip.startsWith("10.") ||
        detail.ip.startsWith("172.") ||
        detail.ip === "127.0.0.1" ||
        detail.ip === "::1";

      const typeLabel = isLocal ? "Local" : "Public";
      const typeColor = isLocal ? "#10b981" : "#f59e0b";

      html += `
        <div class="ip-item">
          <div style="flex: 1;">
            <div class="ip-address">${detail.ip}</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">
              Protocol: ${detail.protocol} • Type: ${detail.type}
            </div>
          </div>
          <div class="ip-type" style="background: ${typeColor}20; color: ${typeColor}; border: 1px solid ${typeColor}40;">
            ${typeLabel}
          </div>
        </div>
      `;
    });

    html += `
      </div>
      <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 0.5rem;">
        <h4 style="color: #3b82f6; margin: 0 0 0.5rem 0; font-size: 0.9rem;">💡 What does this mean?</h4>
        <p style="color: #93c5fd; margin: 0; font-size: 0.8rem;">
          These are network candidates detected by WebRTC. Local IPs are your internal network addresses,
          while public IPs may indicate your internet-facing address. This information can help identify
          potential DNS leaks or network configuration issues.
        </p>
      </div>
    `;
  }

  resultsContent.innerHTML = html;
}

function showError(message) {
  resultsContent.innerHTML = `
    <div style="text-align: center; padding: 2rem; color: #ef4444;">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      <p>${message}</p>
    </div>
  `;
}

function startTest() {
  // Reset state
  candidates = [];
  if (peerConnection) {
    peerConnection.close();
  }

  // Show results container
  resultsDiv.classList.add("show");

  // Start the test
  try {
    createPeerConnection();
  } catch (error) {
    console.error("Error starting test:", error);
    showError(
      "Failed to start DNS leak test. WebRTC may not be supported in this browser.",
    );
  }
}

startTestBtn.addEventListener("click", startTest);

// Auto-start test on page load (optional)
// startTest();

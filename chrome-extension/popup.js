function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function setBadge(connected) {
  const badge = document.getElementById("connection-badge");
  badge.textContent = connected ? "Connected" : "Disconnected";
  badge.className = `badge ${connected ? "success" : "muted"}`;
}

function renderState(currentState) {
  const loggedIn = Boolean(currentState?.session?.access_token);
  setBadge(loggedIn);

  document.getElementById("account-info").textContent = loggedIn
    ? `${currentState.session.user?.email || "Logged in"} | Extension version ${currentState.extensionSession?.extension_version || "0.1.0"}`
    : "Log in to connect the extension with your website account.";

  document.getElementById("sync-info").textContent = currentState?.extensionSession
    ? `Website linked. Last seen: ${new Date(currentState.extensionSession.last_seen || currentState.extensionSession.updated_at).toLocaleString()}`
    : "Waiting for extension login.";

  document.getElementById("facebook-info").textContent = currentState?.lastActivity?.find((item) => item.message.includes("Facebook context synced"))
    ? "Facebook context synced from the current tab."
    : "No Facebook context synced yet.";

  document.getElementById("job-stats").textContent = currentState?.currentJob
    ? `Current job assigned: ${currentState.currentJob.job_type}`
    : "No jobs fetched yet.";

  const currentJob = document.getElementById("current-job");
  if (currentState?.currentJob) {
    currentJob.innerHTML = `
      <strong>${currentState.currentJob.job_type}</strong>
      <div>Status: ${currentState.currentJob.status}</div>
      <div>Mode: ${currentState.currentJob.execution_mode}</div>
      <div>Payload: ${JSON.stringify(currentState.currentJob.payload || {})}</div>
    `;
  } else {
    currentJob.textContent = "No current job assigned.";
  }

  const activityLog = document.getElementById("activity-log");
  if (!currentState?.lastActivity?.length) {
    activityLog.textContent = "No activity yet.";
  } else {
    activityLog.innerHTML = currentState.lastActivity
      .map((item) => `<div class="activity-item"><strong>${item.message}</strong><div>${new Date(item.at).toLocaleString()}</div></div>`)
      .join("");
  }
}

async function init() {
  const response = await send("NOVATIX_POPUP_INIT");
  renderState(response.state);
}

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const response = await send("NOVATIX_LOGIN", { email, password });
  if (!response.ok) {
    alert(response.error);
    return;
  }
  renderState(response.state);
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  const response = await send("NOVATIX_LOGOUT");
  renderState(response.state);
});

document.getElementById("reconnect-btn").addEventListener("click", async () => {
  const response = await send("NOVATIX_SYNC");
  renderState(response.state);
});

document.getElementById("sync-btn").addEventListener("click", async () => {
  const response = await send("NOVATIX_SYNC");
  renderState(response.state);
});

document.getElementById("refresh-jobs-btn").addEventListener("click", async () => {
  const response = await send("NOVATIX_REFRESH_JOBS");
  renderState(response.state);
});

document.getElementById("run-job-btn").addEventListener("click", async () => {
  const response = await send("NOVATIX_EXECUTE_JOB");
  if (!response.ok) {
    alert(response.error);
    return;
  }
  renderState(response.state);
});

document.getElementById("open-dashboard-btn").addEventListener("click", () => send("NOVATIX_OPEN_DASHBOARD", { path: "/dashboard" }));

document.getElementById("open-module-btn").addEventListener("click", () => send("NOVATIX_OPEN_DASHBOARD", { path: "/dashboard/extension" }));

document.getElementById("open-site-btn").addEventListener("click", () => send("NOVATIX_OPEN_DASHBOARD", { path: "/dashboard/extension" }));

document.getElementById("open-test-lab-btn").addEventListener("click", () => send("NOVATIX_OPEN_DASHBOARD", { path: "/dashboard/extension/test-lab" }));

document.getElementById("detect-facebook-btn").addEventListener("click", async () => {
  const response = await send("NOVATIX_DETECT_FACEBOOK");
  if (!response.ok) {
    alert(response.error);
    return;
  }
  renderState(response.state);
});

document.getElementById("disconnect-btn").addEventListener("click", async () => {
  const response = await send("NOVATIX_LOGOUT");
  renderState(response.state);
});

init();

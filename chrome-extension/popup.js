function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function setBanner(message, variant = "info") {
  const banner = document.getElementById("status-banner");
  banner.textContent = message || "";
  banner.className = `status-banner${message ? ` ${variant}` : " hidden"}`;
}

function setMiniStatus(message) {
  document.getElementById("mini-status").textContent = message;
}

function setBusy(isBusy, actionLabel = "Working...") {
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
  setMiniStatus(isBusy ? actionLabel : "Ready");
}

function setBadge(connected) {
  const badge = document.getElementById("connection-badge");
  badge.textContent = connected ? "Connected" : "Disconnected";
  badge.className = `badge ${connected ? "success" : "muted"}`;
}

function renderState(currentState) {
  const loggedIn = Boolean(currentState?.session?.access_token);
  setBadge(loggedIn);
  setMiniStatus(loggedIn ? "Synced" : "Idle");

  document.getElementById("account-info").textContent = loggedIn
    ? `${currentState.session.user?.email || "Logged in"} | Extension ${currentState.extensionSession?.extension_version || "0.1.0"}`
    : "Use your existing website session or sign in directly here.";

  document.getElementById("sync-info").textContent = currentState?.extensionSession
    ? `Website linked. Last seen: ${new Date(currentState.extensionSession.last_seen || currentState.extensionSession.updated_at).toLocaleString()}`
    : "Waiting for extension login.";

  const syncedFacebook = currentState?.lastActivity?.find((item) => item.message.includes("Facebook context synced"));
  document.getElementById("facebook-info").textContent = syncedFacebook
    ? `Facebook context synced at ${new Date(syncedFacebook.at).toLocaleString()}.`
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

async function handleAction(action, busyLabel) {
  setBusy(true, busyLabel);
  try {
    const response = await action();
    if (!response.ok) {
      setBanner(response.error || "Something went wrong", "error");
      return response;
    }
    renderState(response.state);
    setBanner("Action completed successfully.", "success");
    return response;
  } catch (error) {
    setBanner(error instanceof Error ? error.message : "Unexpected error", "error");
    return null;
  } finally {
    setBusy(false);
  }
}

async function init() {
  setBusy(true, "Loading...");
  const response = await send("NOVATIX_POPUP_INIT");
  renderState(response.state);
  setBusy(false);
  if (response.state?.session?.access_token) {
    setBanner("Extension is connected to your account.", "success");
  } else {
    setBanner("Tip: if the website is already logged in, use Website Login first.", "info");
  }
}

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) {
    setBanner("Enter both email and password.", "error");
    return;
  }
  await handleAction(() => send("NOVATIX_LOGIN", { email, password }), "Logging in...");
});

document.getElementById("website-login-btn").addEventListener("click", async () => {
  await handleAction(() => send("NOVATIX_USE_WEBSITE_LOGIN"), "Checking website login...");
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await handleAction(() => send("NOVATIX_LOGOUT"), "Disconnecting...");
});

document.getElementById("reconnect-btn").addEventListener("click", async () => {
  await handleAction(() => send("NOVATIX_SYNC"), "Reconnecting...");
});

document.getElementById("sync-btn").addEventListener("click", async () => {
  await handleAction(() => send("NOVATIX_SYNC"), "Syncing...");
});

document.getElementById("refresh-jobs-btn").addEventListener("click", async () => {
  await handleAction(() => send("NOVATIX_REFRESH_JOBS"), "Refreshing jobs...");
});

document.getElementById("run-job-btn").addEventListener("click", async () => {
  await handleAction(() => send("NOVATIX_EXECUTE_JOB"), "Running job...");
});

document.getElementById("open-dashboard-btn").addEventListener("click", () => send("NOVATIX_OPEN_DASHBOARD", { path: "/dashboard" }));
document.getElementById("open-module-btn").addEventListener("click", () => send("NOVATIX_OPEN_DASHBOARD", { path: "/dashboard/extension" }));
document.getElementById("open-site-btn").addEventListener("click", () => send("NOVATIX_OPEN_DASHBOARD", { path: "/dashboard/extension" }));
document.getElementById("open-test-lab-btn").addEventListener("click", () => send("NOVATIX_OPEN_DASHBOARD", { path: "/dashboard/extension/test-lab" }));

document.getElementById("detect-facebook-btn").addEventListener("click", async () => {
  await handleAction(() => send("NOVATIX_DETECT_FACEBOOK"), "Syncing Facebook...");
});

document.getElementById("disconnect-btn").addEventListener("click", async () => {
  await handleAction(() => send("NOVATIX_LOGOUT"), "Disconnecting...");
});

init();

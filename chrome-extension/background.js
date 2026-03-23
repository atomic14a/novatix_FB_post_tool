import { APP_URL, EXTENSION_VERSION, POLL_INTERVAL } from "./config.js";

const state = {
  session: null,
  config: null,
  extensionSession: null,
  currentJob: null,
  stats: { pending: 0, completed: 0, failed: 0 },
  lastActivity: [],
};

function logActivity(message, metadata = {}) {
  const item = { message, metadata, at: new Date().toISOString() };
  state.lastActivity = [item, ...state.lastActivity].slice(0, 10);
  chrome.storage.local.set({ novatix_state: state });
}

async function fetchConfig() {
  const response = await fetch(`${APP_URL}/api/extension/config`);
  const data = await response.json();
  state.config = data;
  await chrome.storage.local.set({ novatix_state: state });
  return data;
}

async function signIn(email, password) {
  const config = state.config || (await fetchConfig());
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || "Extension login failed");
  }

  state.session = data;
  await chrome.storage.local.set({ novatix_state: state });
  logActivity("Logged in from extension", { email });
  await syncSession(true);
  await openWebsiteBridge();
  return data;
}

async function signOut() {
  if (state.session?.access_token && state.config?.supabaseUrl && state.config?.supabaseAnonKey) {
    await fetch(`${state.config.supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: state.config.supabaseAnonKey,
        Authorization: `Bearer ${state.session.access_token}`,
      },
    }).catch(() => undefined);
  }

  await syncSession(false).catch(() => undefined);
  state.session = null;
  state.extensionSession = null;
  state.currentJob = null;
  logActivity("Logged out from extension");
  await chrome.storage.local.set({ novatix_state: state });
}

function getAuthHeaders() {
  if (!state.session?.access_token) {
    throw new Error("Extension session missing");
  }

  return {
    Authorization: `Bearer ${state.session.access_token}`,
    "Content-Type": "application/json",
  };
}

function getDeviceFingerprint() {
  return {
    device_id: chrome.runtime.id,
    browser_id: chrome.runtime.id,
    browser_name: "Chrome",
    platform: navigator.platform,
    extension_version: EXTENSION_VERSION,
  };
}

async function syncSession(isOnline = true) {
  if (!state.session?.access_token) {
    return null;
  }

  const response = await fetch(`${APP_URL}/api/extension/session`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...getDeviceFingerprint(),
      is_online: isOnline,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to sync extension session");
  }

  state.extensionSession = data.session;
  await chrome.storage.local.set({ novatix_state: state });
  logActivity(isOnline ? "Website sync successful" : "Extension disconnected");
  return data.session;
}

async function openWebsiteBridge() {
  if (!state.session) return;

  const hash = new URLSearchParams({
    access_token: state.session.access_token,
    refresh_token: state.session.refresh_token,
    redirect: "/dashboard/extension",
  });

  await chrome.tabs.create({ url: `${APP_URL}/extension/bridge#${hash.toString()}` });
}

async function openDashboard(path = "/dashboard/extension") {
  await chrome.tabs.create({ url: `${APP_URL}${path}` });
}

async function fetchJobs() {
  if (!state.session?.access_token) {
    return null;
  }

  const sessionId = state.extensionSession?.id ? `?session_id=${state.extensionSession.id}` : "";
  const response = await fetch(`${APP_URL}/api/extension/jobs${sessionId}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch jobs");
  }

  state.currentJob = data.job || null;
  await chrome.storage.local.set({ novatix_state: state });

  if (data.job) {
    logActivity("Job fetched", { job_id: data.job.id, job_type: data.job.job_type });
  }

  return data.job;
}

async function updateJob(jobId, status, extra = {}) {
  const response = await fetch(`${APP_URL}/api/extension/jobs/${jobId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      status,
      session_id: state.extensionSession?.id || null,
      ...extra,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to update job");
  }

  return data.job;
}

async function createResult(jobId, payload) {
  await fetch(`${APP_URL}/api/extension/jobs/${jobId}/result`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

async function syncFacebookContext(contextPayload) {
  await fetch(`${APP_URL}/api/extension/context`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      session_id: state.extensionSession?.id || null,
      ...contextPayload,
    }),
  });
}

async function detectFacebookContext() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.id || !activeTab.url?.includes("facebook.com")) {
    const fallback = {
      facebook_detected: false,
      facebook_logged_in: false,
      account_name: null,
      page_name: null,
      page_id: null,
      detected_pages_count: 0,
      context_data: { active_url: activeTab?.url || null },
    };
    await syncFacebookContext(fallback).catch(() => undefined);
    return fallback;
  }

  const result = await chrome.tabs.sendMessage(activeTab.id, { type: "NOVATIX_DETECT_FACEBOOK" }).catch(() => null);
  if (result) {
    await syncFacebookContext(result).catch(() => undefined);
    logActivity("Facebook context synced", result);
  }
  return result;
}

async function executeCurrentJob() {
  const job = state.currentJob || (await fetchJobs());
  if (!job) return null;

  await updateJob(job.id, "processing");
  logActivity("Publish started", { job_id: job.id });

  try {
    let resultPayload = {
      result_type: "job_result",
      success: true,
      response_data: {
        executed_at: new Date().toISOString(),
        job_type: job.job_type,
        payload: job.payload,
      },
    };

    if (job.job_type === "facebook_context_scan") {
      const context = await detectFacebookContext();
      resultPayload = {
        result_type: "facebook_context",
        success: true,
        response_data: context || {},
      };
    }

    await createResult(job.id, resultPayload);
    await updateJob(job.id, "completed");
    logActivity("Publish completed", { job_id: job.id });
    state.stats.completed += 1;
    state.currentJob = null;
    await chrome.storage.local.set({ novatix_state: state });
    return resultPayload;
  } catch (error) {
    await createResult(job.id, {
      result_type: "job_result",
      success: false,
      error_message: error instanceof Error ? error.message : "Execution failed",
      response_data: {},
    }).catch(() => undefined);
    await updateJob(job.id, "failed", { error_log: error instanceof Error ? error.message : "Execution failed" }).catch(() => undefined);
    logActivity("Publish failed", { job_id: job.id, error: error instanceof Error ? error.message : "Execution failed" });
    state.stats.failed += 1;
    state.currentJob = null;
    await chrome.storage.local.set({ novatix_state: state });
    throw error;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ novatix_state: state });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "NOVATIX_POPUP_INIT") {
        if (!state.config) {
          await fetchConfig();
        }
        sendResponse({ ok: true, state });
        return;
      }

      if (message.type === "NOVATIX_LOGIN") {
        const data = await signIn(message.email, message.password);
        sendResponse({ ok: true, data, state });
        return;
      }

      if (message.type === "NOVATIX_LOGOUT") {
        await signOut();
        sendResponse({ ok: true, state });
        return;
      }

      if (message.type === "NOVATIX_SYNC") {
        await syncSession(true);
        sendResponse({ ok: true, state });
        return;
      }

      if (message.type === "NOVATIX_REFRESH_JOBS") {
        const job = await fetchJobs();
        sendResponse({ ok: true, job, state });
        return;
      }

      if (message.type === "NOVATIX_EXECUTE_JOB") {
        const result = await executeCurrentJob();
        sendResponse({ ok: true, result, state });
        return;
      }

      if (message.type === "NOVATIX_OPEN_DASHBOARD") {
        await openDashboard(message.path || "/dashboard/extension");
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "NOVATIX_DETECT_FACEBOOK") {
        const result = await detectFacebookContext();
        sendResponse({ ok: true, result, state });
        return;
      }
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown error", state });
    }
  })();

  return true;
});

setInterval(() => {
  if (state.session?.access_token) {
    syncSession(true).catch(() => undefined);
    fetchJobs().catch(() => undefined);
  }
}, POLL_INTERVAL);

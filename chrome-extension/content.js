function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function getRouteType(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    if (path.startsWith("/messages") || path.startsWith("/t/")) return "messages";
    if (path === "/" || path === "") return "home";
    if (path.startsWith("/profile.php")) return "profile";
    if (path.startsWith("/groups/")) return "group";
    if (path.startsWith("/watch")) return "watch";
    if (path.startsWith("/marketplace")) return "marketplace";
    if (path.startsWith("/reel/") || path.startsWith("/reels/")) return "reels";

    const slug = path.split("/").filter(Boolean)[0] || "";
    if (!slug || ["login", "messages", "notifications", "friends", "bookmarks", "events"].includes(slug)) {
      return "generic";
    }

    return "entity";
  } catch {
    return "unknown";
  }
}

function extractEntityId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.toLowerCase() === "/profile.php") {
      return parsed.searchParams.get("id");
    }

    const slug = parsed.pathname.split("/").filter(Boolean)[0] || null;
    return slug;
  } catch {
    return null;
  }
}

function detectHeading() {
  const selectors = [
    "[role='main'] h1",
    "h1",
    "[aria-level='1']",
    "[role='main'] h2",
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = cleanText(el?.textContent || "");
    if (text) return text;
  }

  return null;
}

function detectAccountName() {
  const metaTitle = cleanText(document.querySelector("meta[property='og:title']")?.getAttribute("content") || "");
  const heading = detectHeading();
  const title = cleanText(document.title || "");
  const routeType = getRouteType(window.location.href);
  const badTitles = new Set(["facebook", "log in or sign up", "login", "chats", "messages"]);

  if (routeType === "messages" || routeType === "generic" || routeType === "home") {
    return null;
  }

  if (heading && !badTitles.has(heading.toLowerCase())) return heading;
  if (metaTitle && !badTitles.has(metaTitle.toLowerCase())) return metaTitle;
  if (title && !badTitles.has(title.toLowerCase())) return title;
  return null;
}

function detectPageName() {
  const routeType = getRouteType(window.location.href);
  const heading = detectHeading();
  const title = cleanText(document.title || "");
  const badTitles = new Set(["facebook", "log in or sign up", "login", "chats", "messages"]);

  if (routeType !== "entity" && routeType !== "profile") {
    return null;
  }

  if (heading && !badTitles.has(heading.toLowerCase())) return heading;
  if (title && !badTitles.has(title.toLowerCase())) return title;
  return null;
}

function isLoggedIn(title) {
  const normalized = (title || "").toLowerCase();
  const hasLoginForm = Boolean(document.querySelector("form input[type='password']"));
  return !hasLoginForm && !normalized.includes("log in") && !normalized.includes("login");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "NOVATIX_DETECT_FACEBOOK") return;

  const title = cleanText(document.title || "");
  const routeType = getRouteType(window.location.href);
  const pageName = detectPageName();
  const accountName = detectAccountName();
  const pageId = pageName ? extractEntityId(window.location.href) : null;

  sendResponse({
    facebook_detected: true,
    facebook_logged_in: isLoggedIn(title),
    account_name: accountName,
    page_name: pageName,
    page_id: pageId,
    detected_pages_count: pageName ? 1 : 0,
    context_data: {
      url: window.location.href,
      title,
      route_type: routeType,
      heading: detectHeading(),
      referrer: document.referrer || null,
    },
  });

  return true;
});

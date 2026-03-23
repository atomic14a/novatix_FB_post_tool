function extractPageId(url) {
  const match = url.match(/facebook\.com\/(?:profile\.php\?id=)?([^/?&]+)/i);
  return match ? match[1] : null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "NOVATIX_DETECT_FACEBOOK") return;

  const title = document.title || "";
  const accountName = document.querySelector("meta[property='og:title']")?.getAttribute("content") || title;

  sendResponse({
    facebook_detected: true,
    facebook_logged_in: !title.toLowerCase().includes("log in") && !title.toLowerCase().includes("login"),
    account_name: accountName,
    page_name: title,
    page_id: extractPageId(window.location.href),
    detected_pages_count: 1,
    context_data: {
      url: window.location.href,
      title,
      referrer: document.referrer || null,
    },
  });

  return true;
});

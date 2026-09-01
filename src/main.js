const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const PAGE_URL = "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = path.join(__dirname, "..", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "catalogue-page-1.html");

const USER_AGENT = "FlyRankInternship-A9/1.0";

// Fetch a catalogue page
async function fetchCataloguePage(pageUrl) {
  // বর্তমানে শুধু Page 1-এর cache check করছি
  if (fs.existsSync(CACHE_FILE) && pageUrl === PAGE_URL) {
    const html = fs.readFileSync(CACHE_FILE, "utf-8");

    console.log("CACHE HIT");
    console.log(`Response size: ${html.length} bytes`);

    return html;
  }

  console.log("FETCH");

  // Create cache folder if it doesn't exist
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Create controller for timeout
  const controller = new AbortController();

  // Stop request after 10 seconds
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    // Only accept status 200
    if (response.status !== 200) {
      throw new Error(`Fetch failed with status: ${response.status}`);
    }

    // Get HTML from response
    const html = await response.text();

    // Save Page 1 HTML in cache
    if (pageUrl === PAGE_URL) {
      fs.writeFileSync(CACHE_FILE, html, "utf-8");
    }

    console.log(`Status: ${response.status}`);
    console.log(`Response size: ${html.length} bytes`);

    return html;
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  // Current catalogue page
  let currentPageUrl = PAGE_URL;

  // Fetch Page 1
  const html = await fetchCataloguePage(currentPageUrl);

  // Load HTML with Cheerio
  const $ = cheerio.load(html);

  // Store book links
  const links = [];

  // Find all book links
  $("article.product_pod h3 a").each((index, element) => {
    const href = $(element).attr("href");

    // Convert relative URL to absolute URL
    const absoluteUrl = new URL(href, currentPageUrl).href;

    links.push(absoluteUrl);
  });

  // Print number of books
  console.log(`Books found: ${links.length}`);

  // Find the Next page link
  const nextHref = $("li.next a").attr("href");

  console.log("Next page link:", nextHref);

  // Convert Next link to absolute URL
  if (nextHref) {
    const nextPageUrl = new URL(nextHref, currentPageUrl).href;

    console.log("Next page URL:", nextPageUrl);
  }
}

main();
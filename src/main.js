const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const START_URL =
  "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = path.join(__dirname, "..", "cache");

const USER_AGENT = "FlyRankInternship-A9/1.0";

function getCacheFile(pageUrl) {
  const url = new URL(pageUrl);
  const fileName = url.pathname
    .split("/")
    .pop()
    .replace(".html", "");

  return path.join(CACHE_DIR, `${fileName}.html`);
}

async function fetchCataloguePage(pageUrl) {
  const cacheFile = getCacheFile(pageUrl);

  // Check cache first
  if (fs.existsSync(cacheFile)) {
    const html = fs.readFileSync(cacheFile, "utf-8");

    console.log("CACHE HIT");
    console.log(`Response size: ${html.length} bytes`);

    return html;
  }

  console.log(`FETCH: ${pageUrl}`);

  // Create cache folder if needed
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Create timeout controller
  const controller = new AbortController();

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

    // Only accept successful response
    if (response.status !== 200) {
      throw new Error(`Fetch failed with status: ${response.status}`);
    }

    const html = await response.text();

    // Save page in cache
    fs.writeFileSync(cacheFile, html, "utf-8");

    console.log(`Status: ${response.status}`);
    console.log(`Response size: ${html.length} bytes`);

    return html;
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  let currentPageUrl = START_URL;
  let pageCount = 0;

  const allBookLinks = [];

  while (currentPageUrl && pageCount < 3) {
    console.log(`\n--- Catalogue Page ${pageCount + 1} ---`);

    const html = await fetchCataloguePage(currentPageUrl);

    // Stop if page could not be fetched
    if (!html) {
      break;
    }

    // Load page HTML
    const $ = cheerio.load(html);

    // Find all book links on this page
    $("article.product_pod h3 a").each((index, element) => {
      const href = $(element).attr("href");

      if (href) {
        const absoluteUrl = new URL(
          href,
          currentPageUrl
        ).href;

        allBookLinks.push(absoluteUrl);
      }
    });

    // Find the site's own Next link
    const nextHref = $("li.next a").attr("href");

    // Prepare the next page URL
    if (nextHref) {
      currentPageUrl = new URL(
        nextHref,
        currentPageUrl
      ).href;
    } else {
      currentPageUrl = null;
    }

    pageCount++;
  }

  // Remove duplicates
  const uniqueBookLinks = [...new Set(allBookLinks)];

  console.log("\n--- SUMMARY ---");
  console.log(`catalogue_pages=${pageCount}`);
  console.log(`discovered=${allBookLinks.length}`);
  console.log(`unique_urls=${uniqueBookLinks.length}`);
}

main();

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const PAGE_URL = "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = path.join(__dirname, "..", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "catalogue-page-1.html");

const USER_AGENT = "FlyRankInternship-A9/1.0";

async function fetchCataloguePage() {
  // Check if cached file already exists
  if (fs.existsSync(CACHE_FILE)) {
    const html = fs.readFileSync(CACHE_FILE, "utf-8");

    console.log("CACHE HIT");
    console.log(`Response size: ${html.length} bytes`);

    return html;
  }

  console.log("FETCH");

  // Create cache folder if it doesn't exist
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Timeout after 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(PAGE_URL, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    // Check status before parsing HTML
    if (response.status !== 200) {
      throw new Error(`Fetch failed with status: ${response.status}`);
    }

    const html = await response.text();

    // Save HTML in cache
    fs.writeFileSync(CACHE_FILE, html, "utf-8");

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
  const html = await fetchCataloguePage();

  const $ = cheerio.load(html);

  const links = [];

  $("article.product_pod h3 a").each((index, element) => {
    const href = $(element).attr("href");
    links.push(href);
  });

  console.log(`Books found: ${links.length}`);
  console.log(links);
}

main();
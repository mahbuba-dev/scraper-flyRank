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
await sleep(DELAY_MS);
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



const DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}



async function fetchBookPage(bookUrl) {
  // Create cache folder if needed
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Create a unique cache file name for this book
  const url = new URL(bookUrl);

  const folderName = url.pathname
    .split("/")
    .filter(Boolean)
    .slice(-2, -1)[0];

  const cacheFile = path.join(
    CACHE_DIR,
    `book-${folderName}.html`
  );

  // Check cache first
  if (fs.existsSync(cacheFile)) {
    const html = fs.readFileSync(cacheFile, "utf-8");

    console.log(`CACHE HIT: ${bookUrl}`);

    return html;
  }
await sleep(DELAY_MS);
  console.log(`FETCHING BOOK: ${bookUrl}`);

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(bookUrl, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    // Only accept status 200
    if (response.status !== 200) {
      throw new Error(`Fetch failed with status: ${response.status}`);
    }

    const html = await response.text();

    // Save book HTML in cache
    fs.writeFileSync(cacheFile, html, "utf-8");

    console.log(`Status: ${response.status}`);
    console.log(`Response size: ${html.length} bytes`);

    return html;
  } catch (error) {
    console.error("Book fetch error:", error.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}


function extractBookDetails(bookHtml, productUrl, sourcePage) {
  const $ = cheerio.load(bookHtml);

  const title = $(".product_main h1").text().trim();

 // Price
const priceText = $(".product_main .price_color")
  .text()
  .trim();

const priceGbp = Number(
  priceText.replace("£", "")
);

  const availabilityText = $(".product_main .availability")
    .text()
    .trim();

  const className = $(".product_main .star-rating").attr("class");

  const ratingText = className
    ? className
        .split(" ")
        .filter((className) => className !== "star-rating")[0]
    : null;

  const descriptionElement = $("#product_description").next("p");

  const description = descriptionElement.length
    ? descriptionElement.text().trim()
    : null;

 return {
  title,
  product_url: productUrl,
  price_text: priceText,
  price_gbp: priceGbp,
  availability_text: availabilityText,
  rating_text: ratingText,
  description,
  source_page: sourcePage,
  fetched_at: new Date().toISOString(),
};
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
  console.log("\n--- FIRST BOOK ---");
console.log(uniqueBookLinks[0]);


const rawRecords = [];

for (const bookUrl of uniqueBookLinks) {
  const bookHtml = await fetchBookPage(bookUrl);

  if (bookHtml) {
    const rawRecord = extractBookDetails(
      bookHtml,
      bookUrl,
      START_URL
    );

    rawRecords.push(rawRecord);

    console.log("\n--- BOOK ---");
    console.log(rawRecord.title);
  }
}

console.log("\n--- FINAL SUMMARY ---");
console.log(`detail_pages=${rawRecords.length}`);

}






main();



const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { z } = require("zod");

const START_URL =
  "https://books.toscrape.com/catalogue/page-1.html";

const CACHE_DIR = path.join(__dirname, "..", "cache");
const OUTPUT_DIR = path.join(__dirname, "..", "output");

const USER_AGENT = "FlyRankInternship-A9/1.0";
let cacheHits = 0;
let pagesFetched = 0;

const BookSchema = z.object({
  title: z.string().min(1),

  product_url: z.string().url(),

  price_text: z.string().min(1),

  price_gbp: z.number().positive(),

  availability_text: z.string().min(1),

  rating_text: z.string().nullable(),

  description: z.string().nullable(),

  source_page: z.string().url(),

  fetched_at: z.string(),
});


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

    cacheHits++;

    console.log("CACHE HIT");
    console.log(`Response size: ${html.length} bytes`);

    return html;
  }

  // Maximum 2 attempts:
  // First attempt + 1 retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    // Wait only before a real request
    await sleep(DELAY_MS);

    console.log(
      `FETCH (attempt ${attempt}): ${pageUrl}`
    );

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      pagesFetched++;

      const response = await fetch(pageUrl, {
        headers: {
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
      });

      // Success
      if (response.status === 200) {
        const html = await response.text();

        fs.mkdirSync(CACHE_DIR, { recursive: true });

        fs.writeFileSync(cacheFile, html, "utf-8");

        console.log(`Status: ${response.status}`);
        console.log(`Response size: ${html.length} bytes`);

        return html;
      }

      // Do not retry 403 or 404
      if (
        response.status === 403 ||
        response.status === 404
      ) {
        console.error(
          `Catalogue fetch failed with status: ${response.status}`
        );

        return null;
      }

      // Retry only 5xx errors
      if (response.status >= 500 && response.status <= 599) {
        console.error(
          `Server error: ${response.status}`
        );

        if (attempt === 1) {
          console.log("Retrying once after 1 second...");
          await sleep(1000);
          continue;
        }

        return null;
      }

      // Other errors
      console.error(
        `Catalogue fetch failed with status: ${response.status}`
      );

      return null;

    } catch (error) {
      // Timeout or network error
      console.error(
        `Request error: ${error.name} - ${error.message}`
      );

      if (attempt === 1) {
        console.log("Retrying once after 1 second...");
        await sleep(1000);
        continue;
      }

      return null;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}


const DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}



async function fetchBookPage(bookUrl) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

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

    cacheHits++;

    console.log(`CACHE HIT: ${bookUrl}`);

    return html;
  }

  // Maximum 2 attempts:
  // First attempt + 1 retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    await sleep(DELAY_MS);

    console.log(
      `FETCHING BOOK (attempt ${attempt}): ${bookUrl}`
    );

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      pagesFetched++;

      const response = await fetch(bookUrl, {
        headers: {
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
      });

      // Success
      if (response.status === 200) {
        const html = await response.text();

        fs.writeFileSync(cacheFile, html, "utf-8");

        console.log(`Status: ${response.status}`);
        console.log(`Response size: ${html.length} bytes`);

        return html;
      }

      // Do NOT retry 403 or 404
      if (
        response.status === 403 ||
        response.status === 404
      ) {
        console.error(
          `Book fetch failed with status: ${response.status}`
        );

        return null;
      }

      // Retry only 5xx errors
      if (response.status >= 500 && response.status <= 599) {
        console.error(
          `Server error: ${response.status}`
        );

        if (attempt === 1) {
          console.log("Retrying once after 1 second...");
          await sleep(1000);
          continue;
        }

        return null;
      }

      // Other errors: stop
      console.error(
        `Book fetch failed with status: ${response.status}`
      );

      return null;

    } catch (error) {
      // Timeout or network error
      console.error(
        `Request error: ${error.name} - ${error.message}`
      );

      if (attempt === 1) {
        console.log("Retrying once after 1 second...");
        await sleep(1000);
        continue;
      }

      return null;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
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
  const startTime = new Date();
const startTimestamp = startTime.toISOString();
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
// Add one fake URL only for failure testing
const bookUrlsToProcess = [
  ...uniqueBookLinks,
  "https://books.toscrape.com/catalogue/fake-book-does-not-exist/index.html",
];
  console.log("\n--- SUMMARY ---");
  console.log(`catalogue_pages=${pageCount}`);
  console.log(`discovered=${allBookLinks.length}`);
  console.log(`unique_urls=${uniqueBookLinks.length}`);
  console.log("\n--- FIRST BOOK ---");
console.log(uniqueBookLinks[0]);


const rawRecords = [];
const validRecords = [];
const invalidRecords = [];
let failedPages = 0;

for (const bookUrl of bookUrlsToProcess) {
  const bookHtml = await fetchBookPage(bookUrl);

  // If the page failed, count it and continue
  if (!bookHtml) {
    failedPages++;

    console.log(`FAILED: ${bookUrl}`);

    continue;
  }

  const rawRecord = extractBookDetails(
    bookHtml,
    bookUrl,
    START_URL
  );

  rawRecords.push(rawRecord);

  // Validate the record
  const result = BookSchema.safeParse(rawRecord);

  if (result.success) {
    validRecords.push(result.data);

    console.log(`VALID: ${rawRecord.title}`);
  } else {
    invalidRecords.push({
      record: rawRecord,
      reason: result.error.issues,
    });

    console.log(`INVALID: ${rawRecord.title}`);
  }
}
console.log("\n--- VALIDATION SUMMARY ---");
console.log(`Raw records: ${rawRecords.length}`);
console.log(`Valid records: ${validRecords.length}`);
console.log(`Invalid records: ${invalidRecords.length}`);
console.log("\n--- FINAL SUMMARY ---");
console.log(`detail_pages=${rawRecords.length}`);
console.log(`Failed pages: ${failedPages}`);


// Create output folder if needed
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Save valid records
const booksFile = path.join(OUTPUT_DIR, "books.json");

fs.writeFileSync(
  booksFile,
  JSON.stringify(validRecords, null, 2),
  "utf-8"
);

// Save invalid records
const errorsFile = path.join(OUTPUT_DIR, "errors.json");

fs.writeFileSync(
  errorsFile,
  JSON.stringify(invalidRecords, null, 2),
  "utf-8"
);

console.log("\n--- FILES SAVED ---");
console.log(`books.json: ${validRecords.length} records`);
console.log(`errors.json: ${invalidRecords.length} records`);


const endTime = new Date();

const durationMs = endTime - startTime;

const runReport = {
  start_time: startTimestamp,
  duration_ms: durationMs,
  pages_fetched: pagesFetched,
  cache_hits: cacheHits,
  catalogue_pages: pageCount,
  detail_pages: rawRecords.length,
  valid_records: validRecords.length,
  invalid_records: invalidRecords.length,
  failed_pages: failedPages,
};

const reportFile = path.join(
  OUTPUT_DIR,
  "run-report.json"
);

fs.writeFileSync(
  reportFile,
  JSON.stringify(runReport, null, 2),
  "utf-8"
);

console.log("\n--- RUN REPORT ---");
console.log(runReport);

}






main();



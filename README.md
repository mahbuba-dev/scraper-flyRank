# FlyRank Internship – Backend Track – Week 5 Assignment A9

## The Polite Scraper

A polite web scraping pipeline built with Node.js, Cheerio, and Zod.

## Target Classification

**Target:** Books to Scrape (`https://books.toscrape.com/`)

Books to Scrape is a public practice sandbox created for learning and practicing web scraping.

**Scope:** This scraper processes only the first 3 catalogue pages and discovers 60 book URLs.

**Data collected:**

* Title
* Product URL
* Price text
* Price in GBP
* Availability
* Rating
* Description
* Source page
* Fetch time

I collect only the data needed for this assignment from the public practice sandbox.

### Robots.txt Check


I requested `https://books.toscrape.com/robots.txt` and received a `404 Not Found` response.

No robots file found.

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
```

Go to the project folder:

```bash
cd scraper
```

Install dependencies:

```bash
npm install
```

## Run the Scraper

Run:

```bash
node src/main.js
```

The scraper will:

1. Process the first 3 catalogue pages.
2. Discover 60 unique book URLs.
3. Fetch and cache book pages.
4. Extract book information.
5. Normalize `price_text` into numeric `price_gbp`.
6. Validate records using Zod.
7. Save valid records to `output/books.json`.
8. Save invalid records to `output/errors.json`.
9. Handle failed pages without crashing.
10. Create `output/run-report.json`.

After running, the output folder contains:

```text
output/
├── books.json
├── errors.json
└── run-report.json
```


## Record Schema

Each validated book record has the following structure:

```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "price_gbp": 51.77,
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "Book description or null",
  "source_page": "https://books.toscrape.com/catalogue/page-1.html",
  "fetched_at": "2026-09-02T00:00:00.000Z"
}
```

Records are validated with Zod before they are stored. Invalid records are saved separately in `output/errors.json` with the validation reason.

## Politeness Rules

This scraper follows these rules:

* Sends an identifying `User-Agent` with every real request.
* Uses a 10-second timeout so requests do not wait forever.
* Waits at least 500ms before each real request.
* Uses cached HTML during development to avoid repeatedly requesting the same pages.
* Checks the HTTP status code before parsing HTML.
* Retries once for timeout, network, or 5xx server errors.
* Does not retry 403 or 404 responses.
* Handles a failed page without crashing the entire scraper.

## Data Validation

Web pages are treated as untrusted input. Every extracted record is checked against the Zod schema before storage.

* Valid records → `output/books.json`
* Invalid records → `output/errors.json`

The scraper uses the absolute `product_url` as the record identity and removes duplicate URLs before processing.



## Why No Browser Was Needed

This assignment did not need a browser because the required book data is already present in the HTML sent by the server. A browser would add unnecessary cost and complexity.

## Limitation

This scraper is designed only for the first three catalogue pages of the Books to Scrape practice sandbox. It is not designed to scrape arbitrary websites without checking their rules and terms.

## Ethics

I use an official API when one exists. I do not bypass logins, paywalls, or access blocks. I collect only the data needed for the task and check a site's rules and terms before reusing this scraper on another website.

## Run Report Example

After each run, the scraper creates `output/run-report.json`.

Example:

```json
--- RUN REPORT ---
{
  start_time: '2026-09-02T14:16:19.613Z',
  duration_ms: 5503,
  pages_fetched: 1,
  cache_hits: 63,
  catalogue_pages: 3,
  detail_pages: 60,
  valid_records: 60,
  invalid_records: 0,
  failed_pages: 1
}
```

The actual numbers may change depending on the cache and whether the broken test URL is included.


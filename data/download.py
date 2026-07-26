# /// script
# requires-python = ">=3.12"
# dependencies = ["bse>=3.0.0"]
# ///
"""
DRHPilot corpus downloader
===========================
Source 1 — SEBI DRHPs       : scrape each filing page → extract PDF URL → download
Source 2 — BSE Annual Reports: BSE announcements API → latest AR PDF → download

Run:  uv run data/download.py

Output:
  data/downloads/drhp/<company_slug>_<year>_drhp.pdf
  data/downloads/annual_report/<company_slug>_<year>_ar.pdf
  data/downloads/manifest.json

To add more DRHPs:
  1. Go to https://www.sebi.gov.in/filings/public-issues.html
  2. Find the company's filing page
  3. Add an entry to DRHP_CATALOGUE below

NOTE: Page numbers in the downloaded PDFs are critical for citation accuracy.
      The ingestion pipeline preserves these — do not strip metadata on conversion.
"""
from __future__ import annotations

import json
import re
import time
from datetime import UTC, date, datetime
from pathlib import Path
import http.client
from urllib import request
from urllib.error import HTTPError, URLError

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────────────────────
OUTPUT_DIR     = Path(__file__).resolve().parent / "downloads"
CLEAR_OUTPUT   = False       # True: wipe downloads/ before running
REQUEST_DELAY  = 0.6         # seconds between requests (be polite to servers)
AR_YEARS       = [2023, 2024]  # financial years to fetch for annual reports

SEBI_BASE      = "https://www.sebi.gov.in"

# ──────────────────────────────────────────────────────────────────────────────
# SEBI DRHP CATALOGUE
# ──────────────────────────────────────────────────────────────────────────────
# Each entry: company name, filing-page URL on sebi.gov.in, year.
# URL format: https://www.sebi.gov.in/filings/public-issues/{mon-year}/{slug}_{id}.html
# The scraper extracts the PDF link from the page automatically.
# All URLs below are verified from SEBI's public filings portal.
# ──────────────────────────────────────────────────────────────────────────────
DRHP_CATALOGUE: list[dict[str, str]] = [
    # ── 2026 ──────────────────────────────────────────────────────────────────
    {
        "company": "National Stock Exchange of India",
        "year": "2026",
        "filing_page": "https://www.sebi.gov.in/filings/public-issues/jun-2026/national-stock-exchange-of-india-ltd-drhp_102189.html",
    },
    # ── 2024 ──────────────────────────────────────────────────────────────────
    {
        "company": "Swiggy",
        "year": "2024",
        "filing_page": "https://www.sebi.gov.in/filings/public-issues/sep-2024/swiggy-limited-updated-drhp-i_87047.html",
    },
    {
        "company": "Hero Motors",
        "year": "2024",
        "filing_page": "https://www.sebi.gov.in/filings/public-issues/aug-2024/hero-motors-limited-drhp_86112.html",
    },
    {
        "company": "Sai Life Sciences",
        "year": "2024",
        "filing_page": "https://www.sebi.gov.in/filings/public-issues/jul-2024/sai-life-sciences-limited-drhp_85317.html",
    },
    {
        "company": "ArisInfra Solutions",
        "year": "2024",
        "filing_page": "https://www.sebi.gov.in/filings/public-issues/nov-2024/arisinfra-solutions-limited-addendum-to-drhp_88526.html",
    },
    {
        "company": "Innovision",
        "year": "2024",
        "filing_page": "https://www.sebi.gov.in/filings/public-issues/dec-2024/innovision-limited-drhp_90017.html",
    },
    {
        "company": "Orient Technologies",
        "year": "2024",
        "filing_page": "https://www.sebi.gov.in/filings/public-issues/feb-2024/orient-technologies-limited-drhp_81751.html",
    },
    # ── ADD MORE ──────────────────────────────────────────────────────────────
    # Find more at: https://www.sebi.gov.in/filings/public-issues.html
    # Notable 2024 IPOs to add (find their SEBI page IDs manually):
    #   Hyundai Motor India, NTPC Green Energy, Bajaj Housing Finance,
    #   Waaree Energies, Premier Energies, Afcons Infrastructure,
    #   Niva Bupa, Go Digit, Vishal Mega Mart, Mobikwik, Ola Electric
    # Notable 2023 IPOs to add:
    #   Tata Technologies, IREDA, Mankind Pharma, JSW Infrastructure,
    #   Concord Biotech, DOMS Industries, Netweb Technologies
    # Notable 2022/2021 IPOs to add:
    #   LIC, Delhivery, Zomato, Nykaa, Paytm, PolicyBazaar
]

# ──────────────────────────────────────────────────────────────────────────────
# BSE ANNUAL REPORTS — Nifty 50 (BSE scrip codes)
# ──────────────────────────────────────────────────────────────────────────────
NIFTY50: dict[str, str] = {
    "Reliance Industries":  "500325",
    "TCS":                  "532540",
    "HDFC Bank":            "500180",
    "Infosys":              "500209",
    "ICICI Bank":           "532174",
    "Hindustan Unilever":   "500696",
    "ITC":                  "500875",
    "SBI":                  "500112",
    "Bajaj Finance":        "500034",
    "Bharti Airtel":        "532454",
    "Kotak Mahindra Bank":  "500247",
    "Asian Paints":         "500820",
    "Axis Bank":            "532215",
    "Maruti Suzuki":        "532500",
    "Sun Pharma":           "524715",
    "HCL Technologies":     "532281",
    "Wipro":                "507685",
    "UltraTech Cement":     "532538",
    "NTPC":                 "532555",
    "Power Grid":           "532898",
    "Titan":                "500114",
    "Nestle India":         "500790",
    "Mahindra & Mahindra":  "500520",
    "Tata Motors":          "500570",
    "L&T":                  "500510",
    "Tata Steel":           "500470",
    "Adani Ports":          "532921",
    "ONGC":                 "500312",
    "JSW Steel":            "500228",
    "BPCL":                 "500547",
}


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def _get_bytes(url: str, referer: str = "") -> bytes:
    headers: dict[str, str] = {
        "User-Agent": "DRHPilot/1.0 (portfolio project; contact via GitHub)",
        "Accept": "text/html,application/xhtml+xml,application/pdf,*/*",
    }
    if referer:
        headers["Referer"] = referer
    req = request.Request(url, headers=headers)
    with request.urlopen(req, timeout=120) as resp:
        chunks = []
        try:
            while chunk := resp.read(1024 * 256):  # 256 KB chunks
                chunks.append(chunk)
        except http.client.IncompleteRead as exc:
            raise URLError(f"Incomplete download ({len(b''.join(chunks))} bytes received): {exc}") from exc
        return b"".join(chunks)


def _get_html(url: str) -> str:
    return _get_bytes(url).decode("utf-8", errors="replace")


# ──────────────────────────────────────────────────────────────────────────────
# SEBI DRHP DOWNLOADER
# ──────────────────────────────────────────────────────────────────────────────

def _extract_sebi_pdf_url(filing_page_html: str) -> str | None:
    """
    SEBI filing pages embed the PDF link like:
        .../web/?file=https://www.sebi.gov.in/sebi_data/attachdocs/{mon-year}/{ts}.pdf
    We extract the raw PDF URL.
    """
    match = re.search(
        r'https://www\.sebi\.gov\.in/sebi_data/attachdocs/[^\s"\'<>]+\.pdf',
        filing_page_html,
    )
    return match.group(0) if match else None


def download_drhps(manifest: dict) -> None:
    out_dir = OUTPUT_DIR / "drhp"
    out_dir.mkdir(parents=True, exist_ok=True)

    for entry in DRHP_CATALOGUE:
        company  = entry["company"]
        year     = entry["year"]
        page_url = entry["filing_page"]
        slug     = _slug(company)
        dest     = out_dir / f"{slug}_{year}_drhp.pdf"

        if dest.exists():
            print(f"  [skip] {company} DRHP (already downloaded)")
            _record(manifest, "drhp", company, year, page_url, str(dest))
            continue

        print(f"  Fetching filing page: {company} ({year})")
        try:
            html = _get_html(page_url)
            time.sleep(REQUEST_DELAY)
        except (HTTPError, URLError) as exc:
            print(f"  [error] Could not load filing page — {exc}")
            continue

        pdf_url = _extract_sebi_pdf_url(html)
        if not pdf_url:
            print(f"  [warn] No PDF link found in {page_url}")
            continue

        print(f"  Downloading PDF: {pdf_url}")
        try:
            dest.write_bytes(_get_bytes(pdf_url, referer=SEBI_BASE))
            print(f"  [ok] {dest.name} ({dest.stat().st_size // 1024} KB)")
        except (HTTPError, URLError) as exc:
            print(f"  [error] PDF download failed — {exc}")
            continue

        _record(manifest, "drhp", company, year, pdf_url, str(dest.relative_to(OUTPUT_DIR)))
        time.sleep(REQUEST_DELAY)


# ──────────────────────────────────────────────────────────────────────────────
# BSE ANNUAL REPORT DOWNLOADER
# ──────────────────────────────────────────────────────────────────────────────
# Uses the `bse` package (uv auto-installs via inline script deps).
# Searches each Nifty 50 company's BSE announcements for "Annual Report"
# subject in AR_YEARS, downloads the attached PDF.
# ──────────────────────────────────────────────────────────────────────────────

BSE_ATTACH_BASE = "https://www.bseindia.com/xml-data/corpfiling/AttachHis/"


def download_annual_reports(manifest: dict) -> None:
    try:
        from bse import BSE  # installed via inline deps
    except ImportError:
        print("  [skip] `bse` package not available — run: uv run data/download.py")
        return

    out_dir = OUTPUT_DIR / "annual_report"
    out_dir.mkdir(parents=True, exist_ok=True)

    with BSE(download_folder=str(out_dir)) as bse:
        for company, scrip in NIFTY50.items():
            slug = _slug(company)

            for yr in AR_YEARS:
                dest = out_dir / f"{slug}_{yr}_ar.pdf"
                if dest.exists():
                    print(f"  [skip] {company} AR {yr} (already downloaded)")
                    continue

                # Financial year: April prev_yr to March yr
                from_dt = date(yr - 1, 4, 1)
                to_dt   = date(yr, 12, 31)

                print(f"  Searching BSE announcements: {company} AR {yr}")
                try:
                    data = bse.announcements(
                        scripcode=scrip,
                        from_date=from_dt,
                        to_date=to_dt,
                    )
                    time.sleep(REQUEST_DELAY)
                except Exception as exc:
                    print(f"  [error] BSE API — {exc}")
                    continue

                # Filter for annual report PDFs
                rows = data.get("Table", [])
                ar_rows = [
                    r for r in rows
                    if "annual report" in (r.get("NEWSSUB") or r.get("HEADLINE") or "").lower()
                    and (r.get("ATTACHMENTNAME") or "").lower().endswith(".pdf")
                ]

                if not ar_rows:
                    print(f"  [warn] No annual report found for {company} {yr}")
                    continue

                # Take first match (most recent if sorted desc)
                ann       = ar_rows[0]
                attach    = ann["ATTACHMENTNAME"]
                pdf_url   = BSE_ATTACH_BASE + attach
                ann_date  = ann.get("NEWS_DT") or ann.get("DissemDT") or str(yr)

                print(f"  Downloading: {pdf_url}")
                try:
                    dest.write_bytes(_get_bytes(pdf_url, referer="https://www.bseindia.com"))
                    print(f"  [ok] {dest.name} ({dest.stat().st_size // 1024} KB)")
                except (HTTPError, URLError) as exc:
                    print(f"  [error] PDF download failed — {exc}")
                    continue

                _record(manifest, "annual_report", company, str(yr), pdf_url, str(dest.relative_to(OUTPUT_DIR)))
                time.sleep(REQUEST_DELAY)


# ──────────────────────────────────────────────────────────────────────────────
# MANIFEST
# ──────────────────────────────────────────────────────────────────────────────

def _record(
    manifest: dict,
    filing_type: str,
    company: str,
    year: str,
    source_url: str,
    local_path: str,
) -> None:
    manifest["filings"].append(
        {
            "company":      company,
            "filing_type":  filing_type,   # "drhp" | "annual_report"
            "year":         year,
            "source_url":   source_url,
            "local_path":   local_path,    # relative to downloads/
        }
    )
    manifest["downloaded_count"] = len(manifest["filings"])


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    if CLEAR_OUTPUT and OUTPUT_DIR.exists():
        import shutil
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest: dict = {
        "generated_at_utc":  datetime.now(UTC).isoformat(),
        "sources":           ["SEBI (sebi.gov.in)", "BSE (bseindia.com)"],
        "downloaded_count":  0,
        "filings":           [],
    }

    print("\n=== DRHPs from SEBI ===")
    download_drhps(manifest)

    print("\n=== Annual Reports from BSE ===")
    download_annual_reports(manifest)

    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"\nDone. {manifest['downloaded_count']} file(s) in {OUTPUT_DIR}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()

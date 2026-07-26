# Data

Local data artifacts for development live here.

## Corpus

| Type | Source | Target |
|---|---|---|
| DRHPs | SEBI public filings (`sebi.gov.in`) | Recent IPOs (2021–present) |
| Annual Reports | BSE corporate filings (`bseindia.com`) | Nifty 50 companies |

Downloaded PDFs go into `downloads/` (gitignored — can be large).

## Running the downloader

```bash
uv run data/download.py
```

`uv` auto-installs the `bse` dependency from the inline script header. No separate `pip install` needed.

## Output structure

```
downloads/
  drhp/
    swiggy_2024_drhp.pdf
    hero_motors_2024_drhp.pdf
    ...
  annual_report/
    reliance_industries_2024_ar.pdf
    tcs_2024_ar.pdf
    ...
  manifest.json       ← machine-readable index of all files
```

## Adding more DRHPs

1. Go to <https://www.sebi.gov.in/filings/public-issues.html>
2. Find the company's filing page
3. Copy the URL (format: `.../filings/public-issues/{mon-year}/{slug}_{id}.html`)
4. Add an entry to `DRHP_CATALOGUE` in `download.py`

## manifest.json fields

Each entry in `filings[]`:
- `company` — human-readable name
- `filing_type` — `"drhp"` or `"annual_report"`
- `year` — filing year
- `source_url` — original PDF URL for traceability
- `local_path` — path relative to `downloads/`

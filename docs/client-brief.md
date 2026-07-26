# Client brief — Mint Street Research

## The client

**Mint Street Research** is an independent SEBI-registered equity research firm with ~40 analysts. They sell deep equity research on Indian listed companies to institutional clients (domestic mutual funds, FIIs, AIFs) under annual subscriptions, plus commissioned research and analyst calls.

They don't manage money themselves. Their product is research and access to their analysts.

## How Mint Street makes money

- Analysts each cover ~15 Nifty 50 companies in a specific sector (banking, IT, pharma, auto, FMCG, etc.)
- They produce written research reports, financial models, and stock-level recommendations
- Buy-side clients pay for the reports and for the right to call the analyst with questions
- Reputation is everything — a single bad call dents the franchise

## How they add value

- Their clients (fund managers, portfolio managers) don't have the bandwidth to read every DRHP, annual report, and SEBI filing for every company they track
- Mint Street's analysts have already done that reading and turned it into actionable summaries
- The value is *condensation*: turning hundreds of pages into a thesis the PM can act on

## The problem

Every analyst spends roughly **half of every week** doing source-document intake — opening DRHPs and annual reports, scanning for the sections they care about (risk factors, financials, promoter background, objects of the issue), copy-pasting passages, comparing year-over-year. Only after that intake work can they produce any original analysis.

The intake work is:

- Boring
- Necessary (you can't analyze what you haven't read)
- Repetitive across analysts (multiple analysts read the same DRHP during every IPO season)
- The biggest single drag on analyst output

Hiring more analysts doesn't fix it — the intake bottleneck scales linearly with coverage.

## What they want

An internal chatbot — **DRHP Copilot** — where any analyst can:

- Ask questions in plain English about any DRHP or annual report in the corpus
- Get a sourced answer that cites the specific document and **page number**
- Trust the answer enough to base downstream analysis on it — with a **confidence/evidence quality indicator** per answer
- Use it from a browser, logged in with their firm email address
- See their own past conversations

## Example analyst questions

The corpus contains DRHPs and annual reports for Nifty 50 companies. The bot should handle questions like:

1. What are the stated objects of the issue in [Company]'s DRHP, and what proportion goes to fresh issue vs OFS?
2. What risk factors does [Company] disclose related to promoter concentration or related-party transactions?
3. Compare [Company A] and [Company B]'s revenue from operations and EBITDA margins across the last three annual reports.
4. What does [Company]'s DRHP say about its competitive position and key competitors?
5. Summarise the litigation and contingent liabilities disclosed in [Company]'s DRHP.
6. What are the key financial ratios (RoE, RoCE, D/E) disclosed in [Company]'s restated financials?
7. How does [Company] describe its dependence on key customers or suppliers, and has that wording changed across annual reports?
8. What are the lock-in provisions for promoter shares post-IPO as per [Company]'s DRHP?
9. For [Company], what do the filings say about regulatory approvals required and any pending litigation with SEBI or other regulators?
10. If an analyst asks whether the DRHP proves [Company] is profitable on a sustainable basis — what evidence exists, and where should the bot refuse to infer beyond the filings?

## What "trust" means here

This is a research firm. Their entire business is being right. The bot must:

- **Never invent facts.** If the answer isn't in the corpus, it says so.
- **Always cite.** Every claim links to the source document + **page number**.
- **Show the underlying passage** so the analyst can verify in one click.
- **Show a confidence score** — `Strong`, `Partial`, or `Insufficient` — so the analyst knows how much to rely on the answer.

A wrong but confident answer is worse than no answer. Hallucinations kill the product.

## Constraints

- Corpus: DRHPs (from SEBI) + Annual Reports (from BSE filings) for Nifty 50 companies
- Source: sebi.gov.in, bseindia.com (public domain)
- Users: ~40 analysts, plus a few partners
- Login: firm email addresses (no SSO required)
- Hosting: must run on a small/medium cloud footprint; no dedicated infra team
- LLM + embeddings: Gemini API (`gemini-2.5-flash` + `text-embedding-004`)

## Out of scope (explicitly)

- Investment recommendations or stock picks
- External data sources (no news, no social, no alternative data)
- Anything generating analysis not grounded in the corpus
- Multi-tenant / multi-client
- Billing, plans, paywalls
- Mobile app

## Definition of done

The pilot analyst group tries it for a week and reports it saves meaningful time on DRHP/annual report intake. If yes, roll out firm-wide.

## Portfolio framing

> **DRHP Copilot** — Built for Indian equity analysts to query SEBI IPO filings and annual reports in plain English. Indexed 30+ DRHPs using pgvector hybrid search; answers cite specific page numbers from source documents with a confidence/evidence quality score per answer.

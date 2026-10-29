# Project memory

## Product intent & audience

- Enterprise web application for **Idallawa Agro Pvt Ltd** (a farm/agribusiness).
- Single-organization internal use; owner-operated, possibly accessed from multiple authorized devices.
- Modules: Nursery management, seasonal crop tracking, labor payroll, financial accounting, AI assistant.
- Current focus: financial integrity for funding, repayments, and accounting classification — inspection-only, no implementation yet.

## Brand personality & voice

- Professional, enterprise-grade but approachable. Production-worthy and polished (per `.bolt/prompt`).
- Tone in reports: concise, precise, accounting-aware; flags ambiguity and asks for confirmation before changes.

## Visual design & UX direction

- Stack: **Vite + React + JSX**, **Tailwind CSS**, **lucide-react** icons. No extra UI/icon packages unless requested (per `.bolt/prompt`).
- Path alias: `@/` → `src/` (per `.bolt/prompt`).
- UI patterns inferred: tabbed module sections (Finance, Crops, Nursery, Labor, Reports, Dashboard), DataTable-driven lists, modal forms for entry (e.g., LedgerModal, HarvestModal), summary cards on Dashboard.
- Expected upcoming UI: Funding tab in Finance (monthly + bulk entry with subtotals/confirm), repayment allocation section in HarvestModal, funding summary cards and reports.
- Avoid: cookie-cutter layouts; generic templates. Prefer clear financial tables with subtotals, validation feedback, and safe confirm-before-save flows.

## Decisions, constraints & rationale

- **Inspection-only**: No source edits, migrations, balance changes, or data inserts until owner approves.
- Existing ledger has 7 historical entries covering Shop Credit (~LKR 640,210), Owner Equity Return (~LKR 2,702,180), Bank Loan (LKR 5,000,000). Do NOT create new opening-balance entries (would double-count).
- Proposed `is_opening` flag for labeling only, not separate balance calc.
- Funding entries must write to `ledger_entries` only — must NOT create vouchers/expenses (existing `LedgerModal` creates a voucher, so do not reuse for funding).
- Repayments = `direction='Out'` ledger entries; must not reduce sales revenue or P&L. `ledgerBalance()` already handles `In`/`Out` netting.
- Dedup strategy: batch reference IDs and pre-save existence checks.
- New `LedgerKind`: `'Owner Funding'` distinct from `'Owner Equity Return'` (classification ambiguity pending owner/accountant confirmation).
- Multi-device consistency via Supabase (not local storage); `loadAllData()` refreshes on load.

## Open questions & assumptions

- Classification of 3 custom-kind entries ("Agri Inpurt by shop lone" LKR 523,791.25; "best seeds co pvt ltd" LKR 500,000; "Assets ddisposal account" LKR 6,000) — pending owner confirmation.
- Whether "Owner Equity Return" should be renamed/recast as "Owner Funding" (liability) or "Owner Capital" (equity) — needs owner/accountant input.
- Whether Bank Loan repayments exist or are still zero.
- Whether existing 7 entries should be tagged `is_opening` or left as regular entries.
- Whether repayment allocation should be allowed from manual cash entries, not only harvest/sales.
- Excel import for funding entries assumed feasible by extending existing `src/lib/import.ts` pattern — not yet implemented.
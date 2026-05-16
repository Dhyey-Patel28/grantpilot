# GrantPilot MI — Compact Real-Data Pipeline

This compact version does NOT run a 1,301-ID MI Funding Hub sweep.

It uses:
1. Grants.gov public `search2` / `fetchOpportunity` endpoints
2. Exact MI Funding Hub URLs you manually place in `data/mfh_urls_real.txt`
3. No curated/mock seed data

## File structure

```
GrantPilot/
  requirements.txt
  run_all_real.py
  data/
    keywords.txt
    mfh_urls_real.txt
    project_profile.json
  scripts/
    01_fetch_grantsgov_no_key.py
    02_scrape_mfh_known_urls.py
    03_normalize_score_real.py
    04_generate_packet_real.py
  outputs/
```

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Run everything

```powershell
python run_all_real.py
```

## Run step-by-step

```powershell
python scripts/01_fetch_grantsgov_no_key.py --keywords data/keywords.txt --out outputs/data_grants_gov_real.json --rows 15 --fetch-details
python scripts/02_scrape_mfh_known_urls.py --urls data/mfh_urls_real.txt --out outputs/data_mfh_real.json
python scripts/03_normalize_score_real.py --project data/project_profile.json --mfh outputs/data_mfh_real.json --grantsgov outputs/data_grants_gov_real.json
python scripts/04_generate_packet_real.py --project data/project_profile.json --scored outputs/scored_grants_real.json --out outputs/grantpilot_real_packet.md --top 5
```

## How to add MI Funding Hub data without ID sweeping

1. Go to MI Funding Hub Find Funding.
2. Find relevant grants manually.
3. Open the grant detail page if available.
4. Copy exact URLs that look like:
   `https://mifundinghub.org/funding-opportunities/?grant=12912`
5. Paste those URLs into `data/mfh_urls_real.txt`.

If `data/mfh_urls_real.txt` is empty/comment-only, the pipeline still runs using Grants.gov real data.

#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys

PY = sys.executable

commands = [
    [PY, "scripts/01_fetch_grantsgov_no_key.py", "--keywords", "data/keywords.txt", "--out", "outputs/data_grants_gov_real.json", "--rows", "15", "--fetch-details"],
    [PY, "scripts/02_scrape_mfh_known_urls.py", "--urls", "data/mfh_urls_real.txt", "--out", "outputs/data_mfh_real.json"],
    [PY, "scripts/03_normalize_score_real.py", "--project", "data/project_profile.json", "--mfh", "outputs/data_mfh_real.json", "--grantsgov", "outputs/data_grants_gov_real.json"],
    [PY, "scripts/04_generate_packet_real.py", "--project", "data/project_profile.json", "--scored", "outputs/scored_grants_real.json", "--out", "outputs/grantpilot_real_packet.md", "--top", "5"],
]

for cmd in commands:
    print("\nRUN:", " ".join(cmd))
    subprocess.run(cmd, check=True)

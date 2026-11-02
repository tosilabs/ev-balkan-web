"""Shared public identity for the dataset downloaders; no credentials are read."""
import json,os,re
from pathlib import Path
config=json.loads((Path(__file__).parent.parent/'project.json').read_text())
repository=os.environ.get('GITHUB_REPOSITORY',config['repository'])
if not re.fullmatch(r'[\w.-]+/[\w.-]+',repository):repository=config['repository']
USER_AGENT=f"Udhembare/2.0 (+https://github.com/{repository})"

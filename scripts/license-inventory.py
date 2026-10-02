"""Generate a metadata inventory without redistributing dependency source or assets."""
import importlib.metadata
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
lock = json.loads((root / 'package-lock.json').read_text())
rows = []
for path, package in lock['packages'].items():
    if not path or package.get('dev'):
        continue
    name = path.rsplit('node_modules/', 1)[-1]
    local = root / path / 'package.json'
    metadata = json.loads(local.read_text()) if local.exists() else {}
    license_id = package.get('license') or metadata.get('license') or 'REVIEW REQUIRED: no declared license'
    if isinstance(license_id, dict):
        license_id = license_id.get('type', str(license_id))
    rows.append((name, package.get('version', ''), str(license_id).replace('|', '/')))
text = '# Dependency license metadata inventory\n\n'
text += 'Generated from package-lock.json and installed Python distribution metadata. '
text += 'Metadata is an inventory, not a full bundle compliance determination. '
text += 'Pi MIT notice is retained separately. Full license files remain in installed distributions.\n\n'
text += '## npm production/optional dependencies\n\n| Package | Version | Declared license |\n|---|---|---|\n'
for name, version, license_id in sorted(set(rows)):
    text += f'| {name} | {version} | {license_id} |\n'
text += '\n## Python environment\n\n| Distribution | Version | License metadata / installed license location |\n|---|---|---|\n'
for distribution in sorted(importlib.metadata.distributions(), key=lambda d: d.metadata['Name'].lower()):
    name = distribution.metadata['Name']
    if name == 'pip':
        continue
    metadata = distribution.metadata
    declaration = metadata.get('License-Expression') or metadata.get('License') or 'Review installed license files'
    declaration = declaration.splitlines()[0].replace('|', '/')
    license_paths = [str(p) for p in distribution.files or [] if 'licenses/' in str(p) or str(p).endswith('LICENSE.txt')]
    location = ', '.join(license_paths[:3]) or 'See installed dist-info metadata'
    text += f'| {name} | {distribution.version} | {declaration}; {location} |\n'
text += '\nNumPy/SciPy wheels may include separately licensed compiled components; preserve the complete wheel notices when redistributing.\n'
(root / 'docs' / 'dependency-licenses.md').write_text(text)
print(f'Inventoried {len(set(rows))} npm dependencies and Python environment metadata.')

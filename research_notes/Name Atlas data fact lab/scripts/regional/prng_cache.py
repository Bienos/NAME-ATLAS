"""Convert the PRNG localities XLSX to a parquet cache (scratchpad only) for fast reuse.
Source: GUGiK PRNG localities export 2026-09-28 (CC BY 4.0, credit GUGiK)."""
import openpyxl, pandas as pd, time
SRC = "/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/prng/PRNG_MIEJSCOWOSCI_XLSX.xlsx"
OUT = "/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/analysis/regional/prng_cache.parquet"
KEEP = ['identyfikator PRNG', 'nazwa główna', 'dopełniacz', 'przymiotnik', 'status nazwy', 'kategoria obiektu',
        'rodzaj obiektu', 'nazwa miejscowości nadrzędnej', 'rodzaj reprezentacji', 'współrzędne geograficzne',
        'nazwa historyczna', 'nazwa oboczna', 'województwo', 'powiat', 'gmina', 'identyfikator gminy']
t = time.time()
wb = openpyxl.load_workbook(SRC, read_only=True)
ws = wb.worksheets[0]
rows = ws.iter_rows(values_only=True)
header = list(next(rows))
idx = [header.index(k) for k in KEEP]
data = [[r[i] for i in idx] for r in rows]
df = pd.DataFrame(data, columns=KEEP, dtype=object)
def _clean(v):
    if v is None or (isinstance(v, float) and v != v):
        return None
    v = str(v)
    return v if v.strip() != '' else None
for c in KEEP:
    df[c] = df[c].astype(object).map(_clean)
df.to_parquet(OUT, index=False)
print(df.shape, round(time.time() - t, 1), "s")

"""Shared helpers for the Name Atlas diaspora/history fact lab (research prototype, not product code).

Method version tags used in outputs:
  fold-v1    : uppercase + Polish letters folded (Ą→A Ć→C Ę→E Ł→L Ń→N Ó→O Ś→S Ź→Z Ż→Z)
  pair-v1.1  : -SKI↔-SKA, -CKI↔-CKA, -DZKI↔-DZKA; identical forms (NOWAK) pair with themselves; others unpaired.
               Tie-break (same as the regional fact lab): a female X-SKA/-CKA/-DZKA pairs with the identical male
               form when the 2026 national M file has more X-SKA than X-SKI entries (noun-type forms: KRASKA, GĄSKA).
               Paired totals are internal only; user-facing text shows male-file and female-file figures separately.
  wwiname-v1 : WWI surname cleaning rule (see clean_wwi_surname)
  wwimatch-v1: cleaned WWI surname (wwiname-v1, then fold-v1) == fold-v1 of a surname in the 2026 national M file
  loc-v1     : GOV-Id Maidenhead decode + Natural Earth country test + nearest PRNG locality voivodeship
               (+ exact-Ort-text and district-key gazetteers learned from point-located entries; c5b)
All data paths are absolute; source files are read in place and never copied.
"""
import json, math, re, unicodedata
import numpy as np
import pandas as pd

SCRATCH = '/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad'
DATA = SCRATCH + '/data'
WORK = SCRATCH + '/analysis/diaspora_history'
REPO_OUT = '/home/user/NAME-ATLAS/research_notes/Name Atlas data fact lab/data/diaspora_history'

PESEL_M_2026 = DATA + '/pesel/1681_M_2026-01-20_r1148808.csv'
PESEL_F_2026 = DATA + '/pesel/1681_F_2026-01-20_r1148811.csv'
PESEL_WOJ_M_2026 = DATA + '/pesel/1681woj_M_2026-01-20_r1148786.csv'
PESEL_WOJ_F_2026 = DATA + '/pesel/1681woj_F_2026-01-20_r1148790.csv'
US2020_XLSX = DATA + '/us/Names2020_LastNames_RaceHispanic.xlsx'
US2000_CSV = DATA + '/us/names2000/app_c.csv'
WWI_PARQUET = DATA + '/wwi/Verlustlisten_1WK_Deutschland.parquet'
PRNG_XLSX = SCRATCH + '/prng/PRNG_MIEJSCOWOSCI_XLSX.xlsx'
PRNG_CACHE = WORK + '/prng_points.csv'          # built by prng_cache.py from PRNG_XLSX
NE_TOPOJSON = WORK + '/countries-10m.json'      # Natural Earth 1:10m admin-0 via world-atlas@2.0.2 (public domain)

SHOWCASE = ['NOWAK', 'KOWALSKI', 'WIŚNIEWSKI', 'KACZMAREK', 'SZCZEPAŃSKI', 'GRZEGORCZYK', 'CZEKIERDA']
# Illustrative extras (reasons in the notes; picked by data rules in c7_showcase_wwi.py):
#   LEWANDOWSKI - most located WWI entries among forms whose top voivodeship is kujawsko-pomorskie then and now
#   KREFT       - largest persistence excess among forms with >= 200 located WWI entries and >= 1,000 male-file entries
#   WRÓBEL      - most located WWI entries among forms whose top voivodeship is śląskie/opolskie then and now
SHOWCASE_EXTRA = ['LEWANDOWSKI', 'KREFT', 'WRÓBEL']

FOLD = str.maketrans('ĄĆĘŁŃÓŚŹŻąćęłńóśźż', 'ACELNOSZZacelnoszz')


def fold(s: str) -> str:
    """fold-v1: uppercase, then fold the nine Polish letters. Nothing else is changed."""
    return s.upper().translate(FOLD)


# ---------------------------------------------------------------- PESEL
def _read_pesel(path):
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    df.columns = [c.strip() for c in df.columns]
    name_col = [c for c in df.columns if c.lower().startswith('nazwisko') or c.lower().startswith('nawisko')][0]
    cnt_col = [c for c in df.columns if c.lower().startswith('liczba')][0]
    out = pd.DataFrame({'surname': df[name_col].str.strip(), 'n': df[cnt_col].str.strip().astype(int)})
    woj = [c for c in df.columns if c.lower().startswith('województwo')]
    if woj:
        out.insert(0, 'voiv', df[woj[0]].str.strip().str.lower())
    return out


FEM_SUFFIX = [('DZKI', 'DZKA'), ('SKI', 'SKA'), ('CKI', 'CKA')]   # DZKI checked first (longest)
_NOUN_SKA = None


def noun_type_ska():
    """pair-v1.1 tie-break set: male forms ending -SKA/-CKA/-DZKA whose 2026 national M count exceeds the M count of
    the matching -SKI/-CKI/-DZKI form (absent counts as 0 here only for the comparison). A female form in this set
    pairs with the identical male form instead of the -SKI key."""
    global _NOUN_SKA
    if _NOUN_SKA is None:
        m = _read_pesel(PESEL_M_2026).set_index('surname')['n'].to_dict()
        s = set()
        for sur, n in m.items():
            for mk, fk in FEM_SUFFIX:
                if sur.endswith(fk):
                    if n > m.get(sur[: -len(fk)] + mk, 0):
                        s.add(sur)
                    break
        _NOUN_SKA = s
    return _NOUN_SKA


def male_key(surname: str, sex: str) -> str:
    """pair-v1.1 key (male form). Female -SKA/-CKA/-DZKA -> -SKI/-CKI/-DZKI unless noun-type (tie-break);
    everything else keeps its own form."""
    if sex == 'F' and surname not in noun_type_ska():
        for m, f in FEM_SUFFIX:
            if surname.endswith(f):
                return surname[: -len(f)] + m
    return surname


def pair_role(surname: str, sex: str) -> str:
    """Which entries enter the pair-v1.1 total for their key.
    M rows: always. F rows: -SKA/-CKA/-DZKA (paired to male form, or to the identical noun-type male form) or identical
    form whose male key is not -SKI/-CKI/-DZKI.
    F rows that carry a male -SKI/-CKI/-DZKI form (e.g. a woman registered as KOWALSKI) are NOT added (unpaired)."""
    if sex == 'M':
        return 'm'
    if surname in noun_type_ska():
        return 'f_identical'
    for m, f in FEM_SUFFIX:
        if surname.endswith(f):
            return 'f_paired'
    for m, f in FEM_SUFFIX:
        if surname.endswith(m):
            return 'f_unpaired_maleform'
    return 'f_identical'


def load_pesel_national_paired():
    """Return per male-key totals for 2026-01-20: key, m, f, total, plus folded key.
    Missing = fewer than 2 entries or absent (never zero)."""
    m = _read_pesel(PESEL_M_2026); m['sex'] = 'M'
    f = _read_pesel(PESEL_F_2026); f['sex'] = 'F'
    both = pd.concat([m, f], ignore_index=True)
    both['key'] = [male_key(s, x) for s, x in zip(both.surname, both.sex)]
    both['role'] = [pair_role(s, x) for s, x in zip(both.surname, both.sex)]
    used = both[both.role != 'f_unpaired_maleform']
    agg = used.pivot_table(index='key', columns='sex', values='n', aggfunc='sum')
    agg = agg.rename(columns={'M': 'm', 'F': 'f'}).reset_index()
    agg['total'] = agg[['m', 'f']].sum(axis=1, min_count=1).astype(int)
    agg['key_fold'] = agg['key'].map(fold)
    unpaired = both[both.role == 'f_unpaired_maleform'][['surname', 'n']].rename(columns={'n': 'f_maleform_unpaired'})
    return agg, unpaired


def load_pesel_voiv_paired():
    """2026-01-20 voivodeship of permanent registered residence, paired (pair-v1.1) per male key.
    Returns long frame: key, voiv, total."""
    m = _read_pesel(PESEL_WOJ_M_2026); m['sex'] = 'M'
    f = _read_pesel(PESEL_WOJ_F_2026); f['sex'] = 'F'
    both = pd.concat([m, f], ignore_index=True)
    both['key'] = [male_key(s, x) for s, x in zip(both.surname, both.sex)]
    both['role'] = [pair_role(s, x) for s, x in zip(both.surname, both.sex)]
    used = both[both.role != 'f_unpaired_maleform']
    out = used.groupby(['key', 'voiv'], as_index=False)['n'].sum().rename(columns={'n': 'total'})
    out['key_fold'] = out['key'].map(fold)
    return out


# ---------------------------------------------------------------- US Census
def load_us2020():
    """2020 Census last names (>=100). Only the first five columns are read; race/Hispanic columns are never loaded.
    keep_default_na=False: otherwise pandas turns the real surnames NA and NULL into missing values."""
    df = pd.read_excel(US2020_XLSX, header=2, usecols='A:E', dtype={'LAST NAME': str}, keep_default_na=False, na_values=[])
    df.columns = ['name', 'rank', 'count', 'prop100k', 'cum_prop100k']
    df = df[df['name'].astype(str).str.strip() != ''].copy()
    df['name'] = df['name'].astype(str).str.strip().str.upper()
    df = df[pd.to_numeric(df['count'], errors='coerce').notna()]
    df['count'] = df['count'].astype(int)
    df['rank'] = pd.to_numeric(df['rank'], errors='coerce')
    df['prop100k'] = df['prop100k'].astype(float)
    return df[['name', 'rank', 'count', 'prop100k']]


def load_us2000():
    """2000 Census surnames (>=100). Race columns dropped on load (usecols)."""
    df = pd.read_csv(US2000_CSV, usecols=['name', 'rank', 'count', 'prop100k'], dtype={'name': str}, keep_default_na=False)
    df['name'] = df['name'].str.strip().str.upper()
    df = df[pd.to_numeric(df['count'], errors='coerce').notna()].copy()
    df['count'] = df['count'].astype(int)
    df['rank'] = pd.to_numeric(df['rank'], errors='coerce')
    df['prop100k'] = pd.to_numeric(df['prop100k'], errors='coerce')
    return df


# ---------------------------------------------------------------- WWI surname cleaning
ROMAN_TAIL = re.compile(r'\s+(?:[IVX]+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+|\d+)\.?$')
PARTICLE_TAIL = re.compile(r',\s*(?:v\.|von|vom|von der|von dem|v\. d\.|de|van|van der|zu|zur|la|le|du|di|da)\b.*$', re.I)
TITLE_TAIL = re.compile(r',\s*(?:Dr\.?|Graf|Freiherr|Frhr\.?|Prinz|Fürst)\s*$', re.I)
NAME_OK = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿĀ-žſ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿĀ-žſ]+)?$")


def clean_wwi_surname(raw: str):
    """wwiname-v1. Returns (clean_upper_folded or None, reason).
    Steps: strip; reject '{korr' corrections and empty braces '{}' (illegible letter);
    drop other braces keeping their letters; drop [..] and (..) annotations; drop trailing roman numerals/digits
    (unit-internal numbering like 'Müller II'); drop title tails (', Dr.'); names with nobiliary particle tails
    (', von', ', v.', ', de' ...) are excluded, not matched; the rest must be one token (optional single hyphen)."""
    s = (raw or '').strip()
    if not s:
        return None, 'empty'
    if '{korr' in s or '{}' in s:
        return None, 'uncertain_or_correction'
    s = s.replace('{', '').replace('}', '')
    s = re.sub(r'\s*\[[^\]]*\]', '', s)
    s = re.sub(r'\s*\([^)]*\)', '', s).strip()
    s = s.rstrip('?').strip()
    if PARTICLE_TAIL.search(s):
        return None, 'particle'
    s = TITLE_TAIL.sub('', s).strip()
    s = ROMAN_TAIL.sub('', s).strip().rstrip('.').strip()
    if not NAME_OK.match(s):
        return None, 'complex'
    return fold(s), 'ok'


# ---------------------------------------------------------------- geography
MH_RE = re.compile(r'^[^_]{6}([A-R]{2}[0-9]{2}[A-X]{2})$')


def maidenhead_bounds(loc: str):
    """6-char Maidenhead locator -> (lat_min, lon_min, lat_max, lon_max). Subsquare = 5' lon x 2.5' lat."""
    loc = loc.upper()
    lon = (ord(loc[0]) - 65) * 20 - 180 + int(loc[2]) * 2 + (ord(loc[4]) - 65) * (5 / 60)
    lat = (ord(loc[1]) - 65) * 10 - 90 + int(loc[3]) * 1 + (ord(loc[5]) - 65) * (2.5 / 60)
    return lat, lon, lat + 2.5 / 60, lon + 5 / 60


def maidenhead_centre(loc: str):
    a, b, c, d = maidenhead_bounds(loc)
    return (a + c) / 2, (b + d) / 2


def load_countries(names=None):
    """Decode Natural Earth 1:10m TopoJSON (world-atlas 2.0.2) into {country: [ring arrays (lon,lat)]}."""
    topo = json.load(open(NE_TOPOJSON))
    sc = topo['transform']['scale']; tr = topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        a = np.cumsum(np.array(arc, dtype=np.float64), axis=0)
        a[:, 0] = a[:, 0] * sc[0] + tr[0]; a[:, 1] = a[:, 1] * sc[1] + tr[1]
        arcs.append(a)

    def ring(idx_list):
        pts = []
        for k, i in enumerate(idx_list):
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.append(a if k == 0 else a[1:])
        return np.vstack(pts)

    out = {}
    for g in topo['objects']['countries']['geometries']:
        nm = g.get('properties', {}).get('name')
        if names and nm not in names:
            continue
        polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']] if g['type'] == 'Polygon' else []
        rings = [ring(r) for poly in polys for r in poly]
        out[nm] = rings
    return out


def points_in_rings(lat, lon, rings):
    """Even-odd point-in-polygon over all rings of one country (holes handled by parity)."""
    lat = np.asarray(lat); lon = np.asarray(lon)
    inside = np.zeros(lat.shape, dtype=bool)
    for r in rings:
        # bbox prefilter
        mnx, mny = r[:, 0].min(), r[:, 1].min(); mxx, mxy = r[:, 0].max(), r[:, 1].max()
        cand = (lon >= mnx) & (lon <= mxx) & (lat >= mny) & (lat <= mxy)
        if not cand.any():
            continue
        x = lon[cand]; y = lat[cand]
        x1 = r[:-1, 0][None, :]; y1 = r[:-1, 1][None, :]; x2 = r[1:, 0][None, :]; y2 = r[1:, 1][None, :]
        res = np.zeros(x.shape, dtype=bool)
        step = 2000
        for s in range(0, len(x), step):
            xx = x[s:s + step, None]; yy = y[s:s + step, None]
            cond = ((y1 > yy) != (y2 > yy))
            with np.errstate(divide='ignore', invalid='ignore'):
                xint = (x2 - x1) * (yy - y1) / (y2 - y1) + x1
            crossing = cond & (xx < xint)
            res[s:s + step] = (crossing.sum(axis=1) % 2) == 1
        inside[np.where(cand)[0][res]] ^= True
    return inside


def country_of(lat, lon, countries):
    lat = np.asarray(lat, dtype=float); lon = np.asarray(lon, dtype=float)
    out = np.array([''] * len(lat), dtype=object)
    for nm, rings in countries.items():
        m = points_in_rings(lat, lon, rings)
        out[m & (out == '')] = nm
    return out


class PRNGIndex:
    """Grid index over PRNG locality points for nearest-locality lookups (equirectangular km distances)."""

    def __init__(self, path=PRNG_CACHE, cell=0.05):
        p = pd.read_csv(path)
        self.p = p
        self.lat = p['lat'].to_numpy(); self.lon = p['lon'].to_numpy()
        self.cell = cell
        self.ci = np.floor(self.lat / cell).astype(int); self.cj = np.floor(self.lon / cell).astype(int)
        self.buckets = {}
        for idx, key in enumerate(zip(self.ci, self.cj)):
            self.buckets.setdefault(key, []).append(idx)
        self.buckets = {k: np.array(v) for k, v in self.buckets.items()}

    def nearest(self, lat, lon, max_km=15.0):
        rad = int(math.ceil(max_km / (self.cell * 111.0 * 0.6))) + 1
        i0 = int(math.floor(lat / self.cell)); j0 = int(math.floor(lon / self.cell))
        cand = [self.buckets[(i, j)] for i in range(i0 - rad, i0 + rad + 1) for j in range(j0 - rad, j0 + rad + 1) if (i, j) in self.buckets]
        if not cand:
            return None, np.inf
        c = np.concatenate(cand)
        dy = (self.lat[c] - lat) * 111.2; dx = (self.lon[c] - lon) * 111.2 * math.cos(math.radians(lat))
        d = np.sqrt(dx * dx + dy * dy)
        k = int(np.argmin(d))
        return int(c[k]), float(d[k])


VOIV_ORDER = ['dolnośląskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie', 'łódzkie', 'małopolskie', 'mazowieckie', 'opolskie',
              'podkarpackie', 'podlaskie', 'pomorskie', 'śląskie', 'świętokrzyskie', 'warmińsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie']

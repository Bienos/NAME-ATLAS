"""Shared loaders and definitions for the Name Atlas regional fact lab (research prototype, not product code).

Data (all under the fact-lab scratchpad, never committed):
  PESEL 1681woj_*  living persons by voivodeship of PERMANENT registered residence (M/F; 2025-02-24, 2026-01-20)
  PESEL 1681_*     living persons, national (M/F; 2026-01-20 used here)
  PESEL 568woj_*   INCLUDING deceased, by voivodeship with TERYT, 2017-12-31 (different universe)
  PRNG localities  GUGiK export 2026-09-28, CC BY 4.0 (cached to parquet by prng_cache.py)

Counting unit everywhere: ENTRIES in the PESEL register (D-006: entry = person not verified).
Cells with a single entry are suppressed at source: a missing cell = "fewer than 2 entries or absent", never zero.
"""
import os
import pandas as pd

SCRATCH = "/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad"
PESEL = f"{SCRATCH}/data/pesel"
PRNG_XLSX = f"{SCRATCH}/prng/PRNG_MIEJSCOWOSCI_XLSX.xlsx"
PRNG_CACHE = f"{SCRATCH}/analysis/regional/prng_cache.parquet"
WORK = f"{SCRATCH}/analysis/regional"
REPO_OUT = "/home/user/NAME-ATLAS/research_notes/Name Atlas data fact lab/data/regional"

FILES = {
    ("woj", "M", "2026-01-20"): "1681woj_M_2026-01-20_r1148786.csv",
    ("woj", "F", "2026-01-20"): "1681woj_F_2026-01-20_r1148790.csv",
    ("woj", "M", "2025-02-24"): "1681woj_M_2025-02-24_r65049.csv",
    ("woj", "F", "2025-02-24"): "1681woj_F_2025-02-24_r65090.csv",
    ("nat", "M", "2026-01-20"): "1681_M_2026-01-20_r1148808.csv",
    ("nat", "F", "2026-01-20"): "1681_F_2026-01-20_r1148811.csv",
    ("woj568", "M", "2017-12-31"): "568woj_M_2017-12-31_r8162.csv",
    ("woj568", "F", "2017-12-31"): "568woj_F_2017-12-31_r8155.csv",
}

# TERYT voivodeship codes (verified against the TERYT column of the 568woj 2017 files) and display names.
VOIV = {
    "DOLNOŚLĄSKIE": ("02", "Dolnośląskie"),
    "KUJAWSKO-POMORSKIE": ("04", "Kujawsko-Pomorskie"),
    "LUBELSKIE": ("06", "Lubelskie"),
    "LUBUSKIE": ("08", "Lubuskie"),
    "ŁÓDZKIE": ("10", "Łódzkie"),
    "MAŁOPOLSKIE": ("12", "Małopolskie"),
    "MAZOWIECKIE": ("14", "Mazowieckie"),
    "OPOLSKIE": ("16", "Opolskie"),
    "PODKARPACKIE": ("18", "Podkarpackie"),
    "PODLASKIE": ("20", "Podlaskie"),
    "POMORSKIE": ("22", "Pomorskie"),
    "ŚLĄSKIE": ("24", "Śląskie"),
    "ŚWIĘTOKRZYSKIE": ("26", "Świętokrzyskie"),
    "WARMIŃSKO-MAZURSKIE": ("28", "Warmińsko-Mazurskie"),
    "WIELKOPOLSKIE": ("30", "Wielkopolskie"),
    "ZACHODNIOPOMORSKIE": ("32", "Zachodniopomorskie"),
}
VOIV_ORDER = sorted(VOIV, key=lambda v: VOIV[v][0])  # TERYT order


def teryt(v):
    return VOIV[v][0]


def vname(v):
    return VOIV[v][1]


def _read(path):
    return pd.read_csv(path, dtype=str, keep_default_na=False, encoding="utf-8")


def load_woj(sex, date="2026-01-20"):
    """Voivodeship file -> DataFrame[voiv, form, n]."""
    kind = "woj568" if date == "2017-12-31" else "woj"
    df = _read(f"{PESEL}/{FILES[(kind, sex, date)]}")
    cols = list(df.columns)
    out = pd.DataFrame({
        "voiv": df[cols[0]].str.strip(),
        "form": df[cols[-2]].str.strip(),
        "n": df[cols[-1]].str.strip().astype("int64"),
    })
    assert set(out["voiv"]) == set(VOIV), set(out["voiv"]) ^ set(VOIV)
    return out


def load_nat(sex, date="2026-01-20"):
    df = _read(f"{PESEL}/{FILES[('nat', sex, date)]}")
    cols = list(df.columns)
    return pd.DataFrame({"form": df[cols[0]].str.strip(), "n": df[cols[1]].str.strip().astype("int64")})


# ---------------------------------------------------------------------------
# Gender pairing v1 (rule 10) + one documented tie-break:
#   M ...SKI <-> F ...SKA, M ...CKI <-> F ...CKA, M ...DZKI <-> F ...DZKA  (key = the M form)
#   any other form: M form X and F form X (identical) share key X
#   Tie-break (noun homographs): the two rules overlap for a F form X-SKA when men ALSO carry X-SKA
#   (invariant noun surnames such as KRASKA, KLUSKA, GASKA). If the national 2026 M file has MORE entries
#   for X-SKA than for X-SKI, the F form X-SKA is paired with the identical M form X-SKA (key X-SKA);
#   otherwise with X-SKI. The set is fixed from the 2026-01-20 national M file and reused for every date.
#   "Cross" forms that remain (a F entry spelled ...SKI/CKI/DZKI, or a M entry spelled ...SKA/CKA/DZKA
#   that is not a noun homograph) are kept UNPAIRED under their own key "<form> [F-only form]" / "[M-only form]".
# ---------------------------------------------------------------------------
PAIRING_VERSION = ("pair-v1.1 (SKI/SKA, CKI/CKA, DZKI/DZKA; identical forms self-paired; noun-homograph tie-break "
                   "from national M 2026; cross-gender adjectival forms unpaired)")
ADJ_M = ("SKI", "CKI", "DZKI")
ADJ_F = ("SKA", "CKA", "DZKA")
_NOUN_SKA = None


def noun_ska_set():
    """F-looking forms X-SKA/-CKA/-DZKA that men carry more often than X-SKI/-CKI/-DZKI (national M 2026)."""
    global _NOUN_SKA
    if _NOUN_SKA is None:
        m = load_nat("M")
        cnt = dict(zip(m.form, m.n))
        _NOUN_SKA = {f for f, n in cnt.items() if f.endswith(ADJ_F) and n > cnt.get(f[:-1] + "I", 0)}
    return _NOUN_SKA


def pair_key_series(forms, sex):
    f = forms
    noun = f.isin(noun_ska_set())
    if sex == "M":
        is_adj = f.str.endswith(ADJ_M)
        is_cross = f.str.endswith(ADJ_F) & ~noun
    else:
        is_adj = f.str.endswith(ADJ_F) & ~noun
        is_cross = f.str.endswith(ADJ_M)
    tag = " [M-only form]" if sex == "M" else " [F-only form]"
    key = f.copy()
    if sex == "F":
        key = key.where(~is_adj, f.str[:-1] + "I")
    key = key.where(~is_cross, f + tag)
    kind = pd.Series("same", index=f.index).where(~is_adj, "adj").where(~is_cross, "cross")
    return key, kind


def display_key(key):
    """KOWALSKI -> KOWALSKI/KOWALSKA ; NOWAK -> NOWAK ; KRASKA -> KRASKA."""
    if key.endswith(ADJ_M) and "[" not in key and (key[:-1] + "A") not in noun_ska_set():
        return key + "/" + key[:-1] + "A"
    return key


def paired_woj(date="2026-01-20"):
    """Long table [voiv, key, n_m, n_f, n] for the voivodeship files of a date (n = n_m + n_f)."""
    parts = []
    for sex in ("M", "F"):
        d = load_woj(sex, date)
        d["key"], d["kind"] = pair_key_series(d["form"], sex)
        d["sex"] = sex
        parts.append(d)
    d = pd.concat(parts, ignore_index=True)
    wide = d.pivot_table(index=["voiv", "key"], columns="sex", values="n", aggfunc="sum")
    wide = wide.reindex(columns=["M", "F"])
    wide.columns = ["n_m", "n_f"]
    wide = wide.reset_index()
    wide["n"] = wide["n_m"].fillna(0).astype("int64") + wide["n_f"].fillna(0).astype("int64")
    return wide


def paired_nat(date="2026-01-20"):
    parts = []
    for sex in ("M", "F"):
        d = load_nat(sex, date)
        d["key"], d["kind"] = pair_key_series(d["form"], sex)
        d["sex"] = sex
        parts.append(d)
    d = pd.concat(parts, ignore_index=True)
    wide = d.pivot_table(index="key", columns="sex", values="n", aggfunc="sum").reindex(columns=["M", "F"])
    wide.columns = ["n_m", "n_f"]
    wide = wide.reset_index()
    wide["n"] = wide["n_m"].fillna(0).astype("int64") + wide["n_f"].fillna(0).astype("int64")
    return wide


def matrix(long, value="n"):
    """key x voiv matrix (0 where the cell is absent; absence must be rendered as '<2 or absent', never 0)."""
    assert not long.duplicated(["key", "voiv"]).any()
    # pivot (not pivot_table): pivot_table's sum turns an all-NaN cell into 0, which would fake a zero.
    m = long.pivot(index="key", columns="voiv", values=value).reindex(columns=VOIV_ORDER)
    return m


def ensure_out():
    os.makedirs(REPO_OUT, exist_ok=True)
    return REPO_OUT


SHOWCASE = ["NOWAK", "KOWALSKI", "WIŚNIEWSKI", "KACZMAREK", "SZCZEPAŃSKI", "GRZEGORCZYK", "CZEKIERDA"]

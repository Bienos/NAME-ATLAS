"""Shared loaders and method definitions for the Name Atlas national fact lab.

Research prototype only (not product code). Every derived value used in the notes
comes from these functions run on the pinned source files listed in FILES.

Method versions used across scripts (see national_trends_trivia.md):
  PAIR-V1   gender pairing key: a form ending in SKA/CKA/DZKA maps to the same form
            ending in SKI/CKI/DZKI; every other form is its own key (identical forms
            such as NOWAK pair with themselves). Applied to the whole string (a
            hyphenated form is paired only by its final characters). Other gendered
            patterns (e.g. -NY/-NA, -OWA) are NOT paired in v1.
  RANK-V1   standard competition ranking ("1224"): order by count descending, tied
            counts share the lowest rank. Computed within one list (one sex file, or the
            set of PAIR-V1 units) at one reference date.
  SHARE-V1  entries / sum of all published entries in BOTH national sex files at the
            same reference date (paired) or in the one sex file (sex-specific).
            Published entries exclude suppressed single occurrences (unknown number).
  ONEIN-V1  1 in X = round(denominator / entries), same denominator as SHARE-V1.
"""
from __future__ import annotations

import csv
import hashlib
import os
from functools import lru_cache

DATA = "/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/data/pesel"
LEX = "/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad"
SGJP = os.path.join(LEX, "sgjp.tab.gz")
SJP = os.path.join(LEX, "sjp_odm.zip")
OUT = "/home/user/NAME-ATLAS/research_notes/Name Atlas data fact lab/data/national"
# intermediate showcase part files live in the scratchpad, never in the repository
PARTS = "/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/analysis/national/parts"

# Living persons, national (dataset 1681). Label -> (sex, reference date, file)
LIVING = {
    ("M", "2019"): ("2019-06-30", "1681_M_2019-06-30_r18990.csv"),
    ("M", "2020"): ("2020-01-22", "1681_M_2020-01-22_r22817.csv"),
    ("M", "2021"): ("2021-02-01", "1681_M_2021-02-01_r28052.csv"),
    ("M", "2022"): ("2022-01-27", "1681_M_2022-01-27_r36401.csv"),
    ("M", "2023"): ("2023-01-30", "1681_M_2023-01-30_r44647.csv"),
    ("M", "2024"): ("2024-01-19", "1681_M_2024-01-19_r54097.csv"),
    ("M", "2025"): ("2025-01-22", "1681_M_2025-01-22_r63892.csv"),
    ("M", "2026"): ("2026-01-20", "1681_M_2026-01-20_r1148808.csv"),
    ("F", "2019"): ("2019-06-30", "1681_F_2019-06-30_r18988.csv"),
    ("F", "2020"): ("2020-01-22", "1681_F_2020-01-22_r22815.csv"),
    ("F", "2021"): ("2021-02-02", "1681_F_2021-02-02_r35279.csv"),
    # ("F", "2022") deliberately excluded: r38772 is byte-identical to r35279 (2021).
    ("F", "2023"): ("2023-01-30", "1681_F_2023-01-30_r44646.csv"),
    ("F", "2024"): ("2024-01-19", "1681_F_2024-01-19_r54098.csv"),
    ("F", "2025"): ("2025-01-22", "1681_F_2025-01-22_r63888.csv"),
    ("F", "2026"): ("2026-01-20", "1681_F_2026-01-20_r1148811.csv"),
}
F2022_DUPLICATE = "1681_F_2022-01-27_r38772.csv"
YEARS = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"]
PAIRED_YEARS = [y for y in YEARS if y != "2022"]  # both sexes available

# Including deceased persons, national (dataset 568)
DECEASED_INCL = {
    ("M", "2024"): ("2024-01-19", "568_M_2024-01-19_r54119.csv"),
    ("F", "2024"): ("2024-01-19", "568_F_2024-01-19_r54120.csv"),
    ("M", "2025"): ("2025-01-22", "568_M_2025-01-22_r63886.csv"),
    ("F", "2025"): ("2025-01-22", "568_F_2025-01-22_r63883.csv"),
    ("F", "2026"): ("2026-01-20", "568_F_2026-01-20_r1148815.csv"),
}

SHOWCASE = [  # (unit key under PAIR-V1, display label)
    ("NOWAK", "NOWAK"),
    ("KOWALSKI", "KOWALSKI/KOWALSKA"),
    ("WIŚNIEWSKI", "WIŚNIEWSKI/WIŚNIEWSKA"),
    ("KACZMAREK", "KACZMAREK"),
    ("SZCZEPAŃSKI", "SZCZEPAŃSKI/SZCZEPAŃSKA"),
    ("GRZEGORCZYK", "GRZEGORCZYK"),
    ("CZEKIERDA", "CZEKIERDA"),
    # analyst-chosen extras (reasons in the notes)
    ("MAZUR", "MAZUR"),      # only top-100 surname with more entries in 2026 than 2019
    ("KRASKA", "KRASKA"),    # invariant -SKA surname: shows the PAIR-V1 collision
    ("KOZIOŁ", "KOZIOŁ"),    # SGJP lists two accepted genitives (Kozioła/Kozła)
]
# KRASKA is looked up as an invariant form (both files), not through PAIR-V1; see notes.
INVARIANT_OVERRIDE = {"KRASKA"}


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class LoadReport:
    """Collects parsing observations (data-quality findings)."""

    def __init__(self):
        self.notes: list[str] = []


REPORT = LoadReport()


@lru_cache(maxsize=None)
def load_file(fname: str) -> dict[str, int]:
    """Read one surname CSV -> {surname (stripped): count}.

    Stripping surrounding whitespace is an analysis choice (README: values may need
    .strip()). If stripping makes two raw rows collide, their counts are summed and
    the collision is recorded in REPORT.notes.
    """
    path = os.path.join(DATA, fname)
    out: dict[str, int] = {}
    raw_seen: dict[str, str] = {}
    with open(path, encoding="utf-8", newline="") as f:
        r = csv.reader(f)
        header = next(r)
        for row in r:
            if not row:
                continue
            if len(row) != 2:
                REPORT.notes.append(f"{fname}: row with {len(row)} fields: {row!r}")
                continue
            raw, cnt = row[0], int(row[1].strip())
            name = raw.strip()
            if raw != name:
                REPORT.notes.append(f"{fname}: whitespace around surname {raw!r} (count {cnt})")
            if name in out:
                REPORT.notes.append(
                    f"{fname}: duplicate after strip {name!r}: {raw_seen[name]!r}+{raw!r} -> summed")
                out[name] += cnt
            else:
                out[name] = cnt
                raw_seen[name] = raw
    return out


def living(sex: str, year: str) -> dict[str, int]:
    return load_file(LIVING[(sex, year)][1])


def deceased_incl(sex: str, year: str) -> dict[str, int]:
    return load_file(DECEASED_INCL[(sex, year)][1])


def ref_date(sex: str, year: str) -> str:
    return LIVING[(sex, year)][0]


# Non-surname values seen in the lists. Kept in raw sums (they are published entries),
# excluded from every editorial list/example. "NN" and "XXX" are probable placeholders.
PLACEHOLDERS = frozenset({"BRAK DANYCH", "BRAK NAZWISKA", ".", "-", "XXX", "NN"})
PLACEHOLDER_KEYS = frozenset(PLACEHOLDERS | {"BRAK NAZWISKI"})  # PAIR-V1 maps BRAK NAZWISKA -> BRAK NAZWISKI


# Publisher conversion artefact: the surname PRAWDA appears as "True" in the 2020, 2021 and 2022 files
# (M 2020-2022, F 2020-2021). Mapped back ONLY for set comparisons (A5); raw values are never altered elsewhere.
ARTEFACT_RENAMES = {"True": "PRAWDA"}


def is_placeholder(form: str) -> bool:
    return form in PLACEHOLDER_KEYS


# ---- PAIR-V1 -----------------------------------------------------------------
_FEM = (("DZKA", "DZKI"), ("CKA", "CKI"), ("SKA", "SKI"))


def pair_key(form: str) -> str:
    for fem, masc in _FEM:
        if form.endswith(fem):
            return form[: -len(fem)] + masc
    return form


def is_gendered_pair_form(form: str) -> bool:
    return form.endswith(("SKI", "CKI", "DZKI", "SKA", "CKA", "DZKA"))


def feminine_of(key: str) -> str:
    for fem, masc in _FEM:
        if key.endswith(masc):
            return key[: -len(masc)] + fem
    return key


@lru_cache(maxsize=None)
def paired(year: str) -> dict[str, dict]:
    """PAIR-V1 units for one year (both sexes needed).

    Returns {key: {"M": n_masc_form_in_M_file, "F": n_fem_form_in_F_file,
                   "M_other": other-form entries in M file (e.g. KOWALSKA in M file),
                   "F_other": other-form entries in F file (e.g. KOWALSKI in F file),
                   "total": sum of all four}}
    For identical-form keys (no gendered suffix) M = M-file count, F = F-file count,
    others are 0.
    """
    m, f = living("M", year), living("F", year)
    units: dict[str, dict] = {}

    def slot(k):
        u = units.get(k)
        if u is None:
            u = units[k] = {"M": 0, "F": 0, "M_other": 0, "F_other": 0,
                            "M_pub": False, "F_pub": False}
        return u

    for form, n in m.items():
        k = pair_key(form)
        u = slot(k)
        if form == k:
            u["M"] += n
            u["M_pub"] = True
        else:
            u["M_other"] += n
    for form, n in f.items():
        k = pair_key(form)
        u = slot(k)
        fem = feminine_of(k)
        if form == fem:
            u["F"] += n
            u["F_pub"] = True
        else:
            u["F_other"] += n
    for u in units.values():
        u["total"] = u["M"] + u["F"] + u["M_other"] + u["F_other"]
    return units


CONFLICT_MIN_M = 20


@lru_cache(maxsize=None)
def conflict_keys(year: str) -> frozenset:
    """PAIR-V1 collision flag (analysis addition, not part of the v1 rule itself).

    A key ending in SKI/CKI/DZKI is flagged when its feminine-looking form
    (…SKA/…CKA/…DZKA) is published in the MALE list with >= CONFLICT_MIN_M entries:
    the -SKA form is then evidently also an invariant surname (e.g. KRASKA, GĄSKA),
    so the female-list count of that form mixes two different surnames.
    """
    m = living("M", year)
    out = set()
    for form, n in m.items():
        if n >= CONFLICT_MIN_M and form.endswith(("SKA", "CKA", "DZKA")):
            out.add(pair_key(form))
    return frozenset(out)


def competition_rank(values: dict[str, int]) -> dict[str, int]:
    """RANK-V1: 1224 ranking by value descending."""
    items = sorted(values.items(), key=lambda kv: (-kv[1], kv[0]))
    ranks: dict[str, int] = {}
    prev_val, prev_rank = None, 0
    for i, (k, v) in enumerate(items, start=1):
        if v != prev_val:
            prev_rank, prev_val = i, v
        ranks[k] = prev_rank
    return ranks


def fmt_int(n) -> str:
    return f"{n:,}"


def ensure_out():
    os.makedirs(OUT, exist_ok=True)
    return OUT

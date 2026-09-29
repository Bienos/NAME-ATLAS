"""Build the data bundle for the Name Atlas fact-lab demo page.

Every number is computed here from the official files downloaded on 2026-09-29
(see ../data/README.md and ../data/pesel_sha256.txt), then cross-checked against
the fact-lab analysts' CSVs in the repo. Male and female PESEL lists are kept
separate throughout: nothing below sums or merges them.
"""
import gzip
import json
import re
import zipfile

import numpy as np
import pandas as pd

SP = "/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad"
PES = f"{SP}/data/pesel"
REPO = "/home/user/NAME-ATLAS/research_notes/Name Atlas data fact lab/data"
OUT = f"{SP}/demo/data.json"

NAT = {  # label -> (reference date, male-list file, female-list file)
    "2019": ("2019-06-30", "1681_M_2019-06-30_r18990.csv", "1681_F_2019-06-30_r18988.csv"),
    "2020": ("2020-01-22", "1681_M_2020-01-22_r22817.csv", "1681_F_2020-01-22_r22815.csv"),
    "2021": ("2021-02-01", "1681_M_2021-02-01_r28052.csv", "1681_F_2021-02-02_r35279.csv"),
    # The portal's female "2022" resource is byte-identical to 2021: no female 2022 snapshot.
    "2022": ("2022-01-27", "1681_M_2022-01-27_r36401.csv", None),
    "2023": ("2023-01-30", "1681_M_2023-01-30_r44647.csv", "1681_F_2023-01-30_r44646.csv"),
    "2024": ("2024-01-19", "1681_M_2024-01-19_r54097.csv", "1681_F_2024-01-19_r54098.csv"),
    "2025": ("2025-01-22", "1681_M_2025-01-22_r63892.csv", "1681_F_2025-01-22_r63888.csv"),
    "2026": ("2026-01-20", "1681_M_2026-01-20_r1148808.csv", "1681_F_2026-01-20_r1148811.csv"),
}
VOIV = {"M": "1681woj_M_2026-01-20_r1148786.csv", "F": "1681woj_F_2026-01-20_r1148790.csv"}
DECEASED_2025 = {"M": "568_M_2025-01-22_r63886.csv", "F": "568_F_2025-01-22_r63883.csv"}
PLACEHOLDERS = {"BRAK DANYCH", "BRAK NAZWISKA", "-", "."}
TERC = {
    "DOLNOŚLĄSKIE": "02", "KUJAWSKO-POMORSKIE": "04", "LUBELSKIE": "06", "LUBUSKIE": "08",
    "ŁÓDZKIE": "10", "MAŁOPOLSKIE": "12", "MAZOWIECKIE": "14", "OPOLSKIE": "16",
    "PODKARPACKIE": "18", "PODLASKIE": "20", "POMORSKIE": "22", "ŚLĄSKIE": "24",
    "ŚWIĘTOKRZYSKIE": "26", "WARMIŃSKO-MAZURSKIE": "28", "WIELKOPOLSKIE": "30",
    "ZACHODNIOPOMORSKIE": "32",
}
# (display key, male-list form, female-list form)
SHOWCASE = [
    ("NOWAK", "NOWAK", "NOWAK"),
    ("KOWALSKI", "KOWALSKI", "KOWALSKA"),
    ("WIŚNIEWSKI", "WIŚNIEWSKI", "WIŚNIEWSKA"),
    ("KACZMAREK", "KACZMAREK", "KACZMAREK"),
    ("MAZUR", "MAZUR", "MAZUR"),
    ("SZCZEPAŃSKI", "SZCZEPAŃSKI", "SZCZEPAŃSKA"),
    ("KOZIOŁ", "KOZIOŁ", "KOZIOŁ"),
    ("GRZEGORCZYK", "GRZEGORCZYK", "GRZEGORCZYK"),
    ("BARTKOWIAK", "BARTKOWIAK", "BARTKOWIAK"),
    ("BAGIŃSKI", "BAGIŃSKI", "BAGIŃSKA"),
    ("FORMELA", "FORMELA", "FORMELA"),
    ("CZEKIERDA", "CZEKIERDA", "CZEKIERDA"),
]
FOLD = str.maketrans("ĄĆĘŁŃÓŚŹŻ", "ACELNOSZZ")
checks = []  # (what, mine, theirs, ok)


def check(what, mine, theirs, tol=0.0):
    ok = theirs is None or (abs(float(mine) - float(theirs)) <= tol)
    checks.append((what, mine, theirs, ok))


def load_list(fn):
    df = pd.read_csv(f"{PES}/{fn}", dtype=str, keep_default_na=False)
    df = df.iloc[:, -2:]
    df.columns = ["s", "n"]
    df["s"] = df["s"].str.strip()
    df["n"] = df["n"].str.replace(r"\s", "", regex=True).astype(int)
    df = df[~df["s"].isin(PLACEHOLDERS)]
    return df.groupby("s")["n"].sum()


def load_voiv(fn):
    df = pd.read_csv(f"{PES}/{fn}", dtype=str, keep_default_na=False)
    df.columns = ["v", "s", "n"]
    df["s"] = df["s"].str.strip()
    df["n"] = df["n"].str.replace(r"\s", "", regex=True).astype(int)
    df = df[~df["s"].isin(PLACEHOLDERS)]
    df["t"] = df["v"].map(TERC)
    assert df["t"].notna().all()
    return df


print("loading national lists…")
lists = {}
for label, (date, fm, ff) in NAT.items():
    lists[(label, "M")] = load_list(fm)
    if ff:
        lists[(label, "F")] = load_list(ff)
voiv = {k: load_voiv(v) for k, v in VOIV.items()}
dec = {k: load_list(v) for k, v in DECEASED_2025.items()}

data = {"meta": {}, "surnames": [], "stories": {}, "quality": {}}
data["meta"]["dates"] = {k: v[0] for k, v in NAT.items()}

# ---------- helpers ----------
def rank_of(series, form):
    if form not in series.index:
        return None
    c = series[form]
    return int((series > c).sum()) + 1


def pct_fewer(series, form):
    if form not in series.index:
        return None
    c = series[form]
    return float(np.floor(10000.0 * (series < c).sum() / len(series)) / 100)  # floor: never round up to 100%


# voivodeship totals per list (sum of published cells)
vtot = {k: df.groupby("t")["n"].sum() for k, df in voiv.items()}

# ---------- SGJP declension ----------
targets = set()
for key, m, f in SHOWCASE:
    targets.add(m.capitalize() if not m.startswith("Ł") else m.capitalize())
    targets.add(f.capitalize())


def cap(s):
    return s[:1] + s[1:].lower()


targets = {cap(m) for _, m, _ in SHOWCASE} | {cap(f) for _, _, f in SHOWCASE}
sg = {}
with gzip.open(f"{SP}/sgjp.tab.gz", "rt", encoding="utf-8") as fh:
    for line in fh:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 4 or "nazwisko" not in parts[3]:
            continue
        lemma = parts[1].split(":")[0]
        if lemma in targets:
            sg.setdefault(lemma, []).append((parts[0], parts[1], parts[2]))


def forms_for(lemma, want_suffix, pred):
    out = []
    for form, lem, tag in sg.get(lemma, []):
        if "depr" in tag:
            continue
        gender = tag.split(":")[-1]
        if want_suffix == "m1" and gender != "m1":
            continue
        if want_suffix == "f" and gender != "f":
            continue
        if pred(tag):
            out.append(form)
    return sorted(set(out), key=out.index)


def declension(m, f):
    M, F = cap(m), cap(f)
    nom = forms_for(M, "m1", lambda t: t.startswith("subst:sg:nom"))
    gen = forms_for(M, "m1", lambda t: t.startswith("subst:sg:gen"))
    plnom = forms_for(M, "m1", lambda t: t.startswith("subst:pl:nom"))
    plgen = forms_for(M, "m1", lambda t: t.startswith("subst:pl:gen"))
    fgen = forms_for(F, "f", lambda t: t.startswith("subst:sg:gen") or t.startswith("subst:sg.pl:nom.gen"))
    f_indecl = any(t.startswith("subst:sg.pl:nom.gen.dat.acc.inst.loc.voc") for _, _, t in sg.get(F, []))
    if not nom:
        return None
    return {
        "nom": "/".join(nom), "gen": "/".join(gen), "plnom": "/".join(plnom), "plgen": "/".join(plgen),
        "fem": F, "femgen": "/".join(fgen) if fgen else None, "femDeclines": not f_indecl,
        "source": "SGJP 2026-08-24 (BSD-2)",
    }


# ---------- PRNG place adjectives ----------
prng = pd.read_parquet(f"{SP}/analysis/regional/prng_adj_places.parquet")
# projection: equirectangular with cos(lat0), fitted to the design system's Natural Earth outline box
LON0, LON1, LAT0, LAT1 = 14.1229, 24.1458, 49.0020, 54.8358
X0, X1, Y0, Y1 = 6.0, 554.0, 6.0, 524.2


def proj(lat, lon):
    x = X0 + (lon - LON0) / (LON1 - LON0) * (X1 - X0)
    y = Y0 + (LAT1 - lat) / (LAT1 - LAT0) * (Y1 - Y0)
    return round(x, 1), round(y, 1)


# ---------- US census ----------
us2000 = pd.read_csv(f"{SP}/data/us/names2000/app_c.csv", usecols=["name", "count"], dtype={"name": str}, keep_default_na=False)  # NA and NULL are real surnames
us2000 = us2000[us2000["name"] != ""].set_index("name")["count"].astype(int)
u20 = pd.read_excel(f"{SP}/data/us/Names2020_LastNames_RaceHispanic.xlsx", skiprows=2, usecols=[0, 1, 2], keep_default_na=False, na_values=[])
u20.columns = ["name", "rank", "count"]
u20 = u20[(u20["name"].astype(str) != "") & (u20["count"].astype(str) != "")]
us2020 = u20.set_index(u20["name"].astype(str))["count"].astype(int)

# ---------- sjp words ----------
words = set()
with zipfile.ZipFile(f"{SP}/sjp_odm.zip") as z:
    with z.open("odm.txt") as fh:
        for raw in fh:
            base = raw.decode("utf-8").split(",")[0].strip()
            if base and base[0].islower():
                words.add(base)
gloss = pd.read_csv(f"{REPO}/national/words_editorial_examples.csv")

# ---------- analysts' tables for cross-checks ----------
sc = pd.read_csv(f"{REPO}/national/showcase_surnames.csv")
sreg = pd.read_csv(f"{REPO}/regional/showcase_regional.csv")
sus = pd.read_csv(f"{REPO}/diaspora_history/showcase_us.csv")
splaces = pd.read_csv(f"{REPO}/regional/showcase_place_candidates.csv")


def their(show, metric):
    r = sc[(sc["showcase"].str.split("/").str[0] == show) & (sc["metric"] == metric)]
    return None if r.empty else float(r["value"].iloc[0])


# ---------- per-surname facts ----------
for key, m, f in SHOWCASE:
    rec = {"key": key, "m": m, "f": f}
    series = {"M": {}, "F": {}}
    for label in NAT:
        series["M"][label] = int(lists[(label, "M")].get(m, 0)) or None
        if (label, "F") in lists:
            series["F"][label] = int(lists[(label, "F")].get(f, 0)) or None
    rec["series"] = series
    m26, f26 = lists[("2026", "M")], lists[("2026", "F")]
    rec["now"] = {
        "M": {"n": int(m26.get(m, 0)) or None, "rank": rank_of(m26, m), "pctFewer": pct_fewer(m26, m), "forms": int(len(m26))},
        "F": {"n": int(f26.get(f, 0)) or None, "rank": rank_of(f26, f), "pctFewer": pct_fewer(f26, f), "forms": int(len(f26))},
    }
    check(f"{key} M 2026", rec["now"]["M"]["n"] or 0, their(key, "entries_M_list"))
    check(f"{key} F 2026", rec["now"]["F"]["n"] or 0, their(key, "entries_F_list"))
    check(f"{key} rank M", rec["now"]["M"]["rank"] or 0, their(key, "rank_in_M_list"))
    check(f"{key} rank F", rec["now"]["F"]["rank"] or 0, their(key, "rank_in_F_list"))

    # deceased share, 2025-01-22, per list
    dd = {}
    for sx, form in (("M", m), ("F", f)):
        inc = int(dec[sx].get(form, 0))
        liv = int(lists[("2025", sx)].get(form, 0))
        dd[sx] = {"incl": inc, "living": liv, "pct": round(100 * (inc - liv) / inc, 2) if inc else None}
    rec["deceased2025"] = dd
    check(f"{key} deceased M%", dd["M"]["pct"] or 0, their(key, "ageing_index_pct_M_2025"), 0.01)
    check(f"{key} deceased F%", dd["F"]["pct"] or 0, their(key, "ageing_index_pct_F_2025"), 0.01)

    # regional, per list
    reg = {}
    for sx, form in (("M", m), ("F", f)):
        df = voiv[sx]
        cells = df[df["s"] == form].groupby("t")["n"].sum()
        attributed = int(cells.sum())
        national = int(lists[("2026", sx)].get(form, 0))
        tot = vtot[sx]
        rows = []
        for t in sorted(TERC.values()):
            c = int(cells.get(t, 0))
            if c == 0:
                rows.append({"t": t, "n": None})
                continue
            share = c / attributed
            lq = share / (tot[t] / tot.sum())
            rows.append({"t": t, "n": c, "share": round(100 * share, 2), "lq": round(lq, 2),
                         "per10k": round(1e4 * c / tot[t], 2)})
        reg[sx] = {"rows": rows, "attributed": attributed, "national": national,
                   "unattributedPct": round(100 * (1 - attributed / national), 1) if national else None}
    rec["regional"] = reg
    r_their = sreg[sreg["key"] == m]
    if not r_their.empty:
        check(f"{key} voiv M sum", reg["M"]["attributed"], r_their["entries_m"].sum())
        check(f"{key} voiv F sum", reg["F"]["attributed"], r_their["entries_f"].sum())

    rec["declension"] = declension(m, f)

    if m.endswith(("SKI", "CKI", "DZKI")):
        pl = prng[prng["adj"] == m.lower()]
        places = []
        for _, p in pl.iterrows():
            x, y = proj(p["lat"], p["lon"])
            places.append({"name": p["nazwa główna"], "type": p["rodzaj obiektu"], "t": TERC[p["voiv"]],
                           "powiat": p["powiat"], "gmina": p["gmina"], "lat": round(p["lat"], 4),
                           "lon": round(p["lon"], 4), "x": x, "y": y})
        rec["places"] = places
        tp = splaces[splaces["surname"].str.split("/").str[0] == m]
        if not tp.empty:
            check(f"{key} places", len(places), tp["candidate_places_total"].iloc[0])

    fold = m.translate(FOLD)
    rec["us"] = {"spelling": fold, "y2000": int(us2000.get(fold, 0)) or None, "y2020": int(us2020.get(fold, 0)) or None}
    t_us = sus[sus["key_fold"] == fold]
    if not t_us.empty and rec["us"]["y2020"]:
        check(f"{key} US2020", rec["us"]["y2020"], t_us["us2020"].iloc[0])
        check(f"{key} US2000", rec["us"]["y2000"], t_us["us2000"].iloc[0])

    w = m.lower()
    if w in words:
        g = gloss[gloss["unit_key"] == m]
        rec["word"] = {"word": w, "gloss": None if g.empty else str(g["analyst_gloss_or_note"].iloc[0])}
    data["surnames"].append(rec)

# ---------- stories ----------
st = data["stories"]
st["totals"] = [
    {"year": label, "date": NAT[label][0],
     "M": {"entries": int(lists[(label, "M")].sum()), "forms": int(len(lists[(label, "M")]))},
     "F": None if (label, "F") not in lists else {"entries": int(lists[(label, "F")].sum()), "forms": int(len(lists[(label, "F")]))}}
    for label in NAT
]

top10 = {}
for sx in ("M", "F"):
    s19, s26 = lists[("2019", sx)], lists[("2026", sx)]
    top = s19.sort_values(ascending=False).head(10)
    top10[sx] = [{"s": s, "y2019": int(n), "y2026": int(s26.get(s, 0)) or None} for s, n in top.items()]
    t100 = s19.sort_values(ascending=False).head(100)
    fell = sum(1 for s, n in t100.items() if s26.get(s, 0) < n)
    top10[sx + "_fell_of_100"] = fell
    top10[sx + "_rose_of_100"] = [s for s, n in t100.items() if s26.get(s, 0) > n]
st["top10"] = top10

MONTHS = ["STYCZEŃ", "LUTY", "MARZEC", "KWIECIEŃ", "MAJ", "CZERWIEC", "LIPIEC", "SIERPIEŃ", "WRZESIEŃ",
          "PAŹDZIERNIK", "LISTOPAD", "GRUDZIEŃ"]
DAYS = ["PONIEDZIAŁEK", "WTOREK", "ŚRODA", "CZWARTEK", "PIĄTEK", "SOBOTA", "NIEDZIELA"]
m26, f26 = lists[("2026", "M")], lists[("2026", "F")]
st["calendar"] = {
    "months": [{"s": s, "M": int(m26.get(s, 0)) or None, "F": int(f26.get(s, 0)) or None} for s in MONTHS],
    "days": [{"s": s, "M": int(m26.get(s, 0)) or None, "F": int(f26.get(s, 0)) or None} for s in DAYS],
}

# top and "local favourite" per voivodeship, per list
regtop = {}
for sx in ("M", "F"):
    df = voiv[sx]
    tot = vtot[sx]
    national_share = df.groupby("s")["n"].sum() / tot.sum()
    out = []
    for t in sorted(TERC.values()):
        sub = df[df["t"] == t].groupby("s")["n"].sum().sort_values(ascending=False)
        top100 = sub.head(100)
        lq = (top100 / tot[t]) / national_share.reindex(top100.index)
        fav = lq.idxmax()
        out.append({"t": t, "top": sub.index[0], "topN": int(sub.iloc[0]), "second": sub.index[1],
                    "secondN": int(sub.iloc[1]), "fav": fav, "favLq": round(float(lq.max()), 2),
                    "favN": int(sub[fav])})
    regtop[sx] = out
st["regionTop"] = regtop

# spelling-pattern shares per voivodeship, per list
CLASSES = {
    "M": {"ski": ("SKI", "CKI", "DZKI"), "ak": ("AK",), "uk": ("UK",), "icz": ("ICZ",)},
    "F": {"ski": ("SKA", "CKA", "DZKA"), "ak": ("AK",), "uk": ("UK",), "icz": ("ICZ",)},
}
suffix = {}
for sx in ("M", "F"):
    df = voiv[sx]
    tot = vtot[sx]
    res = {}
    for cls, ends in CLASSES[sx].items():
        mask = df["s"].str.endswith(ends)
        byv = df[mask].groupby("t")["n"].sum()
        res[cls] = {"national": round(100 * byv.sum() / tot.sum(), 2),
                    "rows": [{"t": t, "share": round(100 * byv.get(t, 0) / tot[t], 2)} for t in sorted(TERC.values())]}
    suffix[sx] = res
st["suffix"] = suffix

sig = pd.read_csv(f"{REPO}/regional/signal_test_results.csv")
main = sig.iloc[0]
sbv = pd.read_csv(f"{REPO}/regional/signal_test_by_voivodeship.csv")
name_to_t = {k.capitalize(): v for k, v in TERC.items()}
st["signal"] = {
    "n": int(main["n_surnames"]), "observed": float(main["obs_top_lq_match_pct"]),
    "expected": float(main["perm_top_lq_match_mean_pct"]), "p975": float(main["perm_top_lq_match_p97_5_pct"]),
    "byVoiv": [{"name": r["candidate_voivodeship"], "n": int(r["n_surnames"]), "obs": float(r["obs_match_pct"]),
                "exp": float(r["expected_pct"])} for _, r in sbv.iterrows()],
}

ust = pd.read_csv(f"{REPO}/diaspora_history/us_top20_pl.csv")
st["usTop20"] = [{"pl": r["pl_spelling"], "fold": r["key_fold"], "y2000": int(r["us2000"]), "y2020": int(r["us2020"])}
                 for _, r in ust.iterrows()]

# ---------- data quality ----------
q = data["quality"]
recon = pd.read_csv(f"{REPO}/regional/reconciliation_2026.csv")
q["unattributed"] = {r["sex"]: {"gapPct": float(r["gap_pct"]), "lowerBoundPct": float(r["unattributed_lower_bound_pct"])}
                     for _, r in recon.iterrows() if r["sex"] in ("M", "F")}
for sx in ("M", "F"):
    mine = 100 * (1 - vtot[sx].sum() / lists[("2026", sx)].sum())
    check(f"unattributed {sx}%", round(mine, 2), q["unattributed"][sx]["gapPct"], 0.2)
true_rows = {}
for label in ("2019", "2020", "2021", "2022", "2023"):
    for sx in ("M", "F"):
        if (label, sx) in lists:
            s = lists[(label, sx)]
            true_rows[f"{label}{sx}"] = {"True": int(s[s.index.str.upper() == "TRUE"].sum()),
                                         "PRAWDA": int(s.get("PRAWDA", 0))}
q["prawdaArtefact"] = true_rows
ph = {}
for label, (date, fm, ff) in NAT.items():
    raw = pd.read_csv(f"{PES}/{fm}", dtype=str, keep_default_na=False).iloc[:, -2:]
    raw.columns = ["s", "n"]
    raw["s"] = raw["s"].str.strip()
    ph[label] = int(raw[raw["s"].isin(PLACEHOLDERS)]["n"].str.replace(r"\s", "", regex=True).astype(int).sum())
q["placeholderEntriesM"] = ph

# ---------- WWI casualty lists (CompGen, CC0): reuse the analyst's own cleaning and location rules ----------
import sys  # noqa: E402

sys.path.insert(0, f"{SP}/analysis/diaspora_history")
import common as dh  # noqa: E402

print("loading WWI lists…")
wcache = pd.read_parquet(f"{SP}/analysis/diaspora_history/wwi_cache.parquet", columns=["lastname"])
wloc = pd.read_parquet(f"{SP}/analysis/diaspora_history/wwi_entry_loc.parquet", columns=["country", "voiv"])
uniq = wcache["lastname"].unique()
cmap = {u: dh.clean_wwi_surname(u)[0] for u in uniq}
wclean = wcache["lastname"].map(cmap).to_numpy()
R9 = ["dolnośląskie", "kujawsko-pomorskie", "lubuskie", "opolskie", "pomorskie", "śląskie",
      "warmińsko-mazurskie", "wielkopolskie", "zachodniopomorskie"]
LOW2T = {k.lower(): v for k, v in TERC.items()}
R9T = [LOW2T[v] for v in R9]
wsum = pd.read_csv(f"{REPO}/diaspora_history/showcase_wwi_summary.csv")
wpers = pd.read_csv(f"{REPO}/diaspora_history/persistence_by_surname.csv")
wwi = {"surnames": {}}
for key, m, f in SHOWCASE:
    k = dh.fold(m)
    idx = wclean == k
    n = int(idx.sum())
    rec = {"n": n, "fold": k}
    if n:
        sub = wloc[idx]
        located = int((sub["country"] != "").sum())
        pol = sub[sub["country"] == "Poland"]
        byv = pol["voiv"].value_counts()
        cnt = {LOW2T[v]: int(byv.get(v, 0)) for v in R9}
        r9sum = sum(cnt.values())
        rec.update({"located": located, "locatedPct": round(100 * located / n, 1),
                    "polandPctOfLocated": round(100 * len(pol) / located, 1) if located else None,
                    "germanyPctOfLocated": round(100 * int((sub["country"] == "Germany").sum()) / located, 1) if located else None,
                    "r9": r9sum})
        rows = []
        pm = {}
        for sx in ("M", "F"):
            form = m if sx == "M" else f
            cells = voiv[sx][voiv[sx]["s"] == form].groupby("t")["n"].sum()
            tot = sum(int(cells.get(t, 0)) for t in R9T)
            pm[sx] = {t: (int(cells.get(t, 0)) / tot if tot else 0.0) for t in R9T}
        for t in R9T:
            c = cnt[t]
            rows.append({"t": t, "n": c if (c == 0 or c >= 5) else None, "lt5": 0 < c < 5,
                         "share": round(100 * c / r9sum, 1) if r9sum and (c == 0 or c >= 5) else None,
                         "m": round(100 * pm["M"][t], 1), "f": round(100 * pm["F"][t], 1)})
        rec["rows"] = rows
        if r9sum:
            pw = {t: cnt[t] / r9sum for t in R9T}
            rec["overlapM"] = round(sum(min(pw[t], pm["M"][t]) for t in R9T), 3)
            top = max(R9T, key=lambda t: cnt[t])
            rec["top"] = {"t": top, "wwiPct": round(100 * cnt[top] / r9sum, 1), "m": round(100 * pm["M"][top], 1),
                          "f": round(100 * pm["F"][top], 1)}
        pr = wpers[wpers["key_fold"] == k]
        if not pr.empty:
            rec["chance"] = round(float(pr["chance_overlap_mean_other_surnames"].iloc[0]), 3)
            rec["overlapTheirs"] = round(float(pr["overlap"].iloc[0]), 3)
        ws = wsum[wsum["key_fold"] == k]
        if not ws.empty:
            check(f"{key} WWI entries", n, ws["wwi_entries"].iloc[0])
            if not pd.isna(ws["wwi_located_pct"].iloc[0]):
                check(f"{key} WWI located%", rec["locatedPct"], ws["wwi_located_pct"].iloc[0], 0.05)
                check(f"{key} WWI Poland%", rec["polandPctOfLocated"], ws["wwi_poland_pct_of_located"].iloc[0], 0.05)
                check(f"{key} WWI top-voiv% in R9", rec["top"]["wwiPct"], ws["wwi_top_voiv_pct_within_R9"].iloc[0], 0.05)
                check(f"{key} PESEL M% in WWI top voiv (R9)", rec["top"]["m"], ws["pesel_m_pct_in_wwi_top_voiv_within_R9"].iloc[0], 0.05)
    wwi["surnames"][key] = rec
ps = pd.read_csv(f"{REPO}/diaspora_history/persistence_summary.csv").iloc[0]
wwi["story"] = {
    "entries": int(len(wclean)), "located": int((wloc["country"] != "").sum()),
    "poland": int((wloc["country"] == "Poland").sum()),
    "n": int(ps["n_surname_forms"]), "observed": float(ps["observed_mean_overlap"]),
    "baseline": float(ps["baseline_mean_overlap"]), "baseline975": float(ps["baseline_97.5pct"]),
    "aboveChance": float(ps["share_surnames_own_above_chance"]),
    "sameTop": float(ps["same_top_voivodeship_observed"]), "sameTopBase": float(ps["same_top_voivodeship_baseline"]),
    "sameTopBase975": float(ps["same_top_voivodeship_baseline_97.5pct"]),
}
wt = pd.read_csv(f"{REPO}/diaspora_history/wwi_top20_pl.csv")
wwi["top20"] = [{"s": r["surname"], "n": int(r["wwi_entries"]), "overlap": None if pd.isna(r["persist_overlap"]) else float(r["persist_overlap"]),
                 "chance": None if pd.isna(r["persist_chance_overlap"]) else float(r["persist_chance_overlap"])} for _, r in wt.iterrows()]
data["wwi"] = wwi

# ---------- projection sanity check: known cities fall inside their voivodeship ----------
geo = json.load(open(f"{SP}/demo/voivodeships.json", encoding="utf-8"))


def poly_contains(d, x, y):
    inside = False
    for sub in re.split(r"(?=M)", d):
        pts = [(float(a), float(b)) for a, b in re.findall(r"(-?[\d.]+),(-?[\d.]+)", sub)]
        for i in range(len(pts)):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % len(pts)]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                inside = not inside
    return inside


cities = {"Warszawa": (52.2297, 21.0122, "14"), "Kraków": (50.0647, 19.9450, "12"), "Gdańsk": (54.3520, 18.6466, "22"),
          "Wrocław": (51.1079, 17.0385, "02"), "Rzeszów": (50.0412, 21.9991, "18"), "Szczecin": (53.4285, 14.5528, "32"),
          "Białystok": (53.1325, 23.1688, "20"), "Poznań": (52.4064, 16.9252, "30"), "Opole": (50.6751, 17.9213, "16"),
          "Olsztyn": (53.7784, 20.4801, "28"), "Lublin": (51.2465, 22.5684, "06"), "Łódź": (51.7592, 19.4560, "10")}
for name, (lat, lon, t) in cities.items():
    x, y = proj(lat, lon)
    check(f"projection {name}", 1 if poly_contains(geo[t]["d"], x, y) else 0, 1)

data["meta"]["checks"] = {"total": len(checks), "failed": [c for c in checks if not c[3]]}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"wrote {OUT}: {round(len(json.dumps(data, ensure_ascii=False)) / 1024)} KB")
print(f"cross-checks: {len(checks)} run, {sum(1 for c in checks if not c[3])} failed")
for c in checks:
    if not c[3]:
        print("  FAIL", c)

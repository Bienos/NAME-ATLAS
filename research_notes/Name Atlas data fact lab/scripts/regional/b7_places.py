"""B7: official place-name candidates for -SKI/-CKI/-DZKI surnames (PRNG adjective form 'przymiotnik').

Sources: PRNG localities export 2026-09-28 (GUGiK, CC BY 4.0, credit GUGiK) via prng_cache.parquet;
PESEL 1681 national 2026-01-20 (M file for the surname universe; M + paired F for entry weights).
Method PLACE-v1:
  adjective := PRNG 'przymiotnik', stripped, lowercased, stray quote characters removed (1 row had one).
  PRNG gives an adjective ONLY for rows with 'rodzaj obiektu' = wieś (village) or miasto (town) (+1 część wsi row),
  all with 'status nazwy' = urzędowa (official). We use those rows (a row = one locality; homonymous localities
  are separate rows).
  A surname (male form ending -SKI/-CKI/-DZKI) is a candidate match if surname.lower() == adjective exactly.
  Coordinates: 'współrzędne geograficzne' (WGS84, DMS) converted to decimal degrees.
Result is at most POSSIBLE for any individual surname: an official adjective equal to the surname does not show that
the surname was formed from that place.
"""
import re
import numpy as np
import pandas as pd
from common import WORK, PRNG_CACHE, load_nat, pair_key_series, display_key, ensure_out, VOIV, noun_ska_set

out = ensure_out()
DMS = re.compile(r"(\d+)°(\d+)'(\d+(?:\.\d+)?)\"\s+(\d+)°(\d+)'(\d+(?:\.\d+)?)\"")


def dms(s):
    m = DMS.fullmatch(s.strip())
    if not m:
        return (np.nan, np.nan)
    a = [float(x) for x in m.groups()]
    return (round(a[0] + a[1] / 60 + a[2] / 3600, 5), round(a[3] + a[4] / 60 + a[5] / 3600, 5))


def load_places():
    p = pd.read_parquet(PRNG_CACHE)
    p = p[p["przymiotnik"].notna()].copy()
    raw = p["przymiotnik"]
    p["adj"] = raw.str.strip().str.lower().str.replace('"', "", regex=False).str.replace("'", "", regex=False)
    p["adj_had_quote"] = raw.str.contains('"', regex=False)
    ll = p["współrzędne geograficzne"].map(dms)
    p["lat"] = ll.map(lambda t: t[0]); p["lon"] = ll.map(lambda t: t[1])
    p["voiv"] = p["województwo"].str.upper()
    assert set(p.voiv) <= set(VOIV), set(p.voiv) - set(VOIV)
    return p


if __name__ == "__main__":
    p = load_places()
    print("rows with adjective:", len(p), "| rodzaj:", p["rodzaj obiektu"].value_counts().to_dict(),
          "| status:", p["status nazwy"].value_counts().to_dict())
    print("rows with stray quote in adjective:", int(p.adj_had_quote.sum()), p.loc[p.adj_had_quote, ["nazwa główna", "przymiotnik"]].values.tolist())
    print("coordinate parse failures:", int(p.lat.isna().sum()), "| lat range", p.lat.min(), p.lat.max(), "| lon range", p.lon.min(), p.lon.max())
    print("distinct adjectives:", p.adj.nunique(), "| ending -ski/-cki/-dzki:",
          int(p.adj.drop_duplicates().str.endswith(("ski", "cki", "dzki")).sum()),
          "| other endings e.g.:", p.loc[~p.adj.str.endswith(("ski", "cki", "dzki")), "adj"].drop_duplicates().head(8).tolist())
    places_per_adj = p.groupby("adj").size()
    print("places per adjective: 1:", int((places_per_adj == 1).sum()), " 2-3:", int(places_per_adj.between(2, 3).sum()),
          " 4-10:", int(places_per_adj.between(4, 10).sum()), " >10:", int((places_per_adj > 10).sum()),
          " max:", places_per_adj.idxmax(), int(places_per_adj.max()))

    # surname universe: national 2026 male forms ending -SKI/-CKI/-DZKI; weights = paired national entries
    m = load_nat("M"); f = load_nat("F")
    m["key"], _ = pair_key_series(m.form, "M"); f["key"], _ = pair_key_series(f.form, "F")
    pairn = pd.concat([m[["key", "n"]], f[["key", "n"]]]).groupby("key")["n"].sum()
    sk = m[m.form.str.endswith(("SKI", "CKI", "DZKI"))].copy()
    sk["n_paired"] = sk.key.map(pairn).astype(int)
    sk["n_f"] = sk.n_paired - sk.n
    sk["adj"] = sk.form.str.lower()
    cand = p.groupby("adj").agg(n_places=("adj", "size"), n_towns=("rodzaj obiektu", lambda s: int((s == "miasto").sum())),
                                n_voiv=("voiv", "nunique"), voivs=("voiv", lambda s: "|".join(sorted(set(s)))))
    sk = sk.merge(cand, left_on="adj", right_index=True, how="left")
    sk["n_places"] = sk.n_places.fillna(0).astype(int)
    sk["matched"] = sk.n_places > 0
    sk.to_parquet(f"{WORK}/sk_candidates_2026.parquet")

    rows = []
    for thr in (2, 20, 100, 1000):
        s = sk[sk.n_paired >= thr]
        rows.append({"min_paired_national_entries": thr, "distinct_surnames": len(s), "matched_distinct": int(s.matched.sum()),
                     "matched_distinct_pct": round(100 * s.matched.mean(), 1),
                     "paired_entries": int(s.n_paired.sum()), "matched_entries": int(s.loc[s.matched, "n_paired"].sum()),
                     "matched_entries_pct": round(100 * s.loc[s.matched, "n_paired"].sum() / s.n_paired.sum(), 1),
                     "matched_to_a_town_distinct": int((s.n_towns > 0).sum())})
    cov = pd.DataFrame(rows)
    print("\nCoverage (male -SKI/-CKI/-DZKI forms, national 2026; weights = M + paired F entries):")
    print(cov.to_string(index=False))
    # by suffix
    for suf in ("DZKI", "CKI", "SKI"):
        s = sk[(sk.n_paired >= 20) & sk.form.str.endswith(suf) & ~(sk.form.str.endswith("DZKI") & (suf == "CKI"))]
        if suf == "SKI":
            s = sk[(sk.n_paired >= 20) & sk.form.str.endswith("SKI")]
        print(f"  -{suf} (>=20): {len(s)} surnames, matched {100*s.matched.mean():.1f}% distinct, "
              f"{100*s.loc[s.matched,'n_paired'].sum()/s.n_paired.sum():.1f}% of entries")

    # distribution of number of candidate places (surnames >=20 entries, matched)
    s = sk[(sk.n_paired >= 20) & sk.matched]
    bins = pd.cut(s.n_places, [0, 1, 2, 3, 5, 10, 20, 1000], labels=["1", "2", "3", "4-5", "6-10", "11-20", ">20"])
    dist = pd.DataFrame({"surnames": bins.value_counts().sort_index(),
                         "entries": s.groupby(bins, observed=False)["n_paired"].sum()})
    dist["surnames_pct"] = (100 * dist.surnames / dist.surnames.sum()).round(1)
    print("\nNumber of candidate places per matched surname (>=20 entries):")
    print(dist.to_string())
    one_voiv = s[s.n_voiv == 1]
    print(f"matched surnames (>=20) whose candidates all lie in ONE voivodeship: {len(one_voiv)} ({100*len(one_voiv)/len(s):.1f}%)")

    # examples
    print("\nLargest surnames WITHOUT a matching official adjective:")
    print(sk[~sk.matched].sort_values("n_paired", ascending=False).head(15)[["form", "n_paired"]].to_string(index=False))
    print("\nLargest surnames WITH matches:")
    print(sk[sk.matched].sort_values("n_paired", ascending=False).head(25)[["form", "n_paired", "n_places", "n_towns", "n_voiv", "voivs"]].to_string(index=False))
    print("\nLargest surnames with exactly ONE candidate place:")
    one = sk[sk.n_places == 1].sort_values("n_paired", ascending=False).head(20)
    one = one.merge(p[["adj", "nazwa główna", "rodzaj obiektu", "voiv", "powiat"]], on="adj")
    print(one[["form", "n_paired", "nazwa główna", "rodzaj obiektu", "voiv", "powiat"]].to_string(index=False))
    print("\nSurnames matching a TOWN adjective (largest):")
    tw = sk[sk.n_towns > 0].sort_values("n_paired", ascending=False).head(15)
    tw = tw.merge(p.loc[p["rodzaj obiektu"] == "miasto", ["adj", "nazwa główna", "voiv"]], on="adj")
    print(tw[["form", "n_paired", "n_places", "nazwa główna", "voiv"]].to_string(index=False))

    cov["dataset"] = "PESEL 1681 national 2026-01-20 (M forms -SKI/-CKI/-DZKI; weights M + paired F) x PRNG localities 2026-09-28 (GUGiK, CC BY 4.0)"
    cov["method"] = "PLACE-v1: exact lowercase match of the male surname form to PRNG 'przymiotnik' (villages and towns, official names)"
    cov.to_csv(f"{out}/place_candidates_coverage.csv", index=False)
    d2 = dist.reset_index().rename(columns={"n_places": "candidate_places", "index": "candidate_places"})
    d2.columns = ["candidate_places", "surnames", "paired_entries", "surnames_pct"]
    d2["scope"] = "matched male -SKI/-CKI/-DZKI surnames with >=20 paired national entries, 2026-01-20"
    d2.to_csv(f"{out}/place_candidates_distribution.csv", index=False)
    p.to_parquet(f"{WORK}/prng_adj_places.parquet")

"""B7/B9 output: candidate official places for showcase/demo -SKI/-CKI/-DZKI surnames, with decimal coordinates and
the surname's 2026 LQ in each candidate place's voivodeship (for a map overlay). Also the largest single-voivodeship
matches of the signal-test MAIN set, for editorial examples.
Sources: PRNG localities 2026-09-28 (GUGiK, CC BY 4.0); PESEL 1681woj 2026-01-20 (paired pair-v1.1)."""
import pandas as pd
from common import WORK, paired_woj, matrix, VOIV_ORDER, vname, teryt, display_key, ensure_out

out = ensure_out()
long = paired_woj("2026-01-20")
N = matrix(long, "n").fillna(0)
N = N[~N.index.str.contains(r"\[")]
T_v = long.groupby("voiv")["n"].sum().reindex(VOIV_ORDER)
q = T_v / T_v.sum()
LQ = N.div(N.sum(axis=1), axis=0).div(q, axis=1)
places = pd.read_parquet(f"{WORK}/prng_adj_places.parquet")
main = pd.read_parquet(f"{WORK}/signal_main_set.parquet")

SHOW = ["KOWALSKI", "WIŚNIEWSKI", "SZCZEPAŃSKI", "BAGIŃSKI", "ŁUPIŃSKI"]
extra = main[main.lq_rank_vc == 1].sort_values("N", ascending=False).head(15).key.tolist()
extra += main[main.lq_rank_vc >= 12].sort_values("N", ascending=False).head(5).key.tolist()
rows = []
match_keys, miss_keys = extra[:15], extra[15:]
for k in SHOW + [e for e in extra if e not in SHOW]:
    pl = places[places.adj == k.lower()]
    grp = ("showcase/demo" if k in SHOW else
           "signal-test match (top-LQ voivodeship = candidate voivodeship)" if k in match_keys else
           "signal-test miss (candidate voivodeship ranks >=12 of 16 by LQ)")
    for r in pl.to_dict("records"):
        v = r["voiv"]
        rows.append({"surname": display_key(k), "group": grp,
                     "paired_entries_2026_voiv_files": int(N.loc[k].sum()), "candidate_places_total": len(pl),
                     "place_name": r["nazwa główna"], "place_type": r["rodzaj obiektu"], "teryt": teryt(v),
                     "voivodeship": vname(v), "powiat": r["powiat"], "gmina": r["gmina"], "lat": r["lat"],
                     "lon": r["lon"], "prng_id": r["identyfikator PRNG"],
                     "surname_lq_in_place_voivodeship": round(float(LQ.loc[k, v]), 2),
                     "surname_entries_in_place_voivodeship": int(N.loc[k, v]),
                     "surname_top_lq_voivodeship": vname(LQ.loc[k].idxmax())})
df = pd.DataFrame(rows)
df["source"] = "PRNG localities export 2026-09-28, GUGiK (CC BY 4.0); PESEL 1681woj 2026-01-20"
df["method"] = "PLACE-v1 exact lowercase match surname == PRNG przymiotnik; LQ per REGIONAL-v1"
df["confidence"] = "POSSIBLE at most (official adjective equals surname; origin not established)"
df.to_csv(f"{out}/showcase_place_candidates.csv", index=False)
print(df.groupby("surname").agg(places=("place_name", "size"), voivs=("voivodeship", "nunique"),
                                top_lq=("surname_top_lq_voivodeship", "first")).to_string())
print(df[df.surname.str.startswith(("SZCZEP", "BAGI", "ŁUPI"))][["surname", "place_name", "place_type", "voivodeship",
                                                                 "powiat", "lat", "lon", "surname_lq_in_place_voivodeship",
                                                                 "surname_entries_in_place_voivodeship"]].to_string(index=False))
# KOWALSKI / WIŚNIEWSKI: LQ in candidate voivodeships
for k in ("KOWALSKI/KOWALSKA", "WIŚNIEWSKI/WIŚNIEWSKA"):
    s = df[df.surname == k].groupby("voivodeship").agg(places=("place_name", "size"),
                                                        lq=("surname_lq_in_place_voivodeship", "first"))
    print(k, s.sort_values("lq", ascending=False).to_dict("index"))

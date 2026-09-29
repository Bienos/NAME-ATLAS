"""B6: stability of regional shares.
(1) 1681woj 2025-02-24 vs 2026-01-20 (living, permanent registered residence; same universe, ~11 months apart)
(2) 568woj 2017-12-31 (INCLUDING deceased persons; different universe) vs 1681woj 2026-01-20 (living) - shares only.
Method STAB-v1: per paired surname, share vector p_v = n_sv / N_s; change = max_v |p_v(a) - p_v(b)| (pp) and
D_ab = 0.5 * sum_v |p_v(a) - p_v(b)|; top voivodeship by count and by LQ compared.
"""
import numpy as np
import pandas as pd
from common import paired_woj, matrix, VOIV_ORDER, vname, display_key, ensure_out, SHOWCASE

out = ensure_out()
mats = {}
for date in ("2017-12-31", "2025-02-24", "2026-01-20"):
    long = paired_woj(date)
    N = matrix(long, "n").fillna(0)
    N = N[~N.index.str.contains(r"\[")]
    mats[date] = N

tot = pd.DataFrame({d: m.sum() for d, m in mats.items()})
share_tot = tot / tot.sum()
print("Voivodeship share of all listed entries (%):")
print((100 * share_tot).round(2).rename(index=vname).to_string())
print("totals:", tot.sum().astype(int).to_dict())


def compare(a, b, min_n, label, keys=None):
    A, B = mats[a], mats[b]
    common = A.index.intersection(B.index)
    Na, Nb = A.loc[common].sum(axis=1), B.loc[common].sum(axis=1)
    sel = common[(Na >= min_n) & (Nb >= min_n)] if keys is None else [k for k in keys if k in common]
    Pa = A.loc[sel].div(A.loc[sel].sum(axis=1), axis=0)
    Pb = B.loc[sel].div(B.loc[sel].sum(axis=1), axis=0)
    qa = A.sum() / A.values.sum(); qb = B.sum() / B.values.sum()
    La, Lb = Pa.div(qa, axis=1), Pb.div(qb, axis=1)
    maxchg = 100 * (Pa - Pb).abs().max(axis=1)
    Dab = 0.5 * (Pa - Pb).abs().sum(axis=1)
    same_top = (Pa.idxmax(axis=1) == Pb.idxmax(axis=1))
    same_lq = (La.idxmax(axis=1) == Lb.idxmax(axis=1))
    print(f"\n{label}: surnames={len(sel)} (>= {min_n} paired entries in both)" if keys is None else f"\n{label}")
    print(f"  top voivodeship by count unchanged: {same_top.sum()}/{len(sel)} ({100*same_top.mean():.1f}%); "
          f"by LQ unchanged: {same_lq.sum()}/{len(sel)} ({100*same_lq.mean():.1f}%)")
    print(f"  max share change (pp): median {maxchg.median():.2f}, p90 {maxchg.quantile(.9):.2f}, max {maxchg.max():.2f}; "
          f"D_ab median {Dab.median():.4f}, p90 {Dab.quantile(.9):.4f}")
    return pd.DataFrame({"surname": [display_key(k) for k in sel], "N_a": A.loc[sel].sum(axis=1).astype(int).values,
                         "N_b": B.loc[sel].sum(axis=1).astype(int).values,
                         "top_a": Pa.idxmax(axis=1).map(vname).values, "top_b": Pb.idxmax(axis=1).map(vname).values,
                         "top_share_a_pct": (100 * Pa.max(axis=1)).round(2).values,
                         "share_b_in_top_a_pct": (100 * pd.Series([Pb.loc[k, Pa.loc[k].idxmax()] for k in sel], index=sel)).round(2).values,
                         "max_share_change_pp": maxchg.round(2).values, "D_ab": Dab.round(4).values,
                         "top_lq_a": La.idxmax(axis=1).map(vname).values, "top_lq_b": Lb.idxmax(axis=1).map(vname).values}, index=sel)


r1 = compare("2025-02-24", "2026-01-20", 1000, "2025-02-24 vs 2026-01-20")
r1b = compare("2025-02-24", "2026-01-20", 100, "2025-02-24 vs 2026-01-20 (>=100)")
flip = r1[r1.top_a != r1.top_b]
print("  top-by-count flips (>=1000):", len(flip))
print(flip.sort_values("N_b", ascending=False).head(10).to_string(index=False))

# most common per voivodeship 2025 vs 2026
for d in ("2025-02-24", "2026-01-20"):
    print(d, "most common per voivodeship:", {vname(v): display_key(mats[d][v].idxmax()) for v in VOIV_ORDER})

top100 = mats["2026-01-20"].sum(axis=1).sort_values(ascending=False).index[:100]
r2 = compare("2017-12-31", "2026-01-20", 0, "2017-12-31 (incl. deceased) vs 2026-01-20 (living): top-100 surnames of 2026",
             keys=list(top100))
flip2 = r2[r2.top_a != r2.top_b]
print("  top-by-count flips among top 100:", len(flip2))
print(flip2.to_string(index=False))
big = r2.sort_values("max_share_change_pp", ascending=False).head(10)
print("  largest share changes among top 100:")
print(big.to_string(index=False))
r3 = compare("2017-12-31", "2026-01-20", 1000, "2017 vs 2026, all surnames >=1000 in both")

sc = []
for k in SHOWCASE:
    for (a, b), r in ((("2025-02-24", "2026-01-20"), compare("2025-02-24", "2026-01-20", 0, f"showcase {k} 25v26", keys=[k])),
                      (("2017-12-31", "2026-01-20"), compare("2017-12-31", "2026-01-20", 0, f"showcase {k} 17v26", keys=[k]))):
        x = r.iloc[0].to_dict(); x.update({"date_a": a, "date_b": b}); sc.append(x)
sc = pd.DataFrame(sc)
print(sc[["surname", "date_a", "N_a", "N_b", "top_a", "top_b", "top_share_a_pct", "share_b_in_top_a_pct",
          "max_share_change_pp", "D_ab"]].to_string(index=False))

res = pd.concat([r1.assign(date_a="2025-02-24", date_b="2026-01-20", scope="all surnames >=1000 paired entries in both")
                 .sort_values("max_share_change_pp", ascending=False).head(50),
                 r2.assign(date_a="2017-12-31", date_b="2026-01-20", scope="top 100 surnames of 2026"),
                 sc.assign(scope="showcase")], ignore_index=True)
res["dataset_a"] = res.date_a.map({"2025-02-24": "PESEL 1681woj living, permanent registered residence",
                                   "2017-12-31": "PESEL 568woj INCLUDING deceased, by voivodeship (different universe)"})
res["dataset_b"] = "PESEL 1681woj living, permanent registered residence, 2026-01-20"
res["method"] = "STAB-v1: shares p_v = n_sv/N_s; max |p_a - p_b| in pp; D_ab = 0.5*sum|p_a - p_b|"
res.to_csv(f"{out}/stability_regional.csv", index=False)
tot2 = (100 * share_tot).round(3).reset_index()
tot2.columns = ["voiv", "share_pct_2017_incl_deceased", "share_pct_2025_02_24", "share_pct_2026_01_20"]
tot2.insert(0, "voivodeship", tot2.voiv.map(vname)); tot2 = tot2.drop(columns="voiv")
tot2.to_csv(f"{out}/stability_voivodeship_totals.csv", index=False)


# B2 picks in 2025 vs 2026 (signature >=500, top-5 >=1000 overlap, local favourite among top 100)
def picks(N):
    T_v = N.sum(); q = T_v / T_v.sum(); Ns = N.sum(axis=1)
    LQ = N.div(Ns, axis=0).div(q, axis=1)
    sig = {v: LQ.loc[Ns >= 500, v].idxmax() for v in VOIV_ORDER}
    t5 = {v: set(LQ.loc[Ns >= 1000, v].sort_values(ascending=False).head(5).index) for v in VOIV_ORDER}
    lf = {v: LQ.loc[N[v].sort_values(ascending=False).index[:100], v].idxmax() for v in VOIV_ORDER}
    return sig, t5, lf
s25, t25, l25 = picks(mats["2025-02-24"]); s26, t26, l26 = picks(mats["2026-01-20"])
print("\nB2 picks 2025 vs 2026: signature>=500 same in", sum(s25[v] == s26[v] for v in VOIV_ORDER), "/16;",
      "local favourite (top100) same in", sum(l25[v] == l26[v] for v in VOIV_ORDER), "/16;",
      "top-5 (>=1000) mean overlap", round(np.mean([len(t25[v] & t26[v]) for v in VOIV_ORDER]), 2), "/5")
print("  signature changes:", {vname(v): (display_key(s25[v]), display_key(s26[v])) for v in VOIV_ORDER if s25[v] != s26[v]})
print("  local favourite changes:", {vname(v): (display_key(l25[v]), display_key(l26[v])) for v in VOIV_ORDER if l25[v] != l26[v]})

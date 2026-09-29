"""B1 per-surname regional cards, B2 voivodeship signature surnames, B3 concentration vs evenness.

Dataset: PESEL 1681woj (living persons, voivodeship of PERMANENT registered residence), 2026-01-20, M+F paired
with pair-v1.1 (see common.py). Unit: entries. Denominators: all entries listed in the same voivodeship files.

Method REGIONAL-v1:
  n_sv  = paired entries of surname key s registered (permanent residence) in voivodeship v (absent cell = 0 in
          arithmetic, rendered as "<2 or absent")
  N_s   = sum_v n_sv ; T_v = all paired entries listed for v ; T = sum_v T_v ; q_v = T_v / T
  share_in_v = n_sv / N_s ; per10k = 10000 * n_sv / T_v ; LQ = (n_sv / N_s) / q_v  (= per10k_v / national per10k)
  D (dissimilarity vs all entries) = 0.5 * sum_v |n_sv/N_s - q_v|   (0 = same spread as the whole register)
  HHI = sum_v (n_sv/N_s)^2 ; top-share = max_v n_sv/N_s
"""
import numpy as np
import pandas as pd
from common import WORK, paired_woj, matrix, VOIV_ORDER, teryt, vname, display_key, ensure_out, SHOWCASE, PAIRING_VERSION

METHOD = "REGIONAL-v1"
DS = "PESEL 1681woj living persons, voivodeship of permanent registered residence, 2026-01-20"
out = ensure_out()

long = paired_woj("2026-01-20")
N = matrix(long, "n").fillna(0)
M_ = matrix(long, "n_m")
F_ = matrix(long, "n_f")
N = N[~N.index.str.contains(r"\[")]  # drop unpaired cross-gender forms from editorial matrices
T_v = long.groupby("voiv")["n"].sum().reindex(VOIV_ORDER)
T = T_v.sum()
q = T_v / T
Ns = N.sum(axis=1)
P = N.div(Ns, axis=0)
LQ = P.div(q, axis=1)
PER10K = N.div(T_v, axis=1) * 1e4
D = 0.5 * (P - q).abs().sum(axis=1)
HHI = (P ** 2).sum(axis=1)
topv_count = N.idxmax(axis=1)
topv_lq = LQ.idxmax(axis=1)
topshare = P.max(axis=1)
ncells = (N > 0).sum(axis=1)
stats = pd.DataFrame({"N": Ns, "D": D, "HHI": HHI, "top_share": topshare, "top_voiv": topv_count,
                      "top_lq_voiv": topv_lq, "max_lq": LQ.max(axis=1), "cells": ncells})
stats.to_parquet(f"{WORK}/regional_stats_2026.parquet")
print("paired keys (excl. cross forms):", len(N), "T =", int(T), PAIRING_VERSION)
print("HHI of the register itself (sum q^2) =", round(float((q ** 2).sum()), 4))

# ---------------------------------------------------------------- B1: showcase cards


def card(key):
    rows = []
    n = N.loc[key]; ns = n.sum()
    for v in VOIV_ORDER:
        m = M_.loc[key, v] if key in M_.index else np.nan
        f = F_.loc[key, v] if key in F_.index else np.nan
        present = n[v] > 0
        note = "reported"
        if not present:
            note = "<2 or absent (both sexes)"
        elif pd.isna(m) or pd.isna(f):
            note = "lower bound: one sex cell <2 or absent"
        rows.append({
            "surname": display_key(key), "key": key, "teryt": teryt(v), "voivodeship": vname(v),
            "entries_m": "" if pd.isna(m) else int(m), "entries_f": "" if pd.isna(f) else int(f),
            "entries_paired": int(n[v]) if present else "", "cell_note": note,
            "share_of_surname_pct": round(100 * n[v] / ns, 2) if present else "",
            "entries_per_10k": round(float(PER10K.loc[key, v]), 3) if present else "",
            "lq": round(float(LQ.loc[key, v]), 3) if present else "",
            "rank_by_count": int(n[n > 0].rank(ascending=False, method="min")[v]) if present else "",
        })
    return rows


def card_summary(key):
    n = N.loc[key]; ns = int(n.sum())
    vt = n.idxmax(); vl = LQ.loc[key].idxmax()
    rep = n[n > 0]
    lq_rep = LQ.loc[key, rep.index]
    return {"surname": display_key(key), "paired_entries_in_voiv_files": ns,
            "top_voiv_by_count": vname(vt), "top_count": int(n[vt]), "top_share_pct": round(100 * n[vt] / ns, 1),
            "top_voiv_by_lq": vname(vl), "top_lq": round(float(LQ.loc[key, vl]), 2),
            "count_in_top_lq_voiv": int(n[vl]), "per10k_in_top_lq_voiv": round(float(PER10K.loc[key, vl]), 2),
            "national_per10k": round(10000 * ns / T, 3),
            "D": round(float(D[key]), 3), "cells_reported": int(ncells[key]),
            "min_lq_voiv_reported": vname(lq_rep.idxmin()), "min_lq_reported": round(float(lq_rep.min()), 2),
            "count_in_min_lq_voiv": int(n[lq_rep.idxmin()]),
            "second_voiv_by_count": vname(n.sort_values(ascending=False).index[1]),
            "second_count": int(n.sort_values(ascending=False).iloc[1]),
            # near-tie rule (TIE-v1): |a-b| <= 2*sqrt(a+b), i.e. within ~2 SD of the difference of two Poisson counts
            "top_is_near_tie": bool(abs(n.max() - n.sort_values(ascending=False).iloc[1])
                                    <= 2 * np.sqrt(n.max() + n.sort_values(ascending=False).iloc[1])),
            **lq_tie(key)}


def lq_tie(key):
    """TIE-v1 for LQ: are the two highest-LQ voivodeships' rates distinguishable? Conditional binomial z-test:
    n1 | n1+n2 ~ Bin(n1+n2, T1/(T1+T2)) under equal rates; near-tie if |z| < 2."""
    lq = LQ.loc[key].sort_values(ascending=False)
    v1, v2 = lq.index[0], lq.index[1]
    n1, n2 = N.loc[key, v1], N.loc[key, v2]
    p = T_v[v1] / (T_v[v1] + T_v[v2]); m = n1 + n2
    z = (n1 - m * p) / np.sqrt(m * p * (1 - p)) if m > 0 else 0.0
    return {"second_voiv_by_lq": vname(v2), "second_lq": round(float(lq.iloc[1]), 2),
            "top_lq_z": round(float(z), 2), "top_lq_is_near_tie": bool(abs(z) < 2)}


def run_cards(keys, tag):
    allrows, summ = [], []
    for k in keys:
        if k not in N.index:
            print("NOT IN VOIVODESHIP FILES:", k); continue
        allrows += card(k); summ.append(card_summary(k))
    df = pd.DataFrame(allrows)
    df["dataset"] = DS; df["method"] = METHOD + "; " + PAIRING_VERSION.split(" (")[0]
    s = pd.DataFrame(summ)
    print(f"\n=== B1 cards ({tag}) ===")
    print(s.to_string(index=False))
    return df, s


# ---------------------------------------------------------------- B2: voivodeship signatures
print("\n=== B2 signatures ===")
elig = N.index[~N.index.str.contains(r"\[")]
sig_rows = []
top_by_voiv = {}
for v in VOIV_ORDER:
    col = N[v]
    top = col.sort_values(ascending=False)
    top_by_voiv[v] = top
    k1 = top.index[0]
    row = {"teryt": teryt(v), "voivodeship": vname(v),
           "most_common": display_key(k1), "most_common_entries": int(top.iloc[0]),
           "most_common_per10k": round(float(PER10K.loc[k1, v]), 1),
           "second_most_common": display_key(top.index[1]), "second_entries": int(top.iloc[1])}
    for thr in (500,):
        cand = LQ.loc[Ns >= thr, v].sort_values(ascending=False)
        k = cand.index[0]
        row.update({"signature_min500": display_key(k), "signature_lq": round(float(cand.iloc[0]), 2),
                    "signature_entries_in_voiv": int(N.loc[k, v]), "signature_entries_all_voiv": int(Ns[k]),
                    "signature_share_in_voiv_pct": round(100 * float(P.loc[k, v]), 1)})
    # local favourite: most over-represented among the voivodeship's 100 most common surnames
    t100 = top.index[:100]
    k = LQ.loc[t100, v].idxmax()
    row.update({"local_favourite_top100": display_key(k), "local_favourite_lq": round(float(LQ.loc[k, v]), 2),
                "local_favourite_entries_in_voiv": int(N.loc[k, v]),
                "local_favourite_rank_in_voiv": int(list(top.index).index(k) + 1),
                "local_favourite_share_in_voiv_pct": round(100 * float(P.loc[k, v]), 1)})
    sig_rows.append(row)
sig = pd.DataFrame(sig_rows)
sig["dataset"] = DS
sig["method"] = (METHOD + "; signature = max LQ among surnames with >=500 paired entries in the voivodeship files; "
                 "local favourite = max LQ among the voivodeship's 100 most common surnames")
sig.to_csv(f"{out}/voivodeship_signatures.csv", index=False)
print(sig.drop(columns=["dataset", "method"]).to_string(index=False))

# sensitivity of the LQ signature to the national minimum
sens = []
for thr in (100, 200, 500, 1000, 2000, 5000):
    for v in VOIV_ORDER:
        cand = LQ.loc[Ns >= thr, v].sort_values(ascending=False)
        k = cand.index[0]
        sens.append({"min_paired_entries": thr, "teryt": teryt(v), "voivodeship": vname(v),
                     "signature": display_key(k), "lq": round(float(cand.iloc[0]), 2),
                     "entries_in_voiv": int(N.loc[k, v]), "entries_all_voiv": int(Ns[k]),
                     "share_in_voiv_pct": round(100 * float(P.loc[k, v]), 1)})
sens = pd.DataFrame(sens)
sens.to_csv(f"{out}/voivodeship_signature_sensitivity.csv", index=False)
piv = sens.pivot(index="voivodeship", columns="min_paired_entries", values="signature")
print("\nSignature by threshold:\n", piv.to_string())
base = sens[sens.min_paired_entries == 500].set_index("voivodeship")["signature"]
for thr in (100, 200, 1000, 2000, 5000):
    same = (sens[sens.min_paired_entries == thr].set_index("voivodeship")["signature"] == base).sum()
    print(f"threshold {thr}: same signature as >=500 in {same}/16 voivodeships")

# most common surname: margins and sex-specific checks
print("\nmost common counts:", sig.most_common.value_counts().to_dict())
print("margin of most common over second (entries, % of second):")
for r in sig.itertuples():
    print(f"  {r.voivodeship}: {r.most_common} {r.most_common_entries} vs {r.second_most_common} "
          f"{r.second_entries} -> +{r.most_common_entries - r.second_entries} "
          f"({100*(r.most_common_entries/r.second_entries-1):.1f}%)")
Mf = M_.fillna(0); Ff = F_.fillna(0)
for lab, mat in (("M form", Mf), ("F form", Ff)):
    tops = {vname(v): mat[v].idxmax() for v in VOIV_ORDER}
    print(f"most common {lab} by voivodeship:", tops)

# top-5 over-represented surnames per voivodeship (N>=1000) - a list is more robust than a single max
t5 = []
for v in VOIV_ORDER:
    cand = LQ.loc[Ns >= 1000, v].sort_values(ascending=False).head(5)
    for rank, (k, lq) in enumerate(cand.items(), 1):
        t5.append({"teryt": teryt(v), "voivodeship": vname(v), "rank": rank, "surname": display_key(k),
                   "lq": round(float(lq), 2), "entries_in_voiv": int(N.loc[k, v]), "entries_all_voiv": int(Ns[k]),
                   "share_in_voiv_pct": round(100 * float(P.loc[k, v]), 1)})
t5 = pd.DataFrame(t5)
t5["dataset"] = DS
t5["method"] = METHOD + "; top 5 by LQ among surnames with >=1000 paired entries in the voivodeship files"
t5.to_csv(f"{out}/voivodeship_overrepresented_top5.csv", index=False)
# overlap of top-10 lists between thresholds 500 and 1000/200
for a, b in ((500, 200), (500, 1000), (1000, 2000)):
    ov = []
    for v in VOIV_ORDER:
        la = set(LQ.loc[Ns >= a, v].sort_values(ascending=False).head(10).index)
        lb = set(LQ.loc[Ns >= b, v].sort_values(ascending=False).head(10).index)
        ov.append(len(la & lb))
    print(f"top-10 LQ overlap between thresholds {a} and {b}: mean {np.mean(ov):.1f}/10, min {min(ov)}")

# local favourite variants: restrict to the voivodeship's top 50 / 100 / 200 surnames
lf = {}
for K in (50, 100, 200):
    lf[K] = {vname(v): display_key(LQ.loc[top_by_voiv[v].index[:K], v].idxmax()) for v in VOIV_ORDER}
lfd = pd.DataFrame(lf)
print("\nlocal favourite by top-K restriction:\n", lfd.to_string())
print("same for K=50 vs 100:", (lfd[50] == lfd[100]).sum(), "/16 ; K=100 vs 200:", (lfd[100] == lfd[200]).sum(), "/16")

# voivodeship distinctiveness: dissimilarity of v's surname mix vs the rest of Poland
dist_rows = []
for thr in (100, 1000):
    sub = N.loc[Ns >= thr]
    for v in VOIV_ORDER:
        a = sub[v] / sub[v].sum()
        rest = sub.drop(columns=v).sum(axis=1)
        b = rest / rest.sum()
        dist_rows.append({"min_paired_entries": thr, "teryt": teryt(v), "voivodeship": vname(v),
                          "D_vs_rest_of_poland": round(0.5 * float((a - b).abs().sum()), 4),
                          "n_surnames_ge1000_with_50pct_here": int(((stats.N >= 1000) & (stats.top_share >= 0.5)
                                                                     & (stats.top_voiv == v)).sum()),
                          "n_surnames_ge1000_with_lq3_here": int(((Ns >= 1000) & (LQ[v] >= 3)).sum())})
dist = pd.DataFrame(dist_rows)
dist["dataset"] = DS
dist["method"] = (METHOD + "; D_vs_rest = 0.5*sum_s |n_sv/T_v - n_s,rest/T_rest| over surnames with >= min entries; "
                  "counts use surnames with >=1000 paired entries")
dist.to_csv(f"{out}/voivodeship_distinctiveness.csv", index=False)
pv = dist.pivot(index="voivodeship", columns="min_paired_entries", values="D_vs_rest_of_poland")
pv["rank100"] = pv[100].rank(ascending=False).astype(int); pv["rank1000"] = pv[1000].rank(ascending=False).astype(int)
extra = dist[dist.min_paired_entries == 1000].set_index("voivodeship")[["n_surnames_ge1000_with_50pct_here",
                                                                         "n_surnames_ge1000_with_lq3_here"]]
print("\nvoivodeship distinctiveness:\n", pv.join(extra).sort_values(1000, ascending=False).to_string())

# ---------------------------------------------------------------- B3: concentrated vs even
print("\n=== B3 concentration ===")
for thr in (1000, 5000):
    s = stats[stats.N >= thr]
    print(f"N>={thr}: surnames={len(s)}; median D={s.D.median():.3f}; "
          f">=50% in one voiv: {(s.top_share >= 0.5).sum()} ({100*(s.top_share >= 0.5).mean():.1f}%); "
          f">=80%: {(s.top_share >= 0.8).sum()}; >=90%: {(s.top_share >= 0.9).sum()}")
for lo, hi in ((20, 100), (100, 1000), (1000, 10000), (10000, 10**7)):
    s = stats[(stats.N >= lo) & (stats.N < hi)]
    print(f"size band [{lo},{hi}): n={len(s)} median D={s.D.median():.3f} median top_share={s.top_share.median():.3f}")

conc_rows = []
for label, thr, asc, col in (("most_concentrated_D", 5000, False, "D"), ("most_concentrated_D", 1000, False, "D"),
                             ("most_even_D", 10000, True, "D"), ("most_even_D", 5000, True, "D"),
                             ("highest_top_share", 5000, False, "top_share")):
    s = stats[stats.N >= thr].sort_values(col, ascending=asc).head(15)
    for rank, (k, r) in enumerate(s.iterrows(), 1):
        conc_rows.append({"list": label, "min_paired_entries": thr, "rank": rank, "surname": display_key(k),
                          "paired_entries_voiv_files": int(r.N), "D": round(r.D, 3), "HHI": round(r.HHI, 3),
                          "top_voivodeship": vname(r.top_voiv), "top_share_pct": round(100 * r.top_share, 1),
                          "max_lq_voivodeship": vname(r.top_lq_voiv), "max_lq": round(r.max_lq, 2)})
conc = pd.DataFrame(conc_rows)
conc["dataset"] = DS
conc["method"] = METHOD + "; D = 0.5*sum|p_v - q_v| vs all entries; HHI = sum p_v^2"
conc.to_csv(f"{out}/concentration_lists.csv", index=False)
for (label, thr), g in conc.groupby(["list", "min_paired_entries"], sort=False):
    print(f"\n{label} (N>={thr})")
    print(g[["rank", "surname", "paired_entries_voiv_files", "D", "top_voivodeship", "top_share_pct", "max_lq"]]
          .to_string(index=False))

# largest counts among highly concentrated: surnames with >=50% in one voivodeship, by size
big = stats[(stats.top_share >= 0.5)].sort_values("N", ascending=False).head(25)
print("\nLargest surnames with >=50% of entries in one voivodeship:")
print(pd.DataFrame({"surname": [display_key(k) for k in big.index], "N": big.N.astype(int),
                    "top_voiv": big.top_voiv.map(vname), "top_share": (100 * big.top_share).round(1),
                    "max_lq": big.max_lq.round(2)}).to_string(index=False))
by_v = stats[(stats.N >= 1000) & (stats.top_share >= 0.5)].groupby("top_voiv").size().reindex(VOIV_ORDER).fillna(0)
print("\nCount of surnames (N>=1000) with >=50% in one voivodeship, by that voivodeship:")
print(by_v.rename(index=vname).astype(int).to_string())

# ---------------------------------------------------------------- write showcase cards
if __name__ == "__main__":
    import sys
    # B9 demo surnames chosen after inspecting B2/B3/B8 output (override on the command line)
    demo = sys.argv[1:] or ["BARTKOWIAK", "FORMELA", "BAGIŃSKI"]
    df, s = run_cards(SHOWCASE + demo, "showcase + demo")
    df.to_csv(f"{out}/showcase_regional.csv", index=False)
    s.to_csv(f"{WORK}/showcase_summary.csv", index=False)
    s["dataset"] = DS
    s["method"] = (METHOD + "; TIE-v1: count near-tie if |a-b| <= 2*sqrt(a+b); LQ near-tie if |z| < 2 "
                   "(conditional binomial test of the two highest-LQ voivodeships)")
    s.to_csv(f"{out}/showcase_regional_summary.csv", index=False)

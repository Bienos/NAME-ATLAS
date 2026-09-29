"""B8: signal test - are bearers of a toponymic-candidate surname still over-represented in the voivodeship of its
candidate place(s)?

Data: PESEL 1681woj 2026-01-20 (living, permanent registered residence), paired pair-v1.1; PRNG localities 2026-09-28.
Method SIGNAL-v1:
  test set = adjectival paired keys (male form -SKI/-CKI/-DZKI) with >= MIN paired entries in the 2026 voivodeship
             files, whose exact-lowercase PRNG adjective matches 1-3 localities, all in ONE voivodeship V_c.
  outcome  = V_c == argmax_v LQ(s, v)   (and V_c == argmax_v n_sv)
  baseline = permutation: shuffle V_c across the test surnames (keeps both marginals), 10,000 iterations,
             seed 20260929; p = (1 + #perm >= observed) / (1 + iterations).
  also     = median LQ(s, V_c) observed vs permuted; V_c within the surname's top-3 LQ voivodeships.
"""
import numpy as np
import pandas as pd
from common import WORK, paired_woj, matrix, VOIV_ORDER, vname, teryt, display_key, ensure_out

SEED, ITER = 20260929, 10000
out = ensure_out()
rng = np.random.default_rng(SEED)

long = paired_woj("2026-01-20")
N = matrix(long, "n").fillna(0)
N = N[~N.index.str.contains(r"\[")]
T_v = long.groupby("voiv")["n"].sum().reindex(VOIV_ORDER)
q = (T_v / T_v.sum()).values
Ns = N.sum(axis=1)
adjk = N.index[N.index.str.endswith(("SKI", "CKI", "DZKI"))]
NA = N.loc[adjk]
LQ = NA.div(NA.sum(axis=1), axis=0).values / q
places = pd.read_parquet(f"{WORK}/prng_adj_places.parquet")
vidx = {v: i for i, v in enumerate(VOIV_ORDER)}
grp = places.groupby("adj").agg(n_places=("adj", "size"), voivs=("voiv", lambda s: sorted(set(s))),
                                kinds=("rodzaj obiektu", lambda s: sorted(set(s))))
info = pd.DataFrame({"key": adjk, "N": NA.sum(axis=1).values})
info["adj"] = info.key.str.lower()
info = info.merge(grp, left_on="adj", right_index=True, how="left")
info["n_places"] = info.n_places.fillna(0).astype(int)
info["row"] = np.arange(len(info))
lq_arg = LQ.argmax(axis=1)
cnt_arg = NA.values.argmax(axis=1)
lq_rank = (-LQ).argsort(axis=1).argsort(axis=1)  # 0 = highest LQ


def test(sel, label, iters=ITER):
    rows = sel.row.values
    vc = np.array([vidx[v[0]] for v in sel.voivs])
    obs_lq = float(np.mean(lq_arg[rows] == vc))
    obs_cnt = float(np.mean(cnt_arg[rows] == vc))
    obs_top3 = float(np.mean(lq_rank[rows, vc] < 3))
    obs_med = float(np.median(LQ[rows, vc]))
    perm_lq = np.empty(iters); perm_cnt = np.empty(iters); perm_top3 = np.empty(iters); perm_med = np.empty(iters)
    for i in range(iters):
        pv = rng.permutation(vc)
        perm_lq[i] = np.mean(lq_arg[rows] == pv)
        perm_cnt[i] = np.mean(cnt_arg[rows] == pv)
        perm_top3[i] = np.mean(lq_rank[rows, pv] < 3)
        perm_med[i] = np.median(LQ[rows, pv])
    p = lambda perm, obs: (1 + np.sum(perm >= obs)) / (1 + iters)
    r = {"variant": label, "n_surnames": len(rows), "n_entries": int(sel.N.sum()),
         "obs_top_lq_match_pct": round(100 * obs_lq, 1), "perm_top_lq_match_mean_pct": round(100 * perm_lq.mean(), 1),
         "perm_top_lq_match_p97_5_pct": round(100 * np.quantile(perm_lq, .975), 1), "p_top_lq": round(p(perm_lq, obs_lq), 5),
         "lift_top_lq": round(obs_lq / perm_lq.mean(), 2),
         "obs_top_count_match_pct": round(100 * obs_cnt, 1), "perm_top_count_match_mean_pct": round(100 * perm_cnt.mean(), 1),
         "p_top_count": round(p(perm_cnt, obs_cnt), 5),
         "obs_in_top3_lq_pct": round(100 * obs_top3, 1), "perm_in_top3_lq_mean_pct": round(100 * perm_top3.mean(), 1),
         "obs_median_lq_in_candidate_voiv": round(obs_med, 2), "perm_median_lq_mean": round(perm_med.mean(), 2),
         "p_median_lq": round(p(perm_med, obs_med), 5),
         "uniform_expectation_pct": round(100 / 16, 1)}
    return r


base = info[(info.n_places >= 1)].copy()
base["n_voiv"] = base.voivs.map(len)
res = []
variants = [
    ("MAIN: 1-3 places, one voivodeship, >=100 entries", (base.n_places <= 3) & (base.n_voiv == 1) & (base.N >= 100)),
    ("exactly 1 place, >=100 entries", (base.n_places == 1) & (base.N >= 100)),
    ("1-3 places, one voivodeship, >=20 entries", (base.n_places <= 3) & (base.n_voiv == 1) & (base.N >= 20)),
    ("1-3 places, one voivodeship, >=500 entries", (base.n_places <= 3) & (base.n_voiv == 1) & (base.N >= 500)),
    ("1-3 places, one voivodeship, >=1000 entries", (base.n_places <= 3) & (base.n_voiv == 1) & (base.N >= 1000)),
    ("4-10 places, one voivodeship, >=100 entries", (base.n_places.between(4, 10)) & (base.n_voiv == 1) & (base.N >= 100)),
    ("1-3 places, one voivodeship, >=100, villages only", (base.n_places <= 3) & (base.n_voiv == 1) & (base.N >= 100)
     & base.kinds.map(lambda k: k == ["wieś"])),
]
# data-defined split: the 4 voivodeships with the LOWEST distinctiveness index D_vs_rest (>=1000 surnames, see
# b1_b3_regional.py / voivodeship_distinctiveness.csv): Dolnośląskie, Zachodniopomorskie, Lubuskie, Opolskie
LOW_DIST = {"DOLNOŚLĄSKIE", "ZACHODNIOPOMORSKIE", "LUBUSKIE", "OPOLSKIE"}
main_mask = (base.n_places <= 3) & (base.n_voiv == 1) & (base.N >= 100)
in_low = base.voivs.map(lambda v: v[0] in LOW_DIST)
variants += [
    ("MAIN, candidate in the 4 lowest-distinctiveness voivodeships (own permutation)", main_mask & in_low),
    ("MAIN, candidate in the other 12 voivodeships (own permutation)", main_mask & ~in_low),
]
for label, mask in variants:
    sel = base[mask]
    r = test(sel, label)
    res.append(r)
    print(r)
R = pd.DataFrame(res)

# per candidate voivodeship (MAIN set): observed vs permutation expectation (= share of the test set whose
# top-LQ voivodeship is V)
main = base[(base.n_places <= 3) & (base.n_voiv == 1) & (base.N >= 100)].copy()
main["vc"] = main.voivs.map(lambda v: v[0])
main["top_lq_v"] = [VOIV_ORDER[i] for i in lq_arg[main.row.values]]
main["top_cnt_v"] = [VOIV_ORDER[i] for i in cnt_arg[main.row.values]]
main["lq_in_vc"] = LQ[main.row.values, [vidx[v] for v in main.vc]]
main["lq_rank_vc"] = lq_rank[main.row.values, [vidx[v] for v in main.vc]] + 1
exp_by_v = main.top_lq_v.value_counts(normalize=True)
bv = main.groupby("vc").agg(n=("key", "size"), obs=("top_lq_v", lambda s: np.nan))
bv["obs_match_pct"] = main.assign(m=main.top_lq_v == main.vc).groupby("vc")["m"].mean() * 100
bv["expected_pct"] = [100 * exp_by_v.get(v, 0) for v in bv.index]
bv["median_lq_in_vc"] = main.groupby("vc")["lq_in_vc"].median()
bv = bv.drop(columns="obs").reindex(VOIV_ORDER)
bv.index = bv.index.map(vname)
print("\nMAIN set by candidate voivodeship:\n", bv.round(1).to_string())
print("\nMAIN: distribution of the candidate voivodeship's LQ rank (1 = highest LQ):")
print(main.lq_rank_vc.value_counts().sort_index().to_string())
print("share of MAIN surnames with LQ in candidate voivodeship >= 2:", round(100 * (main.lq_in_vc >= 2).mean(), 1),
      "% ; < 1:", round(100 * (main.lq_in_vc < 1).mean(), 1), "%")

R["dataset"] = ("PESEL 1681woj living, permanent registered residence, 2026-01-20 (paired pair-v1.1) x PRNG localities "
                "2026-09-28 (GUGiK, CC BY 4.0)")
R["method"] = f"SIGNAL-v1: permutation of candidate voivodeship across test surnames, {ITER} iterations, seed {SEED}"
R.to_csv(f"{out}/signal_test_results.csv", index=False)
bvo = bv.reset_index().rename(columns={"vc": "candidate_voivodeship", "n": "n_surnames"})
bvo["scope"] = "MAIN set: 1-3 candidate places all in one voivodeship, >=100 paired entries"
bvo.round(2).to_csv(f"{out}/signal_test_by_voivodeship.csv", index=False)
main.to_parquet(f"{WORK}/signal_main_set.parquet")
# examples: strongest and weakest cases in the main set
ex = main.sort_values("N", ascending=False)
print("\nLargest MAIN-set surnames (match / no match):")
print(ex.head(30)[["key", "N", "n_places", "vc", "top_lq_v", "lq_in_vc", "lq_rank_vc"]].to_string(index=False))

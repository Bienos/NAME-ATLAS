"""B5: reconcile national (1681) vs voivodeship (1681woj) files, both reference date 2026-01-20.

Per registered form and sex: gap = national count - sum of voivodeship cells.
The gap has two possible parts that the files do not separate:
  (a) entries with no voivodeship of permanent registration in the breakdown (cause not stated in the data)
  (b) voivodeship cells with exactly 1 entry, suppressed at source (at most 1 per missing voivodeship cell)
Bounds (RECON-v1): unattributed_s in [max(0, gap_s - missing_cells_s), gap_s], missing_cells_s = 16 - reported cells.
"""
import numpy as np
import pandas as pd
from common import WORK, load_woj, load_nat, pair_key_series, display_key, ensure_out, SHOWCASE
from b4_suffix import classify, CLASSES

out = ensure_out()
rows_all = []
summary = []
for sex in ("M", "F"):
    w = load_woj(sex)
    nat = load_nat(sex)
    g = w.groupby("form").agg(woj_sum=("n", "sum"), cells=("n", "size")).reset_index()
    m = nat.merge(g, on="form", how="outer", indicator=True)
    only_woj = m[m["_merge"] == "right_only"]
    m = m[m["_merge"] != "right_only"].copy()
    m["woj_sum"] = m["woj_sum"].fillna(0).astype(int)
    m["cells"] = m["cells"].fillna(0).astype(int)
    m["gap"] = m["n"] - m["woj_sum"]
    neg = m[m.gap < 0]
    m["missing_cells"] = 16 - m["cells"]
    m["unattr_lo"] = np.maximum(0, m["gap"] - m["missing_cells"])
    m["unattr_hi"] = m["gap"]
    m["sex"] = sex
    rows_all.append(m)
    N = int(m.n.sum()); W = int(m.woj_sum.sum())
    summary.append({"sex": sex, "national_entries": N, "voiv_file_entries_matched": W,
                    "voiv_file_entries_total": int(w.n.sum()), "gap": N - W, "gap_pct": round(100 * (N - W) / N, 2),
                    "unattributed_lower_bound": int(m.unattr_lo.sum()),
                    "unattributed_lower_bound_pct": round(100 * m.unattr_lo.sum() / N, 2),
                    "max_suppressed_singletons": int((m.gap - m.unattr_lo).sum()),
                    "forms_in_voiv_not_in_national": len(only_woj), "forms_with_voiv_sum_gt_national": len(neg),
                    "national_forms": len(nat), "national_forms_absent_from_all_voiv_cells": int((m.cells == 0).sum()),
                    "entries_of_those_forms": int(m.loc[m.cells == 0, "n"].sum())})
    if len(only_woj) or len(neg):
        print(sex, "INCONSISTENCIES: only in voiv:", only_woj.head().to_dict("records"), "neg gap:",
              neg.head().to_dict("records"))

S = pd.DataFrame(summary)
tot = S.drop(columns="sex").sum(numeric_only=True)
tot["gap_pct"] = round(100 * tot["gap"] / tot["national_entries"], 2)
tot["unattributed_lower_bound_pct"] = round(100 * tot["unattributed_lower_bound"] / tot["national_entries"], 2)
S = pd.concat([S, pd.DataFrame([{"sex": "M+F", **tot.to_dict()}])], ignore_index=True)
print(S.T.to_string())

allf = pd.concat(rows_all, ignore_index=True)
allf["cls"] = classify(allf["form"])

# gap share by size band and by spelling class
allf["gap_share"] = allf.gap / allf.n
for lo, hi in ((2, 20), (20, 100), (100, 1000), (1000, 10000), (10000, 10 ** 7)):
    s = allf[(allf.n >= lo) & (allf.n < hi)]
    print(f"national size band [{lo},{hi}): forms={len(s):,} entries={s.n.sum():,} gap%={100*s.gap.sum()/s.n.sum():.1f} "
          f"lower-bound unattributed%={100*s.unattr_lo.sum()/s.n.sum():.1f} median form gap share={s.gap_share.median():.3f}")
big = allf[allf.n >= 1000]
print("forms with >=1000 national entries:", len(big), "median gap share", round(big.gap_share.median(), 4),
      "p10", round(big.gap_share.quantile(.1), 4), "p90", round(big.gap_share.quantile(.9), 4),
      "max", round(big.gap_share.max(), 4))
print("forms >=1000 with gap share > 50%:", int((big.gap_share > .5).sum()), "> 80%:", int((big.gap_share > .8).sum()))
bycls = allf.groupby("cls")[["n", "woj_sum", "gap", "unattr_lo"]].sum().reindex(CLASSES)
bycls["gap_pct"] = (100 * bycls.gap / bycls.n).round(1)
bycls["unattr_lo_pct"] = (100 * bycls.unattr_lo / bycls.n).round(1)
print(bycls.to_string())
# among forms >=1000, gap share by class (median)
print("median gap share among forms >=1000 by class:",
      big.groupby("cls")["gap_share"].median().round(3).reindex(CLASSES).to_dict())

# showcase surnames (paired)
rows = []
for k in SHOWCASE:
    r = {"surname": display_key(k)}
    for sex in ("M", "F"):
        form = k if sex == "M" or not k.endswith(("SKI", "CKI", "DZKI")) else k[:-1] + "A"
        x = allf[(allf.sex == sex) & (allf.form == form)]
        r[f"national_{sex}"] = int(x.n.iloc[0]) if len(x) else None
        r[f"voiv_sum_{sex}"] = int(x.woj_sum.iloc[0]) if len(x) else None
        r[f"cells_{sex}"] = int(x.cells.iloc[0]) if len(x) else None
    r["national_paired"] = (r["national_M"] or 0) + (r["national_F"] or 0)
    r["voiv_sum_paired"] = (r["voiv_sum_M"] or 0) + (r["voiv_sum_F"] or 0)
    r["gap"] = r["national_paired"] - r["voiv_sum_paired"]
    r["gap_pct"] = round(100 * r["gap"] / r["national_paired"], 1)
    miss = (16 - (r["cells_M"] or 0)) + (16 - (r["cells_F"] or 0))
    r["unattributed_lower_bound"] = max(0, r["gap"] - miss)
    rows.append(r)
sc = pd.DataFrame(rows)
print(sc.to_string(index=False))

S["dataset"] = "PESEL 1681 national vs 1681woj (permanent registered residence), both 2026-01-20"
S["method"] = "RECON-v1: gap = national - sum of voivodeship cells; lower bound = sum max(0, gap - missing cells)"
S.to_csv(f"{out}/reconciliation_2026.csv", index=False)
bycls_out = bycls.reset_index().rename(columns={"cls": "suffix_class", "n": "national_entries",
                                                "woj_sum": "voiv_file_entries", "unattr_lo": "unattributed_lower_bound"})
bycls_out["dataset"] = S["dataset"].iloc[0]
bycls_out["method"] = "RECON-v1 by SUFFIX-v1 class (spelling only)"
bycls_out.to_csv(f"{out}/reconciliation_by_suffix_2026.csv", index=False)
sc["dataset"] = S["dataset"].iloc[0]
sc.to_csv(f"{out}/reconciliation_showcase_2026.csv", index=False)
allf[["sex", "form", "n", "woj_sum", "cells", "gap", "unattr_lo", "cls"]].to_parquet(f"{WORK}/recon_forms_2026.parquet")

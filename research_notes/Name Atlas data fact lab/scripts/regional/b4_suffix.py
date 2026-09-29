"""B4: spelling-pattern (suffix class) geography by voivodeship, 2026-01-20.

Dataset: PESEL 1681woj living persons, voivodeship of permanent registered residence, 2026-01-20, M and F rows.
Unit: entries (each file row's count), classified by the SPELLING of the registered form (morphology only).
Method SUFFIX-v1 (first matching rule wins):
  compound (contains '-' or ' ') | -DZKI/-DZKA | -CKI/-CKA | -SKI/-SKA | -CZYK/-CZAK | -UK (incl. -CZUK) |
  -ICZ (incl. -OWICZ/-EWICZ) | -AK (excl. -CZAK) | -EK | -EC | -IK/-YK (excl. -CZYK) | -KO | other
  share_v(c) = entries of class c in v / all entries listed for v ; LQ_v(c) = share_v(c) / share_all(c)
"""
import pandas as pd
from common import load_woj, load_nat, VOIV_ORDER, teryt, vname, ensure_out

METHOD = "SUFFIX-v1"
out = ensure_out()
RULES = [
    ("compound (hyphen/space)", lambda s: s.str.contains(r"[- ]", regex=True)),
    ("-DZKI/-DZKA", lambda s: s.str.endswith(("DZKI", "DZKA"))),
    ("-CKI/-CKA", lambda s: s.str.endswith(("CKI", "CKA"))),
    ("-SKI/-SKA", lambda s: s.str.endswith(("SKI", "SKA"))),
    ("-CZYK/-CZAK", lambda s: s.str.endswith(("CZYK", "CZAK"))),
    ("-UK/-CZUK", lambda s: s.str.endswith("UK")),
    ("-ICZ/-OWICZ/-EWICZ", lambda s: s.str.endswith("ICZ")),
    ("-AK", lambda s: s.str.endswith("AK")),
    ("-EK", lambda s: s.str.endswith("EK")),
    ("-EC", lambda s: s.str.endswith("EC")),
    ("-IK/-YK", lambda s: s.str.endswith(("IK", "YK"))),
    ("-KO", lambda s: s.str.endswith("KO")),
]
CLASSES = [r[0] for r in RULES] + ["other"]


def classify(forms):
    cls = pd.Series("other", index=forms.index)
    done = pd.Series(False, index=forms.index)
    for name, rule in RULES:
        hit = rule(forms) & ~done
        cls[hit] = name
        done |= hit
    return cls


def by_voiv(date):
    d = pd.concat([load_woj("M", date).assign(sex="M"), load_woj("F", date).assign(sex="F")], ignore_index=True)
    d["cls"] = classify(d["form"])
    return d


if __name__ == "__main__":
    d = by_voiv("2026-01-20")
    T_v = d.groupby("voiv")["n"].sum()
    tab = d.groupby(["voiv", "cls"])["n"].sum().unstack("cls").reindex(index=VOIV_ORDER, columns=CLASSES).fillna(0)
    types = d.groupby(["voiv", "cls"])["form"].nunique().unstack("cls").reindex(index=VOIV_ORDER, columns=CLASSES)
    share = tab.div(T_v.reindex(VOIV_ORDER), axis=0)
    nat_share = tab.sum() / tab.values.sum()
    lq = share.div(nat_share, axis=1)

    # national-file comparison (all living entries incl. those without a voivodeship)
    nat = pd.concat([load_nat("M"), load_nat("F")], ignore_index=True)
    nat["cls"] = classify(nat["form"])
    natfile_share = nat.groupby("cls")["n"].sum() / nat["n"].sum()

    rows = []
    for v in VOIV_ORDER:
        for c in CLASSES:
            rows.append({"teryt": teryt(v), "voivodeship": vname(v), "suffix_class": c,
                         "entries": int(tab.loc[v, c]), "distinct_forms_listed": int(types.loc[v, c]) if pd.notna(types.loc[v, c]) else 0,
                         "share_pct": round(100 * share.loc[v, c], 3),
                         "all_voiv_share_pct": round(100 * nat_share[c], 3), "lq": round(lq.loc[v, c], 3)})
    res = pd.DataFrame(rows)
    res["rank_lq_within_class"] = res.groupby("suffix_class")["lq"].rank(ascending=False, method="min").astype(int)
    res["dataset"] = "PESEL 1681woj living, voivodeship of permanent registered residence, 2026-01-20, M+F rows"
    res["method"] = METHOD + " (spelling of the registered form; first matching rule wins)"
    res.to_csv(f"{out}/suffix_by_voivodeship.csv", index=False)

    pd.set_option("display.width", 250)
    print("National share by class (voivodeship files vs national file, %):")
    print(pd.DataFrame({"voiv_files": (100 * nat_share).round(2),
                        "national_file": (100 * natfile_share.reindex(CLASSES)).round(2)}).to_string())
    print("\nShare % by voivodeship:")
    print((100 * share).round(1).rename(index=vname).to_string())
    print("\nLQ by voivodeship:")
    print(lq.round(2).rename(index=vname).to_string())
    print("\nTop-2 voivodeships per class (LQ):")
    for c in CLASSES:
        s = lq[c].sort_values(ascending=False)
        lo = lq[c].sort_values().index[0]
        print(f"  {c:26s} {vname(s.index[0])} {s.iloc[0]:.2f} ({100*share.loc[s.index[0], c]:.1f}%), "
              f"{vname(s.index[1])} {s.iloc[1]:.2f} ({100*share.loc[s.index[1], c]:.1f}%) | lowest {vname(lo)} "
              f"{lq.loc[lo, c]:.2f} ({100*share.loc[lo, c]:.1f}%) | max/min share ratio {share[c].max()/share[c].min():.1f}")
    # top forms inside the regional classes, to show what drives them
    for c in ("-AK", "-UK/-CZUK", "-ICZ/-OWICZ/-EWICZ", "-KO", "-EK", "-EC"):
        top = d[d.cls == c].groupby("form")["n"].sum().sort_values(ascending=False).head(8)
        print(f"  top forms {c}: " + ", ".join(f"{k} {v}" for k, v in top.items()))
    # which class is most over-represented in each voivodeship
    print("\nMost over-represented class per voivodeship (excluding 'other' and compound):")
    sub = lq.drop(columns=["other", "compound (hyphen/space)"])
    for v in VOIV_ORDER:
        c = sub.loc[v].idxmax()
        print(f"  {vname(v):20s} {c:22s} LQ {sub.loc[v, c]:.2f} share {100*share.loc[v, c]:.1f}%")
    # 2025 check of the ranking stability
    d25 = by_voiv("2025-02-24")
    tab25 = d25.groupby(["voiv", "cls"])["n"].sum().unstack("cls").reindex(index=VOIV_ORDER, columns=CLASSES).fillna(0)
    share25 = tab25.div(d25.groupby("voiv")["n"].sum().reindex(VOIV_ORDER), axis=0)
    print("\nmax |share 2026 - share 2025| (pp) per class:",
          (100 * (share - share25).abs().max()).round(3).to_dict())

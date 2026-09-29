"""A3 biggest movers 2019->2026 + suffix/spelling-class aggregates (living persons, dataset 1681).

Outputs (repo data/national/):
  movers_2019_2026.csv        top 25 per list type (abs/rel risers/fallers) for PAIRED units, M list, F list
  suffix_classes_by_year.csv  entries/share/distinct forms per spelling class, list and year
Neutral framing only: classes are spelling patterns, not origins. Causes = INSUFFICIENT_DATA.
"""
import csv
import os

import common as c

OUT = c.ensure_out()
MIN_EDITORIAL = 20   # rule 7
MIN_BASE_REL = 500   # minimum base-year entries for % lists
TOPN = 25

CLASSES = ["HYPHENATED", "SPACE_SEPARATED", "-SKI/-SKA", "-CKI/-CKA", "-DZKI/-DZKA",
           "-OWICZ/-EWICZ", "-ICZ (other)", "-CZYK", "-UK", "-ENKO", "-AK", "-EK", "OTHER",
           "PLACEHOLDER (not a surname)"]


def suffix_class(form: str) -> str:
    """SUFFIX-V1: first matching rule wins (order as in CLASSES).
    Placeholder values (BRAK DANYCH, BRAK NAZWISKA, '.', '-', NN, XXX) get their own class; before this fix
    'BRAK DANYCH'/'BRAK NAZWISKA' were counted as SPACE_SEPARATED and '-' as HYPHENATED."""
    if c.is_placeholder(form):
        return "PLACEHOLDER (not a surname)"
    if "-" in form:
        return "HYPHENATED"
    if " " in form:
        return "SPACE_SEPARATED"
    if form.endswith(("SKI", "SKA")):
        return "-SKI/-SKA"
    if form.endswith(("DZKI", "DZKA")):
        return "-DZKI/-DZKA"
    if form.endswith(("CKI", "CKA")):
        return "-CKI/-CKA"
    if form.endswith(("OWICZ", "EWICZ")):
        return "-OWICZ/-EWICZ"
    if form.endswith("ICZ"):
        return "-ICZ (other)"
    if form.endswith("CZYK"):
        return "-CZYK"
    if form.endswith("UK"):
        return "-UK"
    if form.endswith("ENKO"):
        return "-ENKO"
    if form.endswith("AK"):
        return "-AK"
    if form.endswith("EK"):
        return "-EK"
    return "OTHER"


def movers(t19: dict, t26: dict, excluded: set):
    both = [k for k in t26 if k in t19 and k not in excluded and not c.is_placeholder(k)]
    lists = {}
    ab = [k for k in both if t26[k] >= MIN_EDITORIAL and t19[k] >= MIN_EDITORIAL]
    lists["abs_riser"] = sorted(ab, key=lambda k: (-(t26[k] - t19[k]), k))[:TOPN]
    lists["abs_faller"] = sorted(ab, key=lambda k: ((t26[k] - t19[k]), k))[:TOPN]
    rel = [k for k in both if t19[k] >= MIN_BASE_REL]
    pct = {k: (t26[k] - t19[k]) / t19[k] for k in rel}
    lists["rel_riser"] = sorted(rel, key=lambda k: (-pct[k], k))[:TOPN]
    lists["rel_faller"] = sorted(rel, key=lambda k: (pct[k], k))[:TOPN]
    stats = {
        "eligible_abs": len(ab), "eligible_rel": len(rel),
        "rel_up": sum(1 for k in rel if pct[k] > 0), "rel_down": sum(1 for k in rel if pct[k] < 0),
        "rel_same": sum(1 for k in rel if pct[k] == 0),
    }
    return lists, stats


def main():
    rows = []
    # PAIRED units
    u19, u26 = c.paired("2019"), c.paired("2026")
    t19 = {k: v["total"] for k, v in u19.items()}
    t26 = {k: v["total"] for k, v in u26.items()}
    excl = set(c.conflict_keys("2019")) | set(c.conflict_keys("2026"))
    scopes = [("PAIRED", t19, t26, excl, "1681 M+F 2019-06-30 vs 2026-01-20, PAIR-V1 units (conflict-flagged units excluded)")]
    for s in "MF":
        scopes.append((f"{s}_LIST", c.living(s, "2019"), c.living(s, "2026"), set(),
                       f"1681 {s} list 2019-06-30 vs 2026-01-20, exact forms"))
    for scope, a, b, ex, desc in scopes:
        lists, stats = movers(a, b, ex)
        print(scope, stats)
        for lt, keys in lists.items():
            for i, k in enumerate(keys, 1):
                rows.append([scope, lt, i, k, a[k], b[k], b[k] - a[k],
                             f"{100 * (b[k] - a[k]) / a[k]:.2f}", suffix_class(k), desc])
    with open(os.path.join(OUT, "movers_2019_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["scope", "list_type", "position", "form_or_unit_key", "entries_2019", "entries_2026",
                    "abs_change", "pct_change", "spelling_class", "dataset_scope"])
        w.writerows(rows)
    for scope in ("PAIRED", "M_LIST", "F_LIST"):
        for lt in ("abs_riser", "abs_faller", "rel_riser", "rel_faller"):
            sel = [r for r in rows if r[0] == scope and r[1] == lt][:12]
            print(scope, lt, [(r[3], r[4], r[5], r[6], r[7]) for r in sel])

    # ---------------- suffix classes ----------------
    out = []
    for y in c.YEARS:
        per = {}
        for s in "MF":
            if (s, y) not in c.LIVING:
                continue
            d = c.living(s, y)
            tot = sum(d.values())
            agg = {cl: [0, 0] for cl in CLASSES}
            for form, n in d.items():
                cl = suffix_class(form)
                agg[cl][0] += n
                agg[cl][1] += 1
            per[s] = (agg, tot, len(d))
            for cl in CLASSES:
                out.append([y, c.ref_date(s, y), s, cl, agg[cl][0], f"{100 * agg[cl][0] / tot:.4f}", agg[cl][1],
                            f"{100 * agg[cl][1] / len(d):.4f}"])
        if "M" in per and "F" in per:
            tot = per["M"][1] + per["F"][1]
            for cl in CLASSES:
                e = per["M"][0][cl][0] + per["F"][0][cl][0]
                out.append([y, c.ref_date("M", y), "M+F", cl, e, f"{100 * e / tot:.4f}", "", ""])
    with open(os.path.join(OUT, "suffix_classes_by_year.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["year_label", "reference_date", "list", "spelling_class", "entries", "share_of_entries_pct",
                    "distinct_forms", "share_of_distinct_forms_pct"])
        w.writerows(out)
    # console summary 2019 vs 2026
    idx = {(r[0], r[2], r[3]): r for r in out}
    print("class | list | share2019 | share2026 | pp | entries2019 | entries2026 | forms2019 | forms2026")
    for lst in ("M+F", "M", "F"):
        for cl in CLASSES:
            a, b = idx[("2019", lst, cl)], idx[("2026", lst, cl)]
            print(cl, lst, a[5], b[5], f"{float(b[5]) - float(a[5]):+.3f}", a[4], b[4], a[6], b[6])
    # ski-family combined
    for y in ("2019", "2026"):
        e = sum(idx[(y, "M+F", cl)][4] for cl in ("-SKI/-SKA", "-CKI/-CKA", "-DZKI/-DZKA"))
        tot = sum(idx[(y, "M+F", cl)][4] for cl in CLASSES)
        print("ski-family", y, e, tot, f"{100 * e / tot:.3f}%")


if __name__ == "__main__":
    main()

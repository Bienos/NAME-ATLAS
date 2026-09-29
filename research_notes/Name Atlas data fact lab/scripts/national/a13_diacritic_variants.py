"""Data-quality probe: Polish surnames with diacritics vs their diacritic-stripped spelling (e.g. NIEDŹWIECKI vs
NIEDZWIECKI) at 2025-01-22 (both sexes, living and including-deceased lists). Output: diacritic_variants_2025.csv"""
import csv
import os

import common as c

FOLD = str.maketrans("ĄĆĘŁŃÓŚŹŻ", "ACELNOSZZ")
PL = set("ĄĆĘŁŃÓŚŹŻ")


def main():
    y = "2025"
    rows, agg = [], {"diacritic": [0, 0], "stripped": [0, 0]}
    for s in "MF":
        liv, inc = c.living(s, y), c.deceased_incl(s, y)
        for k, n_inc in inc.items():
            if not (set(k) & PL) or " " in k or "-" in k:
                continue
            v = k.translate(FOLD)
            if v == k or v not in inc or k not in liv or v not in liv:
                continue
            if n_inc < 100 or inc[v] < 20:
                continue
            agg["diacritic"][0] += liv[k]; agg["diacritic"][1] += n_inc
            agg["stripped"][0] += liv[v]; agg["stripped"][1] += inc[v]
            rows.append([s, k, liv[k], n_inc, f"{100 * (n_inc - liv[k]) / n_inc:.1f}", v, liv[v], inc[v],
                         f"{100 * (inc[v] - liv[v]) / inc[v]:.1f}"])
    rows.sort(key=lambda r: -r[3])
    older = sum(1 for r in rows if float(r[8]) > float(r[4]))
    out = os.path.join(c.ensure_out(), "diacritic_variants_2025.csv")
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["list", "diacritic_form", "living", "incl_deceased", "ageing_index_pct", "stripped_form", "stripped_living",
                    "stripped_incl_deceased", "stripped_ageing_index_pct"])
        for key, (l_, i_) in agg.items():
            w.writerow(["ALL PAIRS", key, l_, i_, f"{100 * (i_ - l_) / i_:.2f}", "", "", "", ""])
        w.writerow(["PAIRS", len(rows), "", "", "", f"stripped spelling has the higher index in {older}", "", "", ""])
        w.writerows(rows[:40])
    print(len(rows), "pairs; stripped older in", older, agg,
          {k: f"{100 * (v[1] - v[0]) / v[1]:.2f}" for k, v in agg.items()})
    for r in rows[:12]:
        print(r)


if __name__ == "__main__":
    main()

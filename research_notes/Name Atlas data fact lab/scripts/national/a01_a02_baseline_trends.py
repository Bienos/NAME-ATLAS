"""A1 baseline surname card + A2 per-surname trend 2019->2026 (living persons, dataset 1681).

Outputs (repo data/national/):
  yearly_totals.csv          national entry sums and distinct forms per list and date
  top_units_2026.csv         top 200 PAIR-V1 units at 2026-01-20 with rank/share/1-in-X and 2019 comparison
  showcase_yearly_series.csv chart-ready yearly series for the showcase surnames
  topn_direction_2019_2026.csv how many of the top 10/100/1000 forms of 2019 (and of 2020) declined or rose by 2026,
                             per list (M, F) and for PAIR-V1 units (internal)
Part file (scratch parts/): showcase_a01_a02.csv -> merged by z_assemble_showcase.py
"""
import csv
import os
from datetime import date

import common as c

PARTS = c.PARTS
os.makedirs(PARTS, exist_ok=True)
OUT = c.ensure_out()

RID = {k: v[1].split("_r")[1].replace(".csv", "") for k, v in c.LIVING.items()}


def src(year, sexes="MF"):
    return "1681 " + "+".join(f"r{RID[(s, year)]}" for s in sexes if (s, year) in RID)


def unit_totals(year):
    return {k: v["total"] for k, v in c.paired(year).items()}


def main():
    # ---------------- yearly totals ----------------
    rows = []
    for y in c.YEARS:
        for s in "MF":
            if (s, y) in c.LIVING:
                d = c.living(s, y)
                rows.append([y, s, c.ref_date(s, y), os.path.basename(c.LIVING[(s, y)][1]),
                             sum(d.values()), len(d), max(d.values()),
                             "June reference date" if y == "2019" else ""])
            else:
                rows.append([y, s, "2022-01-27", c.F2022_DUPLICATE, "", "", "",
                             "EXCLUDED: byte-identical copy of the 2021-02-02 female file"])
        if y in c.PAIRED_YEARS:
            m, f = c.living("M", y), c.living("F", y)
            u = c.paired(y)
            rows.append([y, "M+F", f"{c.ref_date('M', y)} / {c.ref_date('F', y)}", "both",
                         sum(m.values()) + sum(f.values()), len(u), "",
                         "distinct_forms = PAIR-V1 units" + ("; M and F dates differ by 1 day" if c.ref_date('M', y) != c.ref_date('F', y) else "")])
    with open(os.path.join(OUT, "yearly_totals.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["year_label", "list", "reference_date", "file", "entries_sum", "distinct_forms",
                    "max_count", "note"])
        w.writerows(rows)

    # ---------------- ranks per year ----------------
    tot = {y: unit_totals(y) for y in c.PAIRED_YEARS}
    rank = {y: c.competition_rank(tot[y]) for y in c.PAIRED_YEARS}
    denom = {y: sum(tot[y].values()) for y in c.PAIRED_YEARS}
    sexrank = {(s, y): c.competition_rank(c.living(s, y)) for (s, y) in c.LIVING}
    sexden = {(s, y): sum(c.living(s, y).values()) for (s, y) in c.LIVING}
    conf26 = c.conflict_keys("2026")

    # ---------------- top units 2026 ----------------
    u26 = c.paired("2026")
    top = sorted(tot["2026"], key=lambda k: (-tot["2026"][k], k))[:200]
    with open(os.path.join(OUT, "top_units_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["rank_2026", "unit_key", "feminine_form", "M_entries", "F_entries",
                    "other_form_entries", "paired_total", "share_pct", "one_in_x",
                    "total_2019", "rank_2019", "abs_change", "pct_change", "pair_conflict_flag"])
        for k in top:
            v = u26[k]
            t19 = tot["2019"].get(k)
            w.writerow([rank["2026"][k], k, c.feminine_of(k), v["M"], v["F"],
                        v["M_other"] + v["F_other"], v["total"],
                        f"{100 * v['total'] / denom['2026']:.4f}", round(denom["2026"] / v["total"]),
                        t19 if t19 is not None else "", rank["2019"].get(k, ""),
                        (v["total"] - t19) if t19 else "",
                        f"{100 * (v['total'] - t19) / t19:.2f}" if t19 else "",
                        "Y" if k in conf26 else ""])

    # ---------------- top-100 / top-1000 decline counts ----------------
    t19, t26 = tot["2019"], tot["2026"]
    summary = []
    for n in (10, 100, 1000):
        top19 = sorted(t19, key=lambda k: (-t19[k], k))[:n]
        dec = [k for k in top19 if t26.get(k, 0) < t19[k]]
        inc = [k for k in top19 if t26.get(k, 0) > t19[k]]
        summary.append((n, len(dec), len(inc), [(k, t19[k], t26.get(k)) for k in inc][:15]))
    print("TOP-N of 2019 (PAIR-V1): n, declined, increased, increased examples")
    for s in summary:
        print(" ", s)
    # same question per list (the user-facing form) and from the January 2020 baseline as well
    tdir = []
    for base in ("2019", "2020"):
        scopes = [("M list", c.living("M", base), c.living("M", "2026")),
                  ("F list", c.living("F", base), c.living("F", "2026")),
                  ("PAIRED (internal)", tot[base], t26)]
        for scope, a, b in scopes:
            a = {k: v for k, v in a.items() if not c.is_placeholder(k)}
            for n in (10, 100, 1000):
                topa = sorted(a, key=lambda k: (-a[k], k))[:n]
                dec = [k for k in topa if b.get(k, 0) < a[k]]
                inc = [k for k in topa if b.get(k, 0) > a[k]]
                same = [k for k in topa if b.get(k, 0) == a[k]]
                tdir.append([f"{base}->2026", scope, n, len(dec), len(inc), len(same),
                             "; ".join(f"{k}={a[k]}->{b.get(k, '<2 or absent')}" for k in inc[:30])])
    with open(os.path.join(OUT, "topn_direction_2019_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["period", "list", "top_n_of_base_year", "declined", "increased", "unchanged", "increased_forms"])
        w.writerows(tdir)
    for r in tdir:
        print("TOPN", r[:6], r[6][:200])
    d19, d26 = date(2019, 6, 30), date(2026, 1, 20)
    print("interval 2019-06-30 -> 2026-01-20 days:", (d26 - d19).days, "years:", round((d26 - d19).days / 365.25, 3))
    print("national sums:", {y: denom[y] for y in c.PAIRED_YEARS})
    print("M sums:", {y: sexden[("M", y)] for y in c.YEARS})
    print("F sums:", {y: sexden[("F", y)] for y in c.YEARS if ("F", y) in sexden})

    # ---------------- showcase ----------------
    part, series = [], []

    def add(sc, fact, metric, value, scope, refdate, source, method, conf):
        part.append([sc, fact, metric, value, scope, refdate, source, method, conf])

    for key, label in c.SHOWCASE:
        for y in c.YEARS:
            m_y = c.living("M", y)
            f_y = c.living("F", y) if ("F", y) in c.LIVING else None
            if key in c.INVARIANT_OVERRIDE:
                mform, fform = key, key
            else:
                mform, fform = key, c.feminine_of(key)
            mv = m_y.get(mform)
            fv = f_y.get(fform) if f_y is not None else None
            if y in c.PAIRED_YEARS:
                if key in c.INVARIANT_OVERRIDE:
                    pt = (mv or 0) + (fv or 0)
                    # position among PAIR-V1 units, with the colliding unit removed
                    others = [t for k2, t in tot[y].items() if k2 != c.pair_key(key)]
                    prank = 1 + sum(1 for t in others if t > pt)
                else:
                    uv = c.paired(y).get(key)
                    pt = uv["total"] if uv else None
                    prank = rank[y].get(key)
                share = 100 * pt / denom[y] if pt else None
            else:
                pt = prank = share = None
            series.append([label, y, c.ref_date("M", y), c.ref_date("F", y) if ("F", y) in c.LIVING else "n/a (2022 female file is a copy of 2021)",
                           mv if mv is not None else "<2 or absent",
                           (fv if fv is not None else "<2 or absent") if f_y is not None else "n/a",
                           pt if pt is not None else "n/a", prank if prank is not None else "n/a",
                           f"{share:.4f}" if share else "n/a",
                           sexrank[("M", y)].get(mform, ""),
                           sexrank[("F", y)].get(fform, "") if f_y is not None else "n/a"])
        # A1 card 2026
        y = "2026"
        s_last = series[-1]
        mv, fv, pt, prank = s_last[4], s_last[5], s_last[6], s_last[7]
        rd = "2026-01-20"
        add(label, "A1", "entries_M_list", mv, f"M list, form {key}", rd, src(y, "M"), "raw Liczba", "VERIFIED")
        add(label, "A1", "entries_F_list", fv, f"F list, form {key if key in c.INVARIANT_OVERRIDE else c.feminine_of(key)}", rd, src(y, "F"), "raw Liczba", "VERIFIED")
        if key not in c.INVARIANT_OVERRIDE:
            uv = c.paired(y)[key]
            add(label, "A1", "other_form_entries", uv["M_other"] + uv["F_other"],
                "F-list entries written in the masculine form + M-list entries in the feminine form (not in paired total headline)",
                rd, src(y), "PAIR-V1", "VERIFIED")
        add(label, "A1", "paired_total", pt, "M+F lists", rd, src(y),
            "PAIR-V1 (all forms mapping to the key)" if key not in c.INVARIANT_OVERRIDE else "invariant override: same form in both lists", "VERIFIED (arithmetic on file values); pairing = method")
        add(label, "A1", "rank_paired", prank, "among all PAIR-V1 units", rd, src(y), "RANK-V1 (1224) on paired totals" + (" ; position with colliding KRASKI unit removed" if key in c.INVARIANT_OVERRIDE else ""), "LIKELY (derived; depends on PAIR-V1)")
        add(label, "A1", "share_of_all_entries_pct", f"{100 * pt / denom[y]:.4f}", f"denominator {denom[y]} = sum of both 2026 lists", rd, src(y), "SHARE-V1", "LIKELY (derived)")
        add(label, "A1", "one_in_x_entries", round(denom[y] / pt), f"denominator {denom[y]}", rd, src(y), "ONEIN-V1 (rounded)", "LIKELY (derived)")
        mform = key
        fform = key if key in c.INVARIANT_OVERRIDE else c.feminine_of(key)
        add(label, "A1", "rank_in_M_list", sexrank[("M", y)].get(mform), f"M list, form {mform}", rd, src(y, "M"), "RANK-V1 within list", "VERIFIED (ordering of file values)")
        add(label, "A1", "rank_in_F_list", sexrank[("F", y)].get(fform), f"F list, form {fform}", rd, src(y, "F"), "RANK-V1 within list", "VERIFIED (ordering of file values)")
        # sex-specific share and 1-in-X (SHARE-V1 / ONEIN-V1 with the one-list denominator): the user-facing form
        for s, form, val in (("M", mform, mv), ("F", fform, fv)):
            if isinstance(val, int):
                add(label, "A1", f"share_of_{s}_list_pct", f"{100 * val / sexden[(s, y)]:.4f}",
                    f"{s} list, form {form}; denominator {sexden[(s, y)]} = all published entries in the {s} list",
                    rd, src(y, s), "SHARE-V1 (sex-specific)", "LIKELY (derived)")
                add(label, "A1", f"one_in_x_{s}_list", round(sexden[(s, y)] / val),
                    f"{s} list, form {form}; denominator {sexden[(s, y)]}", rd, src(y, s), "ONEIN-V1 (sex-specific, rounded)",
                    "LIKELY (derived)")
        # A2 trend
        first = next(r for r in series if r[0] == label and r[1] == "2019")
        last = s_last
        for idx, nm, scope in ((4, "M", "M list"), (5, "F", "F list"), (6, "paired", "M+F lists")):
            a, b = first[idx], last[idx]
            if isinstance(a, int) and isinstance(b, int):
                add(label, "A2", f"change_2019_2026_abs_{nm}", b - a, scope, "2019-06-30 -> 2026-01-20", "1681 2019 & 2026 files", "difference of raw/paired values", "VERIFIED (arithmetic)")
                add(label, "A2", f"change_2019_2026_pct_{nm}", f"{100 * (b - a) / a:.2f}", scope, "2019-06-30 -> 2026-01-20", "1681 2019 & 2026 files", "(b-a)/a", "VERIFIED (arithmetic)")
        if isinstance(first[7], int) and isinstance(last[7], int):
            add(label, "A2", "rank_paired_2019", first[7], "PAIR-V1 units", "2019-06-30", src("2019"), "RANK-V1", "LIKELY (derived)")
            add(label, "A2", "rank_change_2019_2026", first[7] - last[7], "positive = moved up", "2019-06-30 -> 2026-01-20", "1681", "RANK-V1 difference", "LIKELY (derived)")
        prev = next(r for r in series if r[0] == label and r[1] == "2025")
        if isinstance(prev[6], int) and isinstance(last[6], int):
            add(label, "A2", "change_2025_2026_pct_paired", f"{100 * (last[6] - prev[6]) / prev[6]:.2f}", "M+F lists", "2025-01-22 -> 2026-01-20", src("2025") + " / " + src("2026"), "(b-a)/a", "VERIFIED (arithmetic)")
        a, b = first[8], last[8]
        if a != "n/a" and b != "n/a":
            add(label, "A2", "share_change_2019_2026_pp", f"{float(b) - float(a):.4f}", "share of all entries, percentage points", "2019-06-30 -> 2026-01-20", "1681", "SHARE-V1 difference", "LIKELY (derived)")

    with open(os.path.join(OUT, "showcase_yearly_series.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["showcase", "year_label", "ref_date_M", "ref_date_F", "M_entries", "F_entries",
                    "paired_total", "rank_paired", "share_pct", "rank_in_M_list", "rank_in_F_list"])
        w.writerows(series)
    with open(os.path.join(PARTS, "showcase_a01_a02.csv"), "w", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerows(part)
    for r in series:
        if r[1] in ("2019", "2025", "2026"):
            print(r)


if __name__ == "__main__":
    main()

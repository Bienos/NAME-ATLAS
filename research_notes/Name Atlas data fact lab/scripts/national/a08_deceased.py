"""A8 living (dataset 1681) vs including-deceased (dataset 568) at identical reference dates.

recorded_deceased(form) = entries in the including-deceased list - entries in the living list (same sex, same date)
ageing index (AGE-V1)   = recorded_deceased / entries in the including-deceased list
Dates with both lists: 2024-01-19 (M, F), 2025-01-22 (M, F), 2026-01-20 (F only).

Outputs (repo data/national/):
  deceased_national.csv       national sums, differences, consistency checks per sex/date
  deceased_index_extremes.csv highest/lowest ageing index (>= 1,000 entries incl. deceased), per sex/date and PAIR-V1 2025
  deceased_consistency_checks.csv  year-on-year checks: forms whose (incl - living) difference FELL between dates
                              (should not happen if the difference only accumulated deceased entries)
Part file: parts/showcase_a08.csv
"""
import csv
import os

import common as c

PARTS = c.PARTS
os.makedirs(PARTS, exist_ok=True)
OUT = c.ensure_out()
MIN_INCL = 1000
TOPN = 20


def compare(living: dict, incl: dict):
    rec = {}
    neg, missing = [], []
    for k, n_incl in incl.items():
        n_liv = living.get(k)
        if n_liv is None:
            rec[k] = (n_incl, None, None)  # living <2 or absent: deceased >= n_incl - 1
        else:
            d = n_incl - n_liv
            rec[k] = (n_incl, n_liv, d)
            if d < 0:
                neg.append((k, n_incl, n_liv))
    for k, n in living.items():
        if k not in incl:
            missing.append((k, n))
    return rec, neg, missing


def paired_from(dm: dict, df: dict):
    u = {}
    for d in (dm, df):
        for k, n in d.items():
            key = c.pair_key(k)
            u[key] = u.get(key, 0) + n
    return u


def main():
    nat, ext, part = [], [], []
    per = {}
    for (s, y), (rd, fn) in sorted(c.DECEASED_INCL.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        liv, inc = c.living(s, y), c.deceased_incl(s, y)
        assert c.ref_date(s, y) == rd, (s, y)
        rec, neg, missing = compare(liv, inc)
        per[(s, y)] = rec
        sl, si = sum(liv.values()), sum(inc.values())
        only_incl = [k for k, v in rec.items() if v[1] is None]
        nat.append([rd, s, os.path.basename(c.LIVING[(s, y)][1]), fn, sl, si, si - sl, f"{100 * (si - sl) / si:.3f}",
                    len(liv), len(inc), len(only_incl), sum(inc[k] for k in only_incl), len(neg), len(missing),
                    "; ".join(f"{k}:{a}<{b}" for k, a, b in neg[:5]), "; ".join(f"{k}:{n}" for k, n in missing[:5])])
        # extremes by sex/date
        elig = {k: v for k, v in rec.items() if v[0] >= MIN_INCL and v[1] is not None and not c.is_placeholder(k)}
        idx = {k: v[2] / v[0] for k, v in elig.items()}
        for lab, keys in (("highest_index", sorted(idx, key=lambda k: (-idx[k], k))[:TOPN]),
                          ("lowest_index", sorted(idx, key=lambda k: (idx[k], k))[:TOPN])):
            for i, k in enumerate(keys, 1):
                ext.append([rd, s, lab, i, k, rec[k][0], rec[k][1], rec[k][2], f"{100 * idx[k]:.2f}"])
        print(rd, s, "eligible", len(elig), "median idx", sorted(idx.values())[len(idx) // 2] if idx else None)
    # PAIR-V1 units for the dates with both sexes
    for y in ("2024", "2025"):
        lm, lf = c.living("M", y), c.living("F", y)
        im, if_ = c.deceased_incl("M", y), c.deceased_incl("F", y)
        ul, ui = paired_from(lm, lf), paired_from(im, if_)
        conf = c.conflict_keys(y)
        elig = {k: (ui[k], ul[k], ui[k] - ul[k]) for k in ui if ui[k] >= MIN_INCL and k in ul
                and not c.is_placeholder(k) and k not in conf}
        idx = {k: v[2] / v[0] for k, v in elig.items()}
        rd = c.ref_date("M", y)
        for lab, keys in (("highest_index", sorted(idx, key=lambda k: (-idx[k], k))[:TOPN]),
                          ("lowest_index", sorted(idx, key=lambda k: (idx[k], k))[:TOPN])):
            for i, k in enumerate(keys, 1):
                ext.append([rd, "PAIRED", lab, i, k, elig[k][0], elig[k][1], elig[k][2], f"{100 * idx[k]:.2f}"])
        vals = sorted(idx.values())
        tot_i, tot_l = sum(ui.values()), sum(ul.values())
        nat.append([rd, "M+F (PAIR-V1)", "both living lists", "both incl. lists", tot_l, tot_i, tot_i - tot_l,
                    f"{100 * (tot_i - tot_l) / tot_i:.3f}", len(ul), len(ui), "", "", "", "",
                    f"units>=1000 incl: {len(vals)}; median index {100 * vals[len(vals) // 2]:.2f}%; "
                    f"index>=50%: {sum(1 for v in vals if v >= 0.5)}; index<10%: {sum(1 for v in vals if v < 0.1)}", ""])
        # showcase (PAIR-V1 or invariant override)
        for key, label in c.SHOWCASE:
            if key in c.INVARIANT_OVERRIDE:
                i_n = im.get(key, 0) + if_.get(key, 0)
                l_n = lm.get(key, 0) + lf.get(key, 0)
                meth = "invariant override (same form, both lists)"
            else:
                i_n, l_n = ui.get(key), ul.get(key)
                meth = "PAIR-V1 units"
            if i_n and l_n:
                part.append([label, "A8", f"recorded_deceased_entries_{y}", i_n - l_n, "M+F lists", rd,
                             f"568 + 1681 {y} M/F", "incl.-deceased minus living, " + meth, "VERIFIED (arithmetic on file values)"])
                part.append([label, "A8", f"ageing_index_pct_{y}", f"{100 * (i_n - l_n) / i_n:.2f}", "M+F lists", rd,
                             f"568 + 1681 {y} M/F", "AGE-V1 = (incl-living)/incl, " + meth, "LIKELY (derived; register time-depth unverified)"])
                part.append([label, "A8", f"entries_incl_deceased_{y}", i_n, "M+F lists", rd,
                             f"568 {y} M/F", meth, "VERIFIED"])
    # per-sex showcase values (the user-facing form: M list and F list side by side, never summed)
    for y in ("2024", "2025"):
        rd = c.ref_date("M", y)
        for key, label in c.SHOWCASE:
            for s in "MF":
                form = key if (s == "M" or key in c.INVARIANT_OVERRIDE) else c.feminine_of(key)
                liv, inc = c.living(s, y).get(form), c.deceased_incl(s, y).get(form)
                if liv and inc:
                    src_ = f"568 r{c.DECEASED_INCL[(s, y)][1].split('_r')[1][:-4]} + 1681 r{c.LIVING[(s, y)][1].split('_r')[1][:-4]}"
                    part.append([label, "A8", f"recorded_deceased_entries_{s}_{y}", inc - liv, f"{s} list, form {form}", rd,
                                 src_, "incl.-deceased minus living, same form, same list", "VERIFIED (arithmetic on file values)"])
                    part.append([label, "A8", f"ageing_index_pct_{s}_{y}", f"{100 * (inc - liv) / inc:.2f}", f"{s} list, form {form}",
                                 rd, src_, "AGE-V1", "LIKELY (derived; register time-depth unverified)"])
                    part.append([label, "A8", f"entries_incl_deceased_{s}_{y}", inc, f"{s} list, form {form}", rd, src_,
                                 "raw Liczba of the including-deceased list", "VERIFIED"])
    # year-on-year consistency: the recorded-deceased difference of a form should not fall between two dates
    cons = []
    for s, y0, y1 in (("M", "2024", "2025"), ("F", "2024", "2025"), ("F", "2025", "2026")):
        d0 = {k: v[2] for k, v in per[(s, y0)].items() if v[2] is not None}
        d1 = {k: v[2] for k, v in per[(s, y1)].items() if v[2] is not None}
        common_ = [k for k in d0 if k in d1 and not c.is_placeholder(k)]
        fell = sorted(((k, d0[k], d1[k]) for k in common_ if d1[k] < d0[k]), key=lambda t: t[2] - t[1])
        rose = sum(1 for k in common_ if d1[k] > d0[k])
        n_tot0 = sum(v[0] for v in per[(s, y0)].values()) - sum(c.living(s, y0).values())
        n_tot1 = sum(v[0] for v in per[(s, y1)].values()) - sum(c.living(s, y1).values())
        big = [t for t in fell if t[1] >= 20]
        cons.append([s, f"{c.ref_date(s, y0)} -> {c.ref_date(s, y1)}", len(common_), rose, len(fell),
                     sum(t[1] - t[2] for t in fell), len(big), n_tot1 - n_tot0,
                     "; ".join(f"{k}:{a}->{b}" for k, a, b in fell[:8])])
    with open(os.path.join(OUT, "deceased_consistency_checks.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["list", "period", "forms_in_both_lists_at_both_dates", "forms_difference_rose",
                    "forms_difference_fell", "sum_of_falls_entries", "forms_fell_with_base_difference_ge20",
                    "national_change_in_difference_entries", "largest_falls_examples"])
        w.writerows(cons)
    for r in cons:
        print("CONS", r)
    # F 2026 showcase
    lf26, if26 = c.living("F", "2026"), c.deceased_incl("F", "2026")
    for key, label in c.SHOWCASE:
        ff = key if key in c.INVARIANT_OVERRIDE else c.feminine_of(key)
        if ff in lf26 and ff in if26:
            part.append([label, "A8", "ageing_index_pct_F_2026", f"{100 * (if26[ff] - lf26[ff]) / if26[ff]:.2f}",
                         f"F list, form {ff}", "2026-01-20", "568 r1148815 + 1681 r1148811", "AGE-V1", "LIKELY (derived)"])
    with open(os.path.join(OUT, "deceased_national.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["reference_date", "list", "living_file", "incl_deceased_file", "living_entries", "incl_entries",
                    "difference_recorded_deceased", "difference_pct_of_incl", "living_forms", "incl_forms",
                    "forms_in_incl_only", "entries_of_incl_only_forms", "negative_differences", "living_forms_missing_from_incl",
                    "negative_examples_or_note", "missing_examples"])
        w.writerows(nat)
    with open(os.path.join(OUT, "deceased_index_extremes.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["reference_date", "list", "extreme", "position", "form_or_unit_key", "entries_incl_deceased",
                    "entries_living", "recorded_deceased", "ageing_index_pct"])
        w.writerows(ext)
    with open(os.path.join(PARTS, "showcase_a08.csv"), "w", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerows(part)
    for r in nat:
        print(r)
    for r in ext:
        if r[3] <= 8:
            print(r)
    for r in part:
        print(r)


if __name__ == "__main__":
    main()

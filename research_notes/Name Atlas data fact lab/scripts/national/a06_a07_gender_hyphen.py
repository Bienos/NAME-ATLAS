"""A6 gender asymmetry (female list vs male list) + A7 hyphenated (double-barrelled) forms.

The two national lists are the publisher's male/female partition; the basis (bearer's sex vs form)
is not stated by the publisher (TASK-004 U-1). Ratios below compare the two published lists only.
Causes of any asymmetry = INSUFFICIENT_DATA.

Outputs (repo data/national/):
  gender_national_by_year.csv   F/M entry sums and ratios per year, by unit type
  gender_ratio_outliers_2026.csv highest/lowest F/M ratios (units with >= 1,000 entries), by type
  crossform_by_year.csv         female-list entries in -SKI/-CKI/-DZKI form, male-list entries in -SKA/-CKA/-DZKA form
  hyphenated_by_year.csv        hyphenated forms and entries per list and year
  hyphenated_top_2026.csv       top hyphenated forms (>= 20 entries) and top components, 2026
"""
import csv
import os
import statistics
from collections import Counter

import common as c

OUT = c.ensure_out()
MIN_TOTAL = 1000
TOPN = 15


VOWELS = set("AĄEĘIOÓUY")


def gap_candidates(f):
    """Masculine-list partners a female-list form ending in -A could have under patterns v1 does NOT pair.
    Returns [(pattern, masculine_form)]. -SKA/-CKA/-DZKA forms are excluded (paired by v1)."""
    out = []
    if not f.endswith("A") or f.endswith(("SKA", "CKA", "DZKA")) or len(f) < 4:
        return out
    out.append(("adjectival -Y/-A (e.g. KONIECZNY/KONIECZNA)", f[:-1] + "Y"))
    out.append(("adjectival -I/-A, non -SKI (e.g. DZIKI/DZIKA)", f[:-1] + "I"))
    if f.endswith(("OVA", "EVA")):
        out.append(("-OV/-EV + A (e.g. IVANOV/IVANOVA)", f[:-1]))
    if f.endswith(("INA", "YNA")):
        out.append(("-IN/-YN + A (AMBIGUOUS: many -IN/-YN surnames are invariant, e.g. RUSIN)", f[:-1]))
    out.append(("-YI + A (e.g. CHORNYI/CHORNA)", f[:-1] + "YI"))
    return out


def consonant_final_invariant(k):
    """Invariant unit whose last letter is a consonant and which is not an -OV/-EV/-IN/-YN form."""
    return k[-1] not in VOWELS and not k.endswith(("OV", "EV", "IN", "YN"))


def unit_type(k):
    if "-" in k or " " in k:
        return "multi_part"
    if k.endswith(("SKI", "CKI", "DZKI")):
        return "ski_pair"
    return "invariant"


def main():
    # ---------------- A6 national ----------------
    rows = []
    for y in c.PAIRED_YEARS:
        m, f = c.living("M", y), c.living("F", y)
        u = c.paired(y)
        conf = c.conflict_keys(y)
        agg = {}
        for k, v in u.items():
            if c.is_placeholder(k):
                continue
            t = unit_type(k)
            if t == "ski_pair" and k in conf:
                t = "ski_pair_conflict"
            a = agg.setdefault(t, [0, 0, 0])
            a[0] += v["M"]
            a[1] += v["F"]
            a[2] += 1
        rows.append([y, c.ref_date("M", y), c.ref_date("F", y), "ALL (list sums)", sum(m.values()), sum(f.values()),
                     f"{sum(f.values()) / sum(m.values()):.4f}", len(m), len(f)])
        for t in ("ski_pair", "ski_pair_conflict", "invariant", "multi_part"):
            a = agg.get(t, [0, 0, 0])
            rows.append([y, c.ref_date("M", y), c.ref_date("F", y), t, a[0], a[1],
                         f"{a[1] / a[0]:.4f}" if a[0] else "", a[2], ""])
    with open(os.path.join(OUT, "gender_national_by_year.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["year_label", "ref_date_M", "ref_date_F", "unit_type", "M_entries", "F_entries", "F_per_M",
                    "units_or_M_forms", "F_forms"])
        w.writerows(rows)
    for r in rows:
        print(r)

    # ---------------- A6 pairing gaps (patterns v1 does not pair) ----------------
    y = "2026"
    m26, f26 = c.living("M", y), c.living("F", y)
    gap = {}
    for ff, fn in f26.items():
        if " " in ff or "-" in ff or m26.get(ff, 0) >= 20:
            continue  # multi-part, or the -A form is itself in use in the male list (invariant)
        cands = [(pat, mf, m26[mf]) for pat, mf in gap_candidates(ff) if mf in m26]
        if not cands:
            continue
        pat, mf, mn = max(cands, key=lambda t: t[2])  # best partner = largest male-list count
        gap.setdefault(pat, []).append((mf, ff, mn, fn, f26.get(mf, 0)))
    # male-list -SKYI-type spellings whose -SKA feminine is already claimed by a v1 -SKI unit
    sk = []
    for mf, mn in m26.items():
        if " " in mf or "-" in mf:
            continue
        for suf in ("SKYI", "SKYY", "SKII", "SKIY", "CKYI", "CKYY", "ZKYI"):
            if mf.endswith(suf):
                fem = mf[:-2] + "A"
                if fem in f26:
                    sk.append((mf, fem, mn, f26[fem], f26.get(mf, 0)))
                break
    gap["male-list -SKYI/-SKYY/-SKII/-SKIY spellings whose -SKA form v1 pairs with -SKI"] = sk
    gap_rows = []
    for pat, pairs in gap.items():
        pairs.sort(key=lambda p: -(p[2] + p[3]))
        fem_distinct = {p[1]: p[3] for p in pairs}  # a feminine form may be shared by several spellings
        gap_rows.append([pat, len(pairs), sum(p[2] for p in pairs), sum(fem_distinct.values()),
                         sum(p[4] for p in pairs),
                         "; ".join(f"{p[0]}={p[2]}M/{p[1]}={p[3]}F" for p in pairs[:6])])
    with open(os.path.join(OUT, "pairing_gaps_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["pattern_not_paired_in_v1", "candidate_pairs", "M_entries_masc_form", "F_entries_fem_form",
                    "F_entries_in_masc_form", "top_examples"])
        w.writerows(gap_rows)
    for r in gap_rows:
        print("GAP", r)
    skyi_keys = {k for k in m26 if k.endswith(("SKYI", "SKYY", "SKII", "SKIY", "CKYI", "ZKYI"))}
    skyi_as_ski = {k[:-2] + "I" for k in skyi_keys}  # LEVYTSKYI -> LEVYTSKI (PAIR-V1 key of LEVYTSKA)

    # ---------------- A6 outliers 2026 ----------------
    u = c.paired(y)
    conf = c.conflict_keys(y)
    out = []
    stats = {}
    for t in ("ski_pair", "invariant", "invariant_consonant_final"):
        base_t = "invariant" if t.startswith("invariant") else t
        cand = {k: v for k, v in u.items()
                if unit_type(k) == base_t and k not in conf and not c.is_placeholder(k)
                and v["M_pub"] and v["F_pub"] and (v["M"] + v["F"]) >= MIN_TOTAL
                and not (t == "ski_pair" and k in skyi_as_ski)
                and not (t == "invariant_consonant_final" and not consonant_final_invariant(k))}
        ratio = {k: v["F"] / v["M"] for k, v in cand.items()}
        vals = sorted(ratio.values())
        stats[t] = dict(n=len(vals), median=statistics.median(vals),
                        f_gt_m=sum(1 for x in vals if x > 1), f_lt_m=sum(1 for x in vals if x < 1),
                        within_10pct=sum(1 for x in vals if 0.9 <= x <= 1.1),
                        pooled=sum(v["F"] for v in cand.values()) / sum(v["M"] for v in cand.values()))
        hi = sorted(cand, key=lambda k: (-ratio[k], k))[:TOPN]
        lo = sorted(cand, key=lambda k: (ratio[k], k))[:TOPN]
        for lab, keys in (("highest_F_per_M", hi), ("lowest_F_per_M", lo)):
            for i, k in enumerate(keys, 1):
                out.append([t, lab, i, k, c.feminine_of(k) if t == "ski_pair" else k, u[k]["M"], u[k]["F"],
                            f"{ratio[k]:.3f}"])
        stats[t]["hist"] = {b: sum(1 for x in vals if lo_ <= x < hi_) for b, lo_, hi_ in
                            (("<0.8", 0, 0.8), ("0.8-0.9", 0.8, 0.9), ("0.9-1.0", 0.9, 1.0), ("1.0-1.1", 1.0, 1.1),
                             ("1.1-1.25", 1.1, 1.25), (">=1.25", 1.25, 1e9))}
    # one-sided: large units where one side is unpublished (<2 or absent)
    one = [(k, v) for k, v in u.items() if not c.is_placeholder(k) and k not in conf and unit_type(k) in ("ski_pair", "invariant")
           and (v["M"] + v["F"]) >= 500 and (not v["M_pub"] or not v["F_pub"])]
    for k, v in sorted(one, key=lambda kv: -(kv[1]["M"] + kv[1]["F"]))[:TOPN]:
        out.append([unit_type(k), "one_side_unpublished_ge500", "", k, c.feminine_of(k), v["M"] if v["M_pub"] else "<2 or absent",
                    v["F"] if v["F_pub"] else "<2 or absent", ""])
    with open(os.path.join(OUT, "gender_ratio_outliers_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["unit_type", "list", "position", "unit_key", "female_list_form", "M_entries", "F_entries", "F_per_M"])
        w.writerows(out)
    print("ratio stats (units >= 1000 entries, both sides published, conflict-free):", stats)
    for r in out:
        print(r)

    # ---------------- cross-form entries ----------------
    cf = []
    for y in c.PAIRED_YEARS:
        m, f = c.living("M", y), c.living("F", y)
        fm = {k: v for k, v in f.items() if k.endswith(("SKI", "CKI", "DZKI")) and " " not in k and "-" not in k}
        mf = {k: v for k, v in m.items() if k.endswith(("SKA", "CKA", "DZKA")) and " " not in k and "-" not in k}
        top_fm = sorted(fm.items(), key=lambda kv: -kv[1])[:5]
        cf.append([y, c.ref_date("F", y), "F list, masculine-looking form (-SKI/-CKI/-DZKI)", len(fm), sum(fm.values()),
                   "; ".join(f"{k}={v}" for k, v in top_fm)])
        top_mf = sorted(mf.items(), key=lambda kv: -kv[1])[:5]
        cf.append([y, c.ref_date("M", y), "M list, feminine-looking form (-SKA/-CKA/-DZKA)", len(mf), sum(mf.values()),
                   "; ".join(f"{k}={v}" for k, v in top_mf)])
    with open(os.path.join(OUT, "crossform_by_year.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["year_label", "reference_date", "what", "forms", "entries", "top5_forms"])
        w.writerows(cf)
    for r in cf:
        print(r)

    # ---------------- A7 hyphenated ----------------
    hy = []
    for yy in c.YEARS:
        for s in "MF":
            if (s, yy) not in c.LIVING:
                continue
            d = c.living(s, yy)
            h = {k: v for k, v in d.items() if "-" in k and not c.is_placeholder(k)}
            parts3 = sum(1 for k in h if k.count("-") >= 2)
            hy.append([yy, c.ref_date(s, yy), s, len(h), sum(h.values()), f"{100 * sum(h.values()) / sum(d.values()):.4f}",
                       f"{100 * len(h) / len(d):.3f}", parts3, sum(1 for v in h.values() if v >= 20)])
    with open(os.path.join(OUT, "hyphenated_by_year.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["year_label", "reference_date", "list", "hyphenated_forms", "hyphenated_entries",
                    "share_of_list_entries_pct", "share_of_list_forms_pct", "forms_with_3plus_parts", "forms_ge20"])
        w.writerows(hy)
    for r in hy:
        print(r)
    top = []
    for s in "MF":
        d = c.living(s, "2026")
        h = {k: v for k, v in d.items() if "-" in k and not c.is_placeholder(k)}
        for i, (k, v) in enumerate(sorted(h.items(), key=lambda kv: (-kv[1], kv[0]))[:20], 1):
            top.append(["top_forms", s, i, k, v, ""])
        comp = Counter()
        comp_forms = Counter()
        for k, v in h.items():
            for p in set(k.split("-")):
                if p:
                    comp[c.pair_key(p)] += v
                    comp_forms[c.pair_key(p)] += 1
        for i, (k, v) in enumerate(comp.most_common(20), 1):
            top.append(["top_components_PAIR-V1_key", s, i, k, v, comp_forms[k]])
        # most frequent position pairs
    with open(os.path.join(OUT, "hyphenated_top_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["list_type", "list", "position", "form_or_component", "entries", "hyphenated_forms_containing_component"])
        w.writerows(top)
    for r in top:
        print(r)


if __name__ == "__main__":
    main()

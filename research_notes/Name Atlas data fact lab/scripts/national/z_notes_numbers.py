"""Derived numbers quoted in national_trends_trivia.md that are not already a cell of another CSV.

Run after run_all.py (python3 z_notes_numbers.py). Reads the CSVs in data/national/ and, where a number needs the
raw lists, the pinned PESEL files through common.py. Output: data/national/notes_derived_numbers.csv
(section, key, value, source, method). Nothing here is typed in by hand.
"""
import csv
import os
import statistics
from datetime import date

import common as c

OUT = c.ensure_out()
FOLD = str.maketrans("ĄĆĘŁŃÓŚŹŻ", "ACELNOSZZ")
rows = []


def add(section, key, value, source, method):
    rows.append([section, key, value, source, method])
    print(f"{section:4} {key:70} {value}")


def read(name):
    with open(os.path.join(OUT, name), encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def pct(a, b, nd=2):
    return f"{100 * (b - a) / a:.{nd}f}"


def main():
    # ---------------- intro / A1 denominators ----------------
    yt = {(r["year_label"], r["list"]): r for r in read("yearly_totals.csv")}
    d19, d20, d26 = date(2019, 6, 30), date(2020, 1, 22), date(2026, 1, 20)
    add("A2", "interval_2019-06-30_to_2026-01-20_days", (d26 - d19).days, "-", "calendar arithmetic")
    add("A2", "interval_2019-06-30_to_2026-01-20_years", f"{(d26 - d19).days / 365.25:.2f}", "-", "days/365.25")
    add("A2", "interval_2020-01-22_to_2026-01-20_years", f"{(d26 - d20).days / 365.25:.2f}", "-", "days/365.25")
    for s in "MF":
        for a, b in (("2019", "2026"), ("2020", "2026"), ("2025", "2026")):
            ea, eb = int(yt[(a, s)]["entries_sum"]), int(yt[(b, s)]["entries_sum"])
            fa, fb = int(yt[(a, s)]["distinct_forms"]), int(yt[(b, s)]["distinct_forms"])
            add("A4", f"{s}_list_entries_change_pct_{a}_{b}", pct(ea, eb), "yearly_totals.csv", "(b-a)/a")
            add("A4", f"{s}_list_distinct_forms_change_pct_{a}_{b}", pct(fa, fb, 1), "yearly_totals.csv", "(b-a)/a, file rows")
    # placeholders in 2026 lists
    for s in "MF":
        d = c.living(s, "2026")
        ph = {k: v for k, v in d.items() if c.is_placeholder(k)}
        add("A4", f"{s}_2026_placeholder_values", "; ".join(f"{k}={v}" for k, v in sorted(ph.items())), "1681 2026", "PLACEHOLDERS set")
        add("A4", f"{s}_2026_distinct_forms_excl_placeholders", len(d) - len(ph), "1681 2026", "file rows minus placeholder rows")

    # ---------------- A2 showcase per list ----------------
    ser = read("showcase_yearly_series.csv")
    by = {(r["showcase"], r["year_label"]): r for r in ser}
    labels = []
    for r in ser:
        if r["showcase"] not in labels:
            labels.append(r["showcase"])
    for lab in labels:
        for s, col, rk in (("M", "M_entries", "rank_in_M_list"), ("F", "F_entries", "rank_in_F_list")):
            a, b, p = by[(lab, "2019")][col], by[(lab, "2026")][col], by[(lab, "2025")][col]
            if a.isdigit() and b.isdigit() and p.isdigit():
                add("A2", f"{lab}|{s}_pct_2025_2026", pct(int(p), int(b)), "showcase_yearly_series.csv", "(b-a)/a")
                add("A2", f"{lab}|{s}_rank_2019_to_2026", f"{by[(lab, '2019')][rk]} -> {by[(lab, '2026')][rk]}",
                    "showcase_yearly_series.csv", "RANK-V1 within list")
            a20 = by[(lab, "2020")][col]
            if a20.isdigit() and b.isdigit():
                add("A2", f"{lab}|{s}_pct_2020_2026", pct(int(a20), int(b)), "showcase_yearly_series.csv", "(b-a)/a")
        # year of maximum in each list (F 2022 n/a)
        for s, col in (("M", "M_entries"), ("F", "F_entries")):
            vals = {r["year_label"]: int(r[col]) for r in ser if r["showcase"] == lab and r[col].isdigit()}
            ymax = max(vals, key=lambda y: vals[y])
            add("A2", f"{lab}|{s}_year_of_max", f"{ymax} ({vals[ymax]})", "showcase_yearly_series.csv", "max over published years")

    # forms among the 2019 top 100 of a list that rose by 2026, with their 2019 rank in BOTH lists
    for s in "MF":
        a, b = c.living(s, "2019"), c.living(s, "2026")
        top = sorted((k for k in a if not c.is_placeholder(k)), key=lambda k: (-a[k], k))[:100]
        for k in top:
            if b.get(k, 0) > a[k]:
                other = "F" if s == "M" else "M"
                ro = c.competition_rank(c.living(other, "2019")).get(k if other == "M" else c.feminine_of(k), "<2 or absent")
                add("A2", f"{s}_list_top100_2019_riser_{k}",
                    f"rank {c.competition_rank(a)[k]} in {s} list 2019; rank {ro} in {other} list 2019", "1681 2019/2026",
                    "RANK-V1 within list")
    # why a rank moved: decompose the forms ranked above a showcase form in 2026 (placeholders excluded)
    for s in "MF":
        a = {k: v for k, v in c.living(s, "2019").items() if not c.is_placeholder(k)}
        b = {k: v for k, v in c.living(s, "2026").items() if not c.is_placeholder(k)}
        form = "CZEKIERDA"
        above26 = [k for k, v in b.items() if v > b[form]]
        add("A2", f"CZEKIERDA|{s}_forms_above_2026_decomposition",
            f"{len(above26)} above in 2026: {sum(1 for k in above26 if k not in a)} not published in 2019; "
            f"{sum(1 for k in above26 if k in a and a[k] <= a[form])} overtook (<= CZEKIERDA in 2019); "
            f"{sum(1 for k in above26 if k in a and a[k] > a[form])} already above in 2019",
            "1681 2019/2026", "set comparison, placeholders excluded")
    # cross-form entries of the showcase -SKI units (footnote figures)
    m26, f26 = c.living("M", "2026"), c.living("F", "2026")
    for key, label in c.SHOWCASE:
        if key.endswith(("SKI", "CKI", "DZKI")) and key not in c.INVARIANT_OVERRIDE:
            add("A1", f"{label}|cross_forms_2026", f"{key} in F list: {f26.get(key, '<2 or absent')}; "
                f"{c.feminine_of(key)} in M list: {m26.get(c.feminine_of(key), '<2 or absent')}", "1681 2026 M/F", "exact forms")
            add("A1", f"{label}|M_form_plus_F_form_internal_sum_2026", m26[key] + f26[c.feminine_of(key)], "1681 2026 M/F",
                "INTERNAL ONLY (reconciliation with the regional notes' paired figure; never user-facing)")

    # ---------------- A3 per-list mover stats ----------------
    for s in "MF":
        a, b = c.living(s, "2019"), c.living(s, "2026")
        rel = [k for k in b if k in a and a[k] >= 500 and not c.is_placeholder(k)]
        up = sum(1 for k in rel if b[k] > a[k])
        down = sum(1 for k in rel if b[k] < a[k])
        add("A3", f"{s}_list_forms_ge500_in_2019_and_published_2026", len(rel), "1681 2019/2026", "base >= 500 entries")
        add("A3", f"{s}_list_of_those_rose", up, "1681 2019/2026", "count b>a")
        add("A3", f"{s}_list_of_those_fell", down, "1681 2019/2026", "count b<a")
    suf = {(r["year_label"], r["list"], r["spelling_class"]): r for r in read("suffix_classes_by_year.csv")}
    for s in "MF":
        for cl in ("-SKI/-SKA", "-CKI/-CKA", "-UK", "-ENKO", "-AK", "-EK", "OTHER", "SPACE_SEPARATED"):
            a, b20, b =suf[("2019", s, cl)], suf[("2020", s, cl)], suf[("2026", s, cl)]
            add("A3", f"{s}_{cl}_share_2019_2020_2026_pct",
                f"{a['share_of_entries_pct']} / {b20['share_of_entries_pct']} / {b['share_of_entries_pct']}",
                "suffix_classes_by_year.csv", "SUFFIX-V1 share of list entries")
            add("A3", f"{s}_{cl}_forms_2019_2026", f"{a['distinct_forms']} -> {b['distinct_forms']}", "suffix_classes_by_year.csv",
                "distinct forms in class")

    # ---------------- A4 tail shares ----------------
    for r in read("concentration_by_year.csv"):
        if r["list"] in ("M", "F") and r["year_label"] in ("2019", "2020", "2026"):
            n = int(r["distinct_forms"])
            add("A4", f"{r['list']}_{r['year_label']}_forms_with_exactly_2_pct_of_forms",
                f"{100 * int(r['forms_with_exactly_2']) / n:.1f}", "concentration_by_year.csv", "forms_with_exactly_2 / distinct_forms")
            add("A4", f"{r['list']}_{r['year_label']}_forms_ge20_pct_of_forms",
                f"{100 * int(r['forms_ge20']) / n:.1f}", "concentration_by_year.csv", "forms_ge20 / distinct_forms")

    # ---------------- A5 leavers still present in the including-deceased list (female list, same 2026 date) ----------------
    for base in ("2019", "2020", "2025"):
        a = {c.ARTEFACT_RENAMES.get(k, k): v for k, v in c.living("F", base).items() if not c.is_placeholder(k)}
        b = c.living("F", "2026")
        inc = c.deceased_incl("F", "2026")
        gone = [k for k in a if k not in b]
        kept = [k for k in gone if k in inc]
        add("A5", f"F_leavers_{base}_2026_still_in_incl_deceased_list_2026", f"{len(kept)} of {len(gone)}",
            "1681 F + 568 F 2026-01-20", "form published in the including-deceased female list at the same date")

    # ---------------- A6 ratio statistics (log-only before) ----------------
    y = "2026"
    u = c.paired(y)
    conf = c.conflict_keys(y)
    m26 = c.living("M", y)
    skyi = {k[:-2] + "I" for k in m26 if k.endswith(("SKYI", "SKYY", "SKII", "SKIY", "CKYI", "ZKYI"))}
    for t in ("ski_pair", "invariant_consonant_final"):
        cand = {}
        for k, v in u.items():
            if c.is_placeholder(k) or k in conf or not (v["M_pub"] and v["F_pub"]) or v["M"] + v["F"] < 1000:
                continue
            multi = "-" in k or " " in k
            is_ski = k.endswith(("SKI", "CKI", "DZKI"))
            if t == "ski_pair" and is_ski and not multi and k not in skyi:
                cand[k] = v
            if t == "invariant_consonant_final" and not multi and not is_ski and k[-1] not in "AĄEĘIOÓUY" \
                    and not k.endswith(("OV", "EV", "IN", "YN")):
                cand[k] = v
        ratios = [v["F"] / v["M"] for v in cand.values()]
        add("A6", f"{t}_units_ge1000_both_lists_published", len(ratios), "1681 2026 M/F", "PAIR-V1, conflict-free")
        add("A6", f"{t}_median_F_per_M", f"{statistics.median(ratios):.4f}", "1681 2026 M/F", "median of F/M")
        add("A6", f"{t}_F_gt_M", sum(1 for x in ratios if x > 1), "1681 2026 M/F", "count F/M>1")
        add("A6", f"{t}_within_0.9_1.1", sum(1 for x in ratios if 0.9 <= x <= 1.1), "1681 2026 M/F", "count 0.9<=F/M<=1.1")
    adj = read("adjectival_forms_female_list.csv")[0]
    add("A6", "F_list_adjectival_pairs_Y_vs_A_living_2019_2026",
        f"Y {adj['Y_living_2019']} -> {adj['Y_living_2026']} ({pct(int(adj['Y_living_2019']), int(adj['Y_living_2026']))}%); "
        f"A {adj['A_living_2019']} -> {adj['A_living_2026']} ({pct(int(adj['A_living_2019']), int(adj['A_living_2026']))}%)",
        "adjectival_forms_female_list.csv", "(b-a)/a")

    # ---------------- A7 hyphen ----------------
    hy = {(r["year_label"], r["list"]): r for r in read("hyphenated_by_year.csv")}
    for s in "MF":
        a, b = hy[("2020", s)], hy[("2026", s)]
        add("A7", f"{s}_hyphenated_entries_change_pct_2020_2026", pct(int(a["hyphenated_entries"]), int(b["hyphenated_entries"])),
            "hyphenated_by_year.csv", "(b-a)/a")
        add("A7", f"{s}_hyphenated_forms_change_pct_2020_2026", pct(int(a["hyphenated_forms"]), int(b["hyphenated_forms"])),
            "hyphenated_by_year.csv", "(b-a)/a")
    add("A7", "F_share_over_M_share_2026",
        f"{float(hy[('2026', 'F')]['share_of_list_entries_pct']) / float(hy[('2026', 'M')]['share_of_list_entries_pct']):.2f}",
        "hyphenated_by_year.csv", "ratio of shares")

    # ---------------- A8 medians and deceased-only forms ----------------
    for (s, yy), (rd, fn) in sorted(c.DECEASED_INCL.items()):
        liv, inc = c.living(s, yy), c.deceased_incl(s, yy)
        idx = [(inc[k] - liv[k]) / inc[k] for k in inc if k in liv and inc[k] >= 1000 and not c.is_placeholder(k)]
        add("A8", f"{s}_{rd}_forms_ge1000_incl", len(idx), f"568/1681 {rd}", "incl-deceased entries >= 1000, living published")
        add("A8", f"{s}_{rd}_median_ageing_index_pct", f"{100 * statistics.median(idx):.2f}", f"568/1681 {rd}", "AGE-V1 median")
        only = {k: v for k, v in inc.items() if k not in liv and not c.is_placeholder(k)}
        fold_liv = {}
        for k, v in liv.items():
            f_ = k.translate(FOLD)
            fold_liv[f_] = max(fold_liv.get(f_, 0), v)
        big = {k: v for k, v in only.items() if v >= 10}
        var = [k for k in big if k.translate(FOLD) in fold_liv and fold_liv[k.translate(FOLD)] > big[k]]
        add("A8", f"{s}_{rd}_incl_only_forms_ge10", len(big), f"568/1681 {rd}", "forms in incl-deceased list, living <2 or absent")
        add("A8", f"{s}_{rd}_incl_only_forms_ge10_that_are_diacritic_variants_of_a_larger_living_form", len(var),
            f"568/1681 {rd}", "diacritic-folded form equals a folded living-list form with more entries")
        add("A8", f"{s}_{rd}_incl_only_top5", "; ".join(f"{k}={v}" for k, v in sorted(only.items(), key=lambda kv: (-kv[1], kv[0]))[:5]),
            f"568 {rd}", "largest forms absent from the living list")

    # ---------------- A9 nouns excluding sensitive matches ----------------
    import a09_a10_a11_language as lang
    ws = read("words_summary_by_list_2026.csv")
    for r in ws:
        nouns = [k.strip() for k in r["noun_matches_in_rank_order"].split(";") if k.strip()]
        if r["top_n_forms"] == "100":
            keep = [k for k in nouns if k not in lang.SENSITIVE_WORD_MATCHES]
            add("A9", f"{r['list']}_top100_noun_matches_excluding_sensitive", len(keep), "words_summary_by_list_2026.csv",
                "noun matches minus SENSITIVE_WORD_MATCHES")
    t1000 = read("words_top1000_2026.csv")
    adj100 = [r["unit_key"] for r in t1000 if r["rank_in_M_list_2026"] and int(r["rank_in_M_list_2026"]) <= 100
              and r["equals_lowercase_sjp_base_form"] == "Y" and "adjective" in r["sgjp_common_word_pos"]
              and "noun" not in r["sgjp_common_word_pos"]]
    add("A9", "M_top100_adjective_matches_ending_SKI_CKI_DZKI",
        f"{sum(1 for k in adj100 if k.endswith(('SKI', 'CKI', 'DZKI')))} of {len(adj100)}", "words_top1000_2026.csv",
        "adjective-only matches among M-list top 100")

    # ---------------- A10 initial letters ----------------
    for s in "MF":
        d = c.living(s, "2026")
        for L in "ĄĘŃÓ":
            f_ = {k: v for k, v in d.items() if k.startswith(L)}
            add("A10", f"{s}_2026_forms_starting_{L}", f"{len(f_)} forms / {sum(f_.values())} entries; max {max(f_.values()) if f_ else '-'}",
                "1681 2026", "published forms (each >= 2 entries)")
    rl = {(r["year_label"], r["list"], r["letter"]): r for r in read("rare_letters_by_year.csv")}
    for s in "MF":
        for L in "QVX":
            a, b = rl[("2019", f"{s} list", L)], rl[("2026", f"{s} list", L)]
            add("A10", f"{s}_letter_{L}_share_2019_2026", f"{a['share_of_list_entries_pct']} -> {b['share_of_list_entries_pct']}",
                "rare_letters_by_year.csv", "share of list entries")

    # ---------------- A11 two accepted genitive singular forms (top-1000 PAIR-V1 units, depr excluded) ----------------
    u26 = c.paired("2026")
    tot = {k: v["total"] for k, v in u26.items() if not c.is_placeholder(k)}
    top = sorted(tot, key=lambda k: (-tot[k], k))[:1000]
    sur, _, _, _ = lang.parse_sgjp({lang.title(k) for k in top}, set())
    gen2 = []
    for k in top:
        for lid, e in sur.get(lang.title(k), {}).items():
            if any(":m1" in tg for _, tg, _ in e):
                table, _ = lang.lemma_summary(e)
                if len(table.get(("sg", "gen"), ())) >= 2:
                    gen2.append(f"{k} ({'/'.join(sorted(table[('sg', 'gen')]))})")
    add("A11", "top1000_units_without_sgjp_surname_lemma",
        sum(1 for r in t1000 if r["sgjp_has_surname_lemma"] != "Y"), "words_top1000_2026.csv", "count of blank flags")
    add("A11", "top1000_units_with_two_accepted_genitive_singular_forms", f"{len(gen2)}: " + "; ".join(gen2),
        "sgjp.tab.gz", "SGJP m1 surname lemma, subst sg.gen forms (depr excluded)")

    # ---------------- A11 married-name forms ----------------
    f26 = c.living("F", "2026")
    for k in ("NOWAKOWA", "GRZEGORCZYKOWA", "KACZMARKOWA", "MAZUROWA", "KOWALOWA"):
        add("A11", f"F_2026_{k}", f26.get(k, "<2 or absent"), "1681 F 2026", "exact form")

    with open(os.path.join(OUT, "notes_derived_numbers.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["section", "key", "value", "source", "method"])
        w.writerows(rows)


if __name__ == "__main__":
    main()

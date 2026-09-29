"""A4 diversity & concentration, A5 entering/leaving the published list (living persons, dataset 1681).

Outputs (repo data/national/):
  concentration_by_year.csv    distinct forms, top-N coverage, N50/N80, long tail per list and year
  concentration_curve_2026.csv chart-ready cumulative-coverage curve at 2026-01-20
  entry_exit_summary.csv       forms present in one date's list but not the other (2019->2026, and 2025->2026)
  entry_exit_examples.csv      examples with >= 20 entries (editorial minimum)
"Absent" always means: fewer than 2 entries or absent (single occurrences are suppressed).
"""
import csv
import os

import common as c

OUT = c.ensure_out()
TOPNS = (10, 100, 1000, 10000)
CURVE_N = (1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 300000, 400000)
BANDS = ((2, 2), (3, 4), (5, 9), (10, 19), (20, 99), (100, 999), (1000, 10 ** 9))


def conc(values):
    v = sorted(values, reverse=True)
    tot = sum(v)
    cum, out = 0, {}
    n50 = n80 = n90 = None
    for i, x in enumerate(v, 1):
        cum += x
        if n50 is None and cum >= 0.5 * tot:
            n50 = i
        if n80 is None and cum >= 0.8 * tot:
            n80 = i
        if n90 is None and cum >= 0.9 * tot:
            n90 = i
        if i in TOPNS or i in CURVE_N:
            out[i] = cum
    tail = [x for x in v if 2 <= x <= 4]
    twos = sum(1 for x in v if x == 2)
    return {"tot": tot, "n": len(v), "cum": out, "n50": n50, "n80": n80, "n90": n90,
            "tail_forms": len(tail), "tail_entries": sum(tail), "twos": twos,
            "ge20": sum(1 for x in v if x >= 20), "ge1000": sum(1 for x in v if x >= 1000),
            "median": v[len(v) // 2]}


def lists_for_year(y):
    out = []
    for s in "MF":
        if (s, y) in c.LIVING:
            out.append((s, c.ref_date(s, y), list(c.living(s, y).values())))
    if y in c.PAIRED_YEARS:
        out.append(("PAIRED", c.ref_date("M", y), [v["total"] for v in c.paired(y).values()]))
    return out


def band(n):
    for lo, hi in BANDS:
        if lo <= n <= hi:
            return f"{lo}-{hi}" if hi < 10 ** 9 else f"{lo}+"
    return "?"


def main():
    rows, curve = [], []
    for y in c.YEARS:
        for lst, rd, vals in lists_for_year(y):
            r = conc(vals)
            rows.append([y, rd, lst, r["n"], r["tot"]]
                        + [f"{100 * r['cum'][n] / r['tot']:.3f}" for n in TOPNS]
                        + [r["n50"], r["n80"], r["n90"], r["tail_forms"], f"{100 * r['tail_forms'] / r['n']:.2f}",
                           r["tail_entries"], f"{100 * r['tail_entries'] / r['tot']:.3f}", r["twos"], r["ge20"], r["ge1000"], r["median"]])
            if y == "2026":
                for n in CURVE_N:
                    if n in r["cum"]:
                        curve.append([lst, n, r["cum"][n], f"{100 * r['cum'][n] / r['tot']:.3f}"])
                curve.append([lst, r["n"], r["tot"], "100.000"])
    with open(os.path.join(OUT, "concentration_by_year.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["year_label", "reference_date", "list", "distinct_forms", "entries_sum"]
                   + [f"top{n}_share_pct" for n in TOPNS]
                   + ["n_for_50pct", "n_for_80pct", "n_for_90pct", "tail_2to4_forms", "tail_2to4_forms_pct_of_forms",
                      "tail_2to4_entries", "tail_2to4_entries_pct", "forms_with_exactly_2", "forms_ge20", "forms_ge1000",
                      "median_entries_per_form"])
        w.writerows(rows)
    with open(os.path.join(OUT, "concentration_curve_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["list", "top_n", "cumulative_entries", "cumulative_share_pct"])
        w.writerows(curve)
    for r in rows:
        if r[0] in ("2019", "2023", "2026"):
            print(r)

    # ---------------- A5 entering / leaving ----------------
    summ, ex = [], []
    pairs = [("2019", "2026"), ("2020", "2026"), ("2025", "2026"), ("2019", "2020")]
    for a, b in pairs:
        scopes = [(s, c.living(s, a), c.living(s, b)) for s in "MF"]
        scopes.append(("PAIRED", {k: v["total"] for k, v in c.paired(a).items()},
                       {k: v["total"] for k, v in c.paired(b).items()}))
        for lst, da, db in scopes:
            # placeholders (BRAK DANYCH etc.) are not surnames: excluded here, reported by a00
            # the 'True' artefact is compared as PRAWDA (see common.ARTEFACT_RENAMES)
            da = {c.ARTEFACT_RENAMES.get(k, k): v for k, v in da.items() if not c.is_placeholder(k)}
            db = {c.ARTEFACT_RENAMES.get(k, k): v for k, v in db.items() if not c.is_placeholder(k)}
            new = {k: db[k] for k in db if k not in da}
            gone = {k: da[k] for k in da if k not in db}
            print(f"{a}->{b} {lst}: max entries among forms in earlier list only = {max(gone.values()) if gone else None}; "
                  f"max among later-only = {max(new.values()) if new else None}")
            summ.append([f"{a}->{b}", lst, "in_later_not_earlier", len(new), sum(new.values()),
                         f"{100 * sum(new.values()) / sum(db.values()):.3f}",
                         sum(1 for v in new.values() if v >= 20)]
                        + [sum(1 for v in new.values() if band(v) == band(lo)) for lo, hi in BANDS])
            summ.append([f"{a}->{b}", lst, "in_earlier_not_later", len(gone), sum(gone.values()),
                         f"{100 * sum(gone.values()) / sum(da.values()):.3f}",
                         sum(1 for v in gone.values() if v >= 20)]
                        + [sum(1 for v in gone.values() if band(v) == band(lo)) for lo, hi in BANDS])
            if (a, b) == ("2019", "2026"):
                for k in sorted(new, key=lambda k: (-new[k], k))[:30]:
                    if new[k] >= 20:
                        ex.append([f"{a}->{b}", lst, "in_2026_not_2019", k, "<2 or absent", new[k]])
                for k in sorted(gone, key=lambda k: (-gone[k], k)):
                    if gone[k] >= 20:
                        ex.append([f"{a}->{b}", lst, "in_2019_not_2026", k, gone[k], "<2 or absent"])
    with open(os.path.join(OUT, "entry_exit_summary.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["period", "list", "direction", "forms", "entries_in_the_date_where_present",
                    "pct_of_that_dates_entries", "forms_ge20"] + [f"forms_band_{band(lo)}" for lo, hi in BANDS])
        w.writerows(summ)
    with open(os.path.join(OUT, "entry_exit_examples.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["period", "list", "direction", "form_or_unit_key", "entries_2019", "entries_2026"])
        w.writerows(ex)
    for r in summ:
        print(r)
    print("examples leaving (>=20):", [(r[1], r[3], r[4]) for r in ex if r[2] == "in_2019_not_2026"][:40])
    print("examples entering (top):", [(r[1], r[3], r[5]) for r in ex if r[2] == "in_2026_not_2019"][:45])


if __name__ == "__main__":
    main()

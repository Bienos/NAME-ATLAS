"""Data-quality checks on the national PESEL files used by the fact lab.

Output (repo data/national/): data_quality_findings.csv (one row per observation).
Also prints SHA-256 of every file used (compare with data/pesel_sha256.txt).
"""
import csv
import os
import re
import unicodedata

import common as c

OUT = c.ensure_out()


def main():
    rows = []
    files = sorted(set(v[1] for v in c.LIVING.values()) | set(v[1] for v in c.DECEASED_INCL.values())
                   | {c.F2022_DUPLICATE})
    sums = {}
    for fn in files:
        h = c.sha256(os.path.join(c.DATA, fn))
        sums[fn] = h
        print(h, fn)
    if sums["1681_F_2021-02-02_r35279.csv"] == sums[c.F2022_DUPLICATE]:
        rows.append(["DQ-01", "1681_F_2021-02-02_r35279.csv + 1681_F_2022-01-27_r38772.csv", "(whole file)", "",
                     "Byte-identical files (same SHA-256): the portal's 2022 female resource is a copy of 2021. "
                     "No female 2022 snapshot exists; 2022 paired values are n/a."])
    placeholder_re = {"BRAK DANYCH", "BRAK NAZWISKA", ".", "-", "XXX", "NN"}
    for fn in files:
        if fn == c.F2022_DUPLICATE:
            continue
        d = c.load_file(fn)
        for k, v in sorted(d.items()):
            if k in placeholder_re:
                rows.append(["DQ-02", fn, k, v, "Placeholder-like value published as a surname "
                             "(BRAK DANYCH = 'no data', BRAK NAZWISKA = 'no surname'; NN/XXX probable placeholders). "
                             "Kept in raw sums, excluded from editorial lists."])
            elif k != k.upper():
                rows.append(["DQ-03", fn, k, v, "Non-uppercase value; 'True' replaces the surname PRAWDA "
                             "(PRAWDA is the Polish spreadsheet keyword for TRUE) - a publisher-side conversion artefact."])
            elif re.search(r"\d", k):
                rows.append(["DQ-04", fn, k, v, "Digit inside a surname value."])
            elif len(k) == 1:
                rows.append(["DQ-05", fn, k, v, "Single-character surname value (unverifiable; may be real)."])
        raw_ws = [n for n in c.REPORT.notes if n.startswith(fn) and "whitespace" in n]
        for n in raw_ws:
            rows.append(["DQ-06", fn, n.split("surname ")[1].split(" (")[0], "", "Surrounding whitespace in the raw value; stripped for analysis (no collision created)."])
        comb = [k for k in d if any(unicodedata.combining(ch) for ch in k)]
        if comb:
            rows.append(["DQ-07", fn, "; ".join(sorted(comb)[:8]), len(comb),
                         "Values containing a standalone Unicode combining mark (kept verbatim)."])
        if "PRAWDA" not in d and "True" in d:
            rows.append(["DQ-03b", fn, "PRAWDA", "absent", f"PRAWDA missing while 'True' has {d['True']} entries."])
    # spelling variants that coexist as separate forms (examples, 2026 M+F)
    m, f = c.living("M", "2026"), c.living("F", "2026")
    for group in (("MÜLLER", "MŰLLER", "MULLER", "MUELLER"), ("SCHRÖDER", "SCHRŐDER")):
        vals = "; ".join(f"{g}={m.get(g, '<2/absent')}M/{f.get(g, '<2/absent')}F" for g in group)
        rows.append(["DQ-08", "1681 2026 M+F", " / ".join(group), "", "Diacritic/spelling variants recorded as separate surname values: " + vals])
    # PAIR-V1 collisions
    ck = c.conflict_keys("2026")
    rows.append(["DQ-09", "1681 2026 M", f"{len(ck)} keys", sum(c.paired('2026')[k]['total'] for k in ck),
                 "PAIR-V1 collision: -SKA/-CKA/-DZKA forms published in the MALE list with >=20 entries "
                 "(invariant surnames such as KRASKA, GĄSKA, KLUSKA). Count = PAIR-V1 unit total entries affected."])
    with open(os.path.join(OUT, "data_quality_findings.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["finding", "file", "value", "count", "note"])
        w.writerows(rows)
    for r in rows:
        print(r)


if __name__ == "__main__":
    main()

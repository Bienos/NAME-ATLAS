"""Merge the per-script showcase part files into data/national/showcase_surnames.csv
(one row per showcase surname per fact metric). Run after all a*.py scripts."""
import csv
import glob
import os

import common as c

PARTS = c.PARTS
HEADER = ["showcase", "fact", "metric", "value", "scope", "reference_date", "source_files", "method", "proposed_confidence"]


def main():
    order = {label: i for i, (_, label) in enumerate(c.SHOWCASE)}
    rows = []
    for p in sorted(glob.glob(os.path.join(PARTS, "showcase_*.csv"))):
        with open(p, encoding="utf-8", newline="") as fh:
            rows.extend(r for r in csv.reader(fh) if r)
    rows.sort(key=lambda r: (order.get(r[0], 99), r[1]))
    out = os.path.join(c.ensure_out(), "showcase_surnames.csv")
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(HEADER)
        w.writerows(rows)
    print(len(rows), "rows ->", out)


if __name__ == "__main__":
    main()

"""Remaining per-surname facts for the showcase surnames (A3 class, A5 presence, A6 F/M, A7 hyphen components,
A10 letters). Part file: parts/showcase_a12.csv (merged by z_assemble_showcase.py)."""
import csv
import os

import common as c
from a03_movers_suffix import suffix_class

PARTS = c.PARTS
os.makedirs(PARTS, exist_ok=True)
PL_DIACRITICS = set("ĄĆĘŁŃÓŚŹŻ")


def main():
    part = []
    m19, f19 = c.living("M", "2019"), c.living("F", "2019")
    m26, f26 = c.living("M", "2026"), c.living("F", "2026")
    # first-letter shares per list (placeholders excluded); the M+F version is not user-facing (rule 10)
    fl = {}
    for s, d in (("M", m26), ("F", f26)):
        cnt, tot_s = {}, 0
        for k, n in d.items():
            if not c.is_placeholder(k):
                cnt[k[0]] = cnt.get(k[0], 0) + n
                tot_s += n
        fl[s] = (cnt, tot_s)
    for key, label in c.SHOWCASE:
        inv = key in c.INVARIANT_OVERRIDE
        mform, fform = key, (key if inv else c.feminine_of(key))
        rd = "2026-01-20"
        part.append([label, "A3", "spelling_class", suffix_class(key), "SUFFIX-V1 (spelling pattern only)", rd,
                     "-", "first matching ending rule", "VERIFIED (string rule)"])
        part.append([label, "A5", "published_2019_and_2026",
                     f"M2019={'Y' if mform in m19 else 'N'} F2019={'Y' if fform in f19 else 'N'} M2026={'Y' if mform in m26 else 'N'} F2026={'Y' if fform in f26 else 'N'}",
                     "exact forms", "2019-06-30 / 2026-01-20", "1681", "presence in list", "VERIFIED"])
        for yy, mm, ff in (("2019", m19, f19), ("2026", m26, f26)):
            if mform in mm and fform in ff:
                part.append([label, "A6", f"F_per_M_{yy}", f"{ff[fform] / mm[mform]:.4f}",
                             f"F list {fform} / M list {mform}", c.ref_date("M", yy), f"1681 {yy} M/F",
                             "ratio of list entries (GENDER-V1)", "LIKELY (derived); causes INSUFFICIENT_DATA"])
        # hyphenated forms containing the surname as a component (PAIR-V1 key of the component)
        for s, d in (("M", m26), ("F", f26)):
            forms = [(k, n) for k, n in d.items() if "-" in k and key in {c.pair_key(p) for p in k.split("-")}]
            part.append([label, "A7", f"hyphenated_forms_with_component_{s}", len(forms), f"{s} list, component key {key}",
                         rd, f"1681 2026 {s}", "component match after PAIR-V1 key", "VERIFIED (count of file rows)"])
            part.append([label, "A7", f"hyphenated_entries_with_component_{s}", sum(n for _, n in forms),
                         f"{s} list, component key {key}", rd, f"1681 2026 {s}", "sum of entries", "VERIFIED (arithmetic)"])
        part.append([label, "A10", "letters", len(key), "masculine/base form", "-", "-", "character count", "VERIFIED"])
        part.append([label, "A10", "polish_diacritic_letters", "".join(ch for ch in key if ch in PL_DIACRITICS) or "none",
                     "masculine/base form", "-", "-", "Ą Ć Ę Ł Ń Ó Ś Ź Ż", "VERIFIED"])
        for s in "MF":
            cnt, tot_s = fl[s]
            part.append([label, "A10", f"first_letter_share_of_{s}_list_entries_pct",
                         f"{key[0]}: {100 * cnt.get(key[0], 0) / tot_s:.2f}", f"{s} list, all forms, placeholders excluded",
                         rd, f"1681 2026 {s}", "share of list entries whose surname starts with this letter", "LIKELY (derived)"])
    with open(os.path.join(PARTS, "showcase_a12.csv"), "w", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerows(part)
    for r in part:
        print(r)


if __name__ == "__main__":
    main()

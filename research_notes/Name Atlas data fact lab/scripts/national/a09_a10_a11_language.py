"""A9 surnames that are ordinary Polish words, A10 letters & sounds trivia, A11 declension via SGJP,
plus the female-list -Y/-A adjectival form comparison (feeds A6/A11).

Sources: 1681 living lists 2026-01-20 (+2019 for letter trends; +568 F 2026 for the -Y/-A ageing check),
sjp.pl odm.txt (CC BY 4.0 / Apache 2.0), SGJP 2026-08-24 (BSD-2).
A9 is a LEXICAL match (surname string == lowercase base form in sjp.pl), not an etymology claim.

Outputs (repo data/national/):
  words_top1000_2026.csv     top-1000 PAIR-V1 units (internal ordering) with word-match flag, SGJP part of speech,
                             and the M-list / F-list entries and ranks (user-facing figures)
  words_summary_by_list_2026.csv  word matches among the top 100 / top 1000 forms of EACH list (user-facing form)
  letters_trivia_2026.csv    longest / most-diacritics / Q-V-X / palindromes / consonant runs. Eligibility (rule 7,
                             per list): the masculine/base form has >= 20 entries in the M list OR its feminine
                             form has >= 20 entries in the F list. Ties and frequency lists use per-list counts.
  first_letter_2026.csv      share of entries by first letter: M list, F list (user-facing) and PAIR-V1 units (internal)
  rare_letters_by_year.csv   entries containing Q, V or X per year: M list, F list and M+F (internal)
  sgjp_declension.csv        showcase declension table + top-1000 coverage summary rows
  adjectival_forms_female_list.csv  -Y vs -A forms in the female list (SGJP-confirmed adjectives)
Part file: parts/showcase_a09_a11.csv
"""
import csv
import gzip
import io
import os
import zipfile
from collections import Counter, defaultdict

import common as c

PARTS = c.PARTS
os.makedirs(PARTS, exist_ok=True)
OUT = c.ensure_out()

PL_ALPHABET = set("AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ")
PL_DIACRITICS = set("ĄĆĘŁŃÓŚŹŻ")
PL_VOWELS = set("AĄEĘIOÓUY")
MIN_ED = 20

# EDITORIAL (analyst-assigned themes and English glosses; lexical match only, NOT etymology; verify with a
# Polish editor before publication). Only surnames that appear in the top-1000 word matches are used.
EDITORIAL_THEMES = {
    "birds": [("WRÓBEL", "sparrow"), ("SIKORA", "tit (bird)"), ("DUDEK", "hoopoe"), ("KANIA", "kite (bird of prey)"),
              ("ZIĘBA", "chaffinch"), ("KRUK", "raven"), ("SOWA", "owl"), ("WRONA", "crow"), ("SROKA", "magpie"),
              ("DROZD", "thrush"), ("SŁOWIK", "nightingale"), ("SZCZYGIEŁ", "goldfinch"), ("SOKÓŁ", "falcon"),
              ("CZAPLA", "heron"), ("ORZEŁ", "eagle"), ("SZPAK", "starling"), ("PTAK", "bird")],
    "other animals": [("ZAJĄC", "hare"), ("WILK", "wolf"), ("LIS", "fox"), ("BARAN", "ram"), ("KOZIOŁ", "billy goat"),
                      ("KOT", "cat"), ("MUCHA", "fly"), ("PAJĄK", "spider"), ("RAK", "crayfish"), ("BOBER", "beaver"),
                      ("RYŚ", "lynx"), ("KOMAR", "mosquito"), ("OKOŃ", "perch (fish)"), ("ŚLEDŹ", "herring")],
    "trades and occupations": [("KOWAL", "smith"), ("KOŁODZIEJ", "wheelwright"), ("RYBAK", "fisherman"),
                               ("BEDNARZ", "cooper"), ("KRAWIEC", "tailor"), ("CIEŚLA", "carpenter"),
                               ("TOKARZ", "turner (lathe)"), ("TKACZ", "weaver"), ("BARTNIK", "forest beekeeper")],
    "plants and food": [("CHMIEL", "hop (plant)"), ("ŚLIWA", "plum"), ("GRUSZKA", "pear"), ("GRZYB", "mushroom"),
                        ("KAPUSTA", "cabbage"), ("CEBULA", "onion"), ("MARCHEWKA", "carrot"), ("PIETRUSZKA", "parsley"),
                        ("PASTERNAK", "parsnip"), ("KOPER", "dill"), ("KIEŁBASA", "sausage"), ("KAWA", "coffee"),
                        ("ŻUREK", "sour rye soup"), ("BARSZCZ", "beetroot soup")],
    "weather and landscape": [("MRÓZ", "frost"), ("CHMURA", "cloud"), ("ROSA", "dew"), ("GÓRA", "mountain"),
                              ("KAŁUŻA", "puddle")],
}
# Word matches that must NOT be used editorially (rule 5/6): ethnonyms/demonyms, slurs, titles of rank or
# religious office. Their lexical match is real but invites origin/identity/nobility readings.
SENSITIVE_WORD_MATCHES = {"POLAK", "NIEMIEC", "TUREK", "SZWED", "WĘGRZYN", "MOSKAL", "CYGAN", "RUSEK", "LACH",
                          "MAZUR", "MAZUREK", "KRAKOWIAK", "GÓRAL", "GÓRALCZYK", "KOZAK", "ŻMUDA", "BISKUP", "BARON",
                          "DZIEDZIC", "MARSZAŁEK", "KMIEĆ", "CZERNIAK", "RODAK", "HAJDUK", "GŁĄB"}
# (CZERNIAK also = melanoma; GŁĄB also = dunce; KMIEĆ/DZIEDZIC/MARSZAŁEK/BARON = social rank or title)
CALENDAR = ["STYCZEŃ", "LUTY", "MARZEC", "KWIECIEŃ", "MAJ", "CZERWIEC", "LIPIEC", "SIERPIEŃ", "WRZESIEŃ",
            "PAŹDZIERNIK", "LISTOPAD", "GRUDZIEŃ", "PONIEDZIAŁEK", "WTOREK", "ŚRODA", "CZWARTEK", "PIĄTEK", "SOBOTA",
            "NIEDZIELA"]

POS_MAP = {"subst": "noun", "depr": "noun", "adj": "adjective", "adja": "adjective", "adjp": "adjective",
           "adjc": "adjective", "adv": "adverb", "inf": "verb", "fin": "verb", "praet": "verb", "impt": "verb",
           "ger": "verb", "pact": "verb", "ppas": "verb", "pcon": "verb", "pant": "verb", "imps": "verb",
           "bedzie": "verb", "num": "numeral", "prep": "preposition", "conj": "conjunction", "interj": "interjection",
           "qub": "particle", "ppron12": "pronoun", "ppron3": "pronoun", "siebie": "pronoun", "winien": "verb",
           "pred": "predicative", "comp": "conjunction", "brev": "abbreviation", "burk": "bound word"}


def title(form: str) -> str:
    return "-".join(p[:1] + p[1:].lower() for p in form.split("-"))


def sjp_base_forms():
    lower, upper = set(), set()
    with zipfile.ZipFile(c.SJP) as z:
        with z.open("odm.txt") as fh:
            for line in io.TextIOWrapper(fh, encoding="utf-8"):
                base = line.rstrip("\n").split(",", 1)[0].strip()
                if not base:
                    continue
                if base[0].islower():
                    lower.add(base)
                else:
                    upper.add(base)
    return lower, upper


def is_surname_qual(q: str) -> bool:
    return any(p.startswith("nazwisko") for p in q.split("|"))


def parse_sgjp(target_title: set, target_lower: set):
    """One streaming pass over SGJP. Returns
    sur[base] -> {lemma_id: [(form, tag, qual)]} for surname-qualified lemmas whose base is in target_title,
    sur_bases: every surname-qualified lemma base in SGJP (for coverage),
    pos[lower] -> Counter of POS for common-word lemmas (qualifier empty or nazwa_pospolita)."""
    sur = defaultdict(lambda: defaultdict(list))
    sur_bases = set()
    odm_bases = defaultdict(set)
    pos = defaultdict(Counter)
    with gzip.open(c.SGJP, "rt", encoding="utf-8") as fh:
        in_header = True
        for line in fh:
            if in_header:
                if line.startswith("#</COPYRIGHT>"):
                    in_header = False
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            form, lemma, tag = parts[0], parts[1], parts[2]
            qual = parts[3] if len(parts) > 3 else ""
            base = lemma.split(":", 1)[0]
            if is_surname_qual(qual):
                sur_bases.add(base)
                if "odmężowskie" in qual or "odojcowskie" in qual:
                    odm_bases[base].add(qual)
                if base in target_title:
                    sur[base][lemma].append((form, tag, qual))
            elif base in target_lower and (qual == "" or "nazwa_pospolita" in qual.split("|")):
                pos[base][POS_MAP.get(tag.split(":", 1)[0], tag.split(":", 1)[0])] += 1
    return sur, sur_bases, pos, odm_bases


def slots(tag: str):
    """subst:sg:gen.acc:m1 -> [('sg','gen','m1'), ('sg','acc','m1')]"""
    p = tag.split(":")
    if len(p) < 4:
        return []
    nums, cases, gens = p[1].split("."), p[2].split("."), p[3].split(".")
    return [(n, cs, g) for n in nums for cs in cases for g in gens]


def lemma_summary(entries):
    """entries: [(form, tag, qual)] of ONE lemma."""
    table = defaultdict(set)
    depr = set()
    for form, tag, qual in entries:
        kind = tag.split(":", 1)[0]
        if kind == "depr":
            depr.add(form)
            continue
        if kind != "subst":
            continue
        for n, cs, g in slots(tag):
            table[(n, cs)].add(form)
    return table, depr


def main():
    y = "2026"
    u26 = c.paired(y)
    tot = {k: v["total"] for k, v in u26.items() if not c.is_placeholder(k)}
    top = sorted(tot, key=lambda k: (-tot[k], k))[:1000]
    rank = c.competition_rank(tot)
    m26, f26 = c.living("M", y), c.living("F", y)
    inf26 = c.deceased_incl("F", y)
    mrank, frank = c.competition_rank(m26), c.competition_rank(f26)

    def per_list(k):
        """User-facing figures for PAIR-V1 key k: (M-list entries of form k, F-list entries of its feminine form,
        M-list rank, F-list rank). None = fewer than 2 entries or absent."""
        ff = c.feminine_of(k)
        return m26.get(k), f26.get(ff), mrank.get(k), frank.get(ff)

    def show(v):
        return v if v is not None else "<2 or absent"

    def eligible(k):
        mm, ff_, _, _ = per_list(k)
        return (mm or 0) >= MIN_ED or (ff_ or 0) >= MIN_ED

    list_top = {}
    for s_, d_ in (("M", m26), ("F", f26)):
        forms = [k for k in d_ if not c.is_placeholder(k)]
        list_top[s_] = sorted(forms, key=lambda k: (-d_[k], k))[:1000]

    # female-list adjectival -Y / -A pairs (candidates; SGJP confirms the adjective below)
    adj_pairs = []
    for k, v in f26.items():
        if k.endswith("Y") and " " not in k and "-" not in k and v >= MIN_ED:
            a = k[:-1] + "A"
            if f26.get(a, 0) >= MIN_ED and k in inf26 and a in inf26:
                adj_pairs.append((k, a))

    target_title = {title(k) for k in top} | {title(c.feminine_of(k)) for k in top}
    target_title |= {title(k) for k, _ in c.SHOWCASE} | {title(c.feminine_of(k)) for k, _ in c.SHOWCASE}
    target_lower = {k.lower() for k in top} | {k.lower() for k, _ in c.SHOWCASE} | {k.lower() for k, _ in adj_pairs}

    lower, upper = sjp_base_forms()
    print("sjp base forms: lowercase", len(lower), "capitalised", len(upper))
    conflict_forms = {c.feminine_of(k) for k in c.conflict_keys(y)}
    target_title |= {title(k) + "owa" for k, _ in c.SHOWCASE} | {title(k) + "ówna" for k, _ in c.SHOWCASE}
    target_title |= {title(f) for f in conflict_forms}
    target_lower |= {w.lower() for w in CALENDAR}
    target_lower |= {c.pair_key(k).lower() for s_ in "MF" for k in list_top[s_]}
    sur, sur_bases, pos, odm_bases = parse_sgjp(target_title, target_lower)
    print("SGJP surname-qualified lemma bases:", len(sur_bases))

    # ---------------- A9 ----------------
    rows = []
    for i, k in enumerate(top, 1):
        w = k.lower()
        is_word = w in lower
        p = pos.get(w)
        pos_s = "/".join(sorted(p)) if p else ""
        mm, ff_, mr, fr = per_list(k)
        rows.append([rank[k], k, tot[k], "Y" if is_word else "", pos_s,
                     "Y" if title(k) in sur_bases else "", c.feminine_of(k), show(mm), show(ff_), mr or "", fr or ""])
    with open(os.path.join(OUT, "words_top1000_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w_ = csv.writer(fh)
        w_.writerow(["rank_2026", "unit_key", "paired_total_2026", "equals_lowercase_sjp_base_form",
                     "sgjp_common_word_pos", "sgjp_has_surname_lemma", "female_list_form", "M_list_entries_2026",
                     "F_list_entries_2026", "rank_in_M_list_2026", "rank_in_F_list_2026"])
        w_.writerows(rows)
    # per-list word-match summary (user-facing form; F-list forms are matched through their PAIR-V1 key)
    wsum = []
    for s_, d_ in (("M", m26), ("F", f26)):
        for n in (100, 1000):
            sub = list_top[s_][:n]
            hits = [k for k in sub if c.pair_key(k).lower() in lower]
            posc = Counter()
            for k in hits:
                p_ = pos.get(c.pair_key(k).lower(), {})
                posc["noun" if "noun" in p_ else ("adjective" if "adjective" in p_ else "other/not in SGJP common words")] += 1
            wsum.append([f"{s_} list", n, len(hits), posc["noun"], posc["adjective"], posc["other/not in SGJP common words"],
                         sum(d_[k] for k in hits), sum(d_[k] for k in sub),
                         f"{100 * sum(d_[k] for k in hits) / sum(d_[k] for k in sub):.2f}",
                         "; ".join(k for k in hits if "noun" in pos.get(c.pair_key(k).lower(), {}))[:2000]])
    with open(os.path.join(OUT, "words_summary_by_list_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w_ = csv.writer(fh)
        w_.writerow(["list", "top_n_forms", "word_matches", "of_which_noun", "of_which_adjective", "of_which_other",
                     "entries_of_matches", "entries_of_top_n", "matches_share_of_top_n_entries_pct", "noun_matches_in_rank_order"])
        w_.writerows(wsum)
    for r in wsum:
        print("A9 BY LIST", r[:9])
    for n in (100, 1000):
        sub = rows[:n]
        hits = [r for r in sub if r[3] == "Y"]
        posc = Counter()
        for r in hits:
            posc["noun" if "noun" in r[4] else ("adjective" if "adjective" in r[4] else (r[4] or "not in SGJP common words"))] += 1
        print(f"A9 top {n}: word matches {len(hits)}; by POS {dict(posc)}; entries covered {sum(r[2] for r in hits)} of {sum(r[2] for r in sub)}")
        print("  first matches:", [(r[0], r[1], r[4]) for r in hits[:60]])

    # editorial theme examples
    top_set = {r[1]: r for r in rows}
    ed = []
    for theme, items in EDITORIAL_THEMES.items():
        for sname, gloss in items:
            r = top_set.get(sname)
            ok = r is not None and r[3] == "Y" and "noun" in r[4] and sname not in SENSITIVE_WORD_MATCHES and eligible(sname)
            mm, ff_, mr, fr = per_list(sname)
            ed.append([theme, sname, gloss, r[0] if r else "", r[2] if r else "", "Y" if ok else "CHECK",
                       "EDITORIAL theme+gloss by analyst; lexical match only (not etymology)",
                       show(mm), show(ff_), mr or "", fr or ""])
    sens = [(r[0], r[1]) for r in rows if r[1] in SENSITIVE_WORD_MATCHES and r[3] == "Y"]
    cal = []
    for wd in CALENDAR:
        mm, ff = m26.get(wd), f26.get(wd)
        t_ = tot.get(wd)
        cal.append(["calendar", wd, "", rank.get(wd, ""), t_ if t_ else "<2 or absent (both lists)",
                    "Y" if eligible(wd) else "below editorial minimum", "lexical match only (not etymology)",
                    show(mm), show(ff), mrank.get(wd, ""), frank.get(wd, "")])
    with open(os.path.join(OUT, "words_editorial_examples.csv"), "w", newline="", encoding="utf-8") as fh:
        w_ = csv.writer(fh)
        w_.writerow(["theme", "unit_key", "analyst_gloss_or_note", "rank_2026_paired_internal", "paired_total_2026_internal",
                     "usable_editorially", "label", "M_list_entries_2026", "F_list_entries_2026", "rank_in_M_list_2026",
                     "rank_in_F_list_2026"])
        w_.writerows(ed)
        w_.writerows(cal)
        for rk, k in sens:
            mm, ff_, mr, fr = per_list(k)
            w_.writerow(["EXCLUDED (sensitive word match)", k, "", rk, tot[k], "N", "ethnonym/demonym/slur/rank or office title",
                         show(mm), show(ff_), mr or "", fr or ""])
    print("EDITORIAL examples:", [(e[0], e[1], e[3], e[4], e[5]) for e in ed])
    print("CALENDAR:", cal)
    print("SENSITIVE matches in top1000:", sens)
    sgjp_m1 = [f for f in conflict_forms if any(":m1" in tg for lid, e in sur.get(title(f), {}).items() for _, tg, _ in e)]
    print(f"PAIR-V1 collision forms (-SKA etc. with >=20 entries in the M list): {len(conflict_forms)}; "
          f"with an SGJP masculine (m1) surname lemma: {len(sgjp_m1)}; examples {sorted(sgjp_m1)[:10]}")
    odm_hits = {b.upper(): f26.get(b.upper()) for b in odm_bases}
    print("SGJP odmężowskie/odojcowskie lemmas:", len(odm_bases), "published in F list 2026:",
          {k: v for k, v in odm_hits.items() if v})

    # ---------------- A10 ----------------
    trivia = []
    # per-list eligibility (rule 7 applied to each list; paired totals are kept only as an internal column)
    units20 = {k: t for k, t in tot.items() if eligible(k)}

    def tie(k):  # tie-break by M-list count, then F-list count (never by the M+F sum)
        mm, ff_, _, _ = per_list(k)
        return (-(mm or 0), -(ff_ or 0), k)

    def trow(lab, i, k, val, note=""):
        mm, ff_, _, _ = per_list(k)
        return [lab, i, k, val, tot[k], note, c.feminine_of(k), show(mm), show(ff_)]

    single = {k: t for k, t in units20.items() if k.isalpha()}  # letters only: no hyphen/space/apostrophe
    for lab, pool in (("longest_single_word_any_script", single),
                      ("longest_single_word_polish_alphabet", {k: t for k, t in single.items() if set(k) <= PL_ALPHABET})):
        for i, k in enumerate(sorted(pool, key=lambda k: (-len(k),) + tie(k))[:15], 1):
            trivia.append(trow(lab, i, k, len(k)))
    polish = {k: t for k, t in single.items() if set(k) <= PL_ALPHABET}
    ndia = {k: len(set(k) & PL_DIACRITICS) for k in polish}
    mx = max(ndia.values())
    for i, k in enumerate(sorted([k for k in polish if ndia[k] >= mx - 1], key=lambda k: (-ndia[k],) + tie(k))[:15], 1):
        trivia.append(trow("most_distinct_polish_diacritics", i, k, ndia[k], "".join(sorted(set(k) & PL_DIACRITICS))))
    alld = [k for k in polish if len(k) >= 3 and all(ch in PL_DIACRITICS for ch in k)]
    share_d = {k: sum(ch in PL_DIACRITICS for ch in k) / len(k) for k in polish if len(k) >= 4}
    for i, k in enumerate(sorted(share_d, key=lambda k: (-share_d[k],) + tie(k))[:10], 1):
        trivia.append(trow("highest_share_of_diacritic_letters_len4plus", i, k, f"{share_d[k]:.2f}"))
    print("A10 all-diacritic forms (>=3 letters, >=20 entries):", alld)
    # consonant runs (letters of the Polish alphabet; digraphs counted as letters)
    def run(k):
        best = cur = 0
        for ch in k:
            cur = cur + 1 if ch not in PL_VOWELS else 0
            best = max(best, cur)
        return best
    runs = {k: run(k) for k in polish}
    for i, k in enumerate(sorted(polish, key=lambda k: (-runs[k],) + tie(k))[:12], 1):
        trivia.append(trow("longest_consonant_letter_run", i, k, runs[k]))
    for i, k in enumerate(sorted(polish, key=lambda k: (len(k),) + tie(k))[:12], 1):
        trivia.append(trow("shortest_polish_alphabet", i, k, len(k)))
    # palindromes: the M-list form or the F-list form reads the same backwards (checked per form)
    pal = [k for k in single if len(k) >= 3 and (k == k[::-1] or c.feminine_of(k) == c.feminine_of(k)[::-1])]
    for i, k in enumerate(sorted(pal, key=tie), 1):
        trivia.append(trow("palindrome", i, k, len(k)))
    # frequency lists are built separately for each list (never ranked on M+F sums)
    for letter in "QVX":
        for s_, d_ in (("M", m26), ("F", f26)):
            pool = {k: n for k, n in d_.items() if letter in k and n >= MIN_ED and not c.is_placeholder(k)}
            for i, k in enumerate(sorted(pool, key=lambda k: (-pool[k], k))[:10], 1):
                trivia.append([f"contains_{letter}_{s_}_list", i, k, "", "", f"{s_}-list form",
                               k, pool[k] if s_ == "M" else "", pool[k] if s_ == "F" else ""])
    with open(os.path.join(OUT, "letters_trivia_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w_ = csv.writer(fh)
        w_.writerow(["list", "position", "unit_key", "metric_value", "paired_total_2026_internal", "note",
                     "female_list_form", "M_list_entries_2026", "F_list_entries_2026"])
        w_.writerows(trivia)
    for r in trivia:
        print("A10", r)
    print("A10 counts: eligible units (>=20 in M or F list)", len(units20), "(paired total >=20:",
          sum(1 for t in tot.values() if t >= MIN_ED), ") single-word", len(single), "polish-alphabet single-word", len(polish),
          "max distinct diacritics", mx, "palindromes", len(pal))

    # first letter
    fl_e, fl_u = Counter(), Counter()
    for k, t in tot.items():
        fl_e[k[0]] += t
        fl_u[k[0]] += 1
    te, tu = sum(fl_e.values()), sum(fl_u.values())
    fl_l = {}
    for s_, d_ in (("M", m26), ("F", f26)):
        ce, cf_ = Counter(), Counter()
        for k, n in d_.items():
            if not c.is_placeholder(k):
                ce[k[0]] += n
                cf_[k[0]] += 1
        fl_l[s_] = (ce, cf_, sum(ce.values()), sum(cf_.values()))
    with open(os.path.join(OUT, "first_letter_2026.csv"), "w", newline="", encoding="utf-8") as fh:
        w_ = csv.writer(fh)
        w_.writerow(["first_letter", "M_list_entries", "M_list_share_of_entries_pct", "M_list_forms", "M_list_share_of_forms_pct",
                     "F_list_entries", "F_list_share_of_entries_pct", "F_list_forms", "F_list_share_of_forms_pct",
                     "paired_units_entries_internal", "paired_share_of_entries_pct_internal", "paired_units_internal",
                     "paired_share_of_units_pct_internal"])
        for L, e in sorted(fl_e.items(), key=lambda kv: -kv[1]):
            if e / te >= 0.0001 or L in "QVXĆŁŚŹŻ":
                row = []
                for s_ in "MF":
                    ce, cf_, se, sf = fl_l[s_]
                    row += [ce[L], f"{100 * ce[L] / se:.3f}", cf_[L], f"{100 * cf_[L] / sf:.3f}"]
                w_.writerow([L] + row + [e, f"{100 * e / te:.3f}", fl_u[L], f"{100 * fl_u[L] / tu:.3f}"])
    print("A10 first letters (entries):", [(L, f"{100 * e / te:.2f}") for L, e in fl_e.most_common(8)])
    for s_ in "MF":
        ce, cf_, se, sf = fl_l[s_]
        print(f"A10 first letters {s_} list (entries):", [(L, f"{100 * e / se:.2f}") for L, e in ce.most_common(8)])
    print("A10 first letters (units):", [(L, f"{100 * n / tu:.2f}") for L, n in fl_u.most_common(8)])
    for L in "ĄĘŃÓ":
        print("  starts with", L, fl_e.get(L, 0), fl_u.get(L, 0))

    # rare letters by year
    rl = []
    for yy in c.PAIRED_YEARS:
        allf = Counter()
        for s in "MF":
            for k, n in c.living(s, yy).items():
                if not c.is_placeholder(k):
                    allf[k] += n
        T = sum(allf.values())
        for letter in "QVX":
            e = sum(n for k, n in allf.items() if letter in k)
            f_ = sum(1 for k in allf if letter in k)
            rl.append([yy, c.ref_date("M", yy), "M+F (internal)", letter, e, f"{100 * e / T:.4f}", f_])
    for yy in c.YEARS:
        for s_ in "MF":
            if (s_, yy) not in c.LIVING:
                continue
            d_ = {k: n for k, n in c.living(s_, yy).items() if not c.is_placeholder(k)}
            T = sum(d_.values())
            for letter in "QVX":
                e = sum(n for k, n in d_.items() if letter in k)
                rl.append([yy, c.ref_date(s_, yy), f"{s_} list", letter, e, f"{100 * e / T:.4f}",
                           sum(1 for k in d_ if letter in k)])
    with open(os.path.join(OUT, "rare_letters_by_year.csv"), "w", newline="", encoding="utf-8") as fh:
        w_ = csv.writer(fh)
        w_.writerow(["year_label", "reference_date", "list", "letter", "entries_of_forms_containing", "share_of_list_entries_pct",
                     "distinct_forms_containing"])
        w_.writerows(rl)
    print("A10 rare letters:", rl)

    # ---------------- A11 ----------------
    dec = []
    cov_masc = cov_fem = n_ski = n_var = n_depr = 0
    var_examples, var_slots = [], Counter()
    for k in top:
        t = title(k)
        in_sgjp = t in sur_bases
        cov_masc += in_sgjp
        if k.endswith(("SKI", "CKI", "DZKI")):
            n_ski += 1
            cov_fem += title(c.feminine_of(k)) in sur_bases
        lem = {lid: e for lid, e in sur.get(t, {}).items() if any(":m1" in tg for _, tg, _ in e)}
        has_var = False
        for lid, e in lem.items():
            table, depr = lemma_summary(e)
            if depr:
                n_depr += 1
            for slot, forms in table.items():
                if len(forms) >= 2 and slot[1] != "voc":
                    has_var = True
                    var_slots[slot] += 1
            if has_var and len(var_examples) < 25:
                var_examples.append((k, {f"{a}.{b}": sorted(v) for (a, b), v in table.items() if len(v) >= 2}))
        n_var += has_var
    print(f"A11 coverage top1000: masculine/base form as SGJP surname lemma {cov_masc}/1000; -SKI feminine lemma {cov_fem}/{n_ski}")
    print(f"A11 top1000 with >=2 accepted forms in one non-vocative slot: {n_var}; slots {var_slots.most_common(6)}")
    print("A11 variant examples:", var_examples[:25])
    print("A11 masculine lemmas with a depr (pejorative plural) form:", n_depr)

    part = []
    for key, label in c.SHOWCASE:
        t = title(key)
        lemmas = sur.get(t, {})
        m_lem = {lid: e for lid, e in lemmas.items() if any(":m1" in tg for _, tg, _ in e)}
        f_lem = {lid: e for lid, e in lemmas.items() if all(":f" in tg for _, tg, _ in e)}
        row = {"showcase": label, "masc_nom": "", "masc_gen": "", "family_plural_nom": "", "depr_form_in_sgjp": "",
               "feminine_form": "", "feminine_gen": "", "feminine_declines": "", "variant_slots": "",
               "odmezowskie_odojcowskie": "", "sgjp_lemma_ids": "; ".join(sorted(lemmas))}
        for lid, e in m_lem.items():
            table, depr = lemma_summary(e)
            row["masc_nom"] = "/".join(sorted(table.get(("sg", "nom"), [])))
            row["masc_gen"] = "/".join(sorted(table.get(("sg", "gen"), [])))
            row["family_plural_nom"] = "/".join(sorted(table.get(("pl", "nom"), [])))
            row["depr_form_in_sgjp"] = "yes (pejorative form excluded, not shown)" if depr else "no"
            row["variant_slots"] = "; ".join(f"{a}.{b}={'/'.join(sorted(v))}" for (a, b), v in sorted(table.items())
                                             if len(v) >= 2 and b != "voc")
        if key.endswith(("SKI", "CKI", "DZKI")) and key not in c.INVARIANT_OVERRIDE:
            ft = title(c.feminine_of(key))
            fl = sur.get(ft, {})
            for lid, e in fl.items():
                table, _ = lemma_summary(e)
                row["feminine_form"] = ft
                row["feminine_gen"] = "/".join(sorted(table.get(("sg", "gen"), [])))
                row["feminine_declines"] = "yes (adjectival declension)" if len({f for f, _, _ in e}) > 1 else "no"
        else:
            for lid, e in f_lem.items():
                if "odm" in e[0][2]:
                    continue
                table, _ = lemma_summary(e)
                forms = {f for f, _, _ in e}
                row["feminine_form"] = t + " (same form)"
                row["feminine_gen"] = "/".join(sorted(table.get(("sg", "gen"), [])))
                row["feminine_declines"] = "yes" if len(forms) > 1 else "no (indeclinable for a woman)"
        odm = sorted({lid for lid, e in sur.get(t + "owa", {}).items()} | {lid for lid, e in sur.get(t + "ówna", {}).items()})
        row["odmezowskie_odojcowskie"] = "; ".join(odm)
        dec.append(row)
        for fld in ("masc_gen", "family_plural_nom", "feminine_gen", "feminine_declines", "variant_slots"):
            if row[fld]:
                part.append([label, "A11", fld, row[fld], "SGJP lemma(s): " + row["sgjp_lemma_ids"], "SGJP 2026-08-24",
                             "sgjp.tab.gz", "SGJP forms, depr excluded", "VERIFIED (dictionary says X)"])
        w = key.lower()
        part.append([label, "A9", "equals_lowercase_sjp_base_form", "Y" if w in lower else "N", f"'{w}'",
                     "sjp.pl odm.txt 2026-09-01", "sjp_odm.zip", "exact string match, lowercase base form",
                     "VERIFIED (lexical match only; not etymology)"])
    # coverage summary rows appended to the same CSV
    with open(os.path.join(OUT, "sgjp_declension.csv"), "w", newline="", encoding="utf-8") as fh:
        w_ = csv.writer(fh)
        cols = list(dec[0].keys())
        w_.writerow(cols)
        for r in dec:
            w_.writerow([r[k] for k in cols])
        w_.writerow([])
        w_.writerow(["SUMMARY top-1000 PAIR-V1 units 2026", f"masc/base form is an SGJP surname lemma: {cov_masc}/1000",
                     f"-SKI/-CKI/-DZKI units whose feminine is an SGJP surname lemma: {cov_fem}/{n_ski}",
                     f">=2 accepted forms in one non-vocative slot: {n_var}",
                     f"masculine lemmas with depr plural: {n_depr}", "", "", "", "", "", ""])
    for r in dec:
        print("A11", r)

    # ---------------- female-list adjectival -Y / -A ----------------
    adj = [(k, a) for k, a in adj_pairs if "adjective" in pos.get(k.lower(), {})]
    f19 = c.living("F", "2019")
    agg = {"Y": [0, 0, 0], "A": [0, 0, 0]}
    rows_adj = []
    for k, a in adj:
        agg["Y"][0] += f26[k]; agg["Y"][1] += inf26[k]; agg["Y"][2] += f19.get(k, 0)
        agg["A"][0] += f26[a]; agg["A"][1] += inf26[a]; agg["A"][2] += f19.get(a, 0)
        rows_adj.append([k, a, f26[k], inf26[k], f"{100 * (inf26[k] - f26[k]) / inf26[k]:.1f}", f19.get(k, "<2 or absent"),
                         f26[a], inf26[a], f"{100 * (inf26[a] - f26[a]) / inf26[a]:.1f}", f19.get(a, "<2 or absent")])
    rows_adj.sort(key=lambda r: -(r[2] + r[6]))
    with open(os.path.join(OUT, "adjectival_forms_female_list.csv"), "w", newline="", encoding="utf-8") as fh:
        w_ = csv.writer(fh)
        w_.writerow(["masc_looking_form_in_F_list", "fem_form_in_F_list", "Y_living_2026", "Y_incl_deceased_2026",
                     "Y_ageing_index_pct", "Y_living_2019", "A_living_2026", "A_incl_deceased_2026", "A_ageing_index_pct",
                     "A_living_2019"])
        w_.writerow(["ALL PAIRS (SGJP adjective, both forms >=20 in F list)", len(adj), agg["Y"][0], agg["Y"][1],
                     f"{100 * (agg['Y'][1] - agg['Y'][0]) / agg['Y'][1]:.2f}", agg["Y"][2], agg["A"][0], agg["A"][1],
                     f"{100 * (agg['A'][1] - agg['A'][0]) / agg['A'][1]:.2f}", agg["A"][2]])
        w_.writerows(rows_adj[:40])
    print("ADJ pairs (SGJP-confirmed):", len(adj), "of candidates", len(adj_pairs), agg)
    with open(os.path.join(PARTS, "showcase_a09_a11.csv"), "w", newline="", encoding="utf-8") as fh:
        csv.writer(fh).writerows(part)


if __name__ == "__main__":
    main()

"""C3 - Similar spellings in the US Census files for the showcase surnames (method usvariant-v1).

For each showcase surname (fold-v1 key of the male/identical form) every US 2020 / US 2000 surname is listed that is:
  edit1        : Levenshtein distance 1 from the key over A-Z (one substitution, insertion or deletion);
  suffix       : -SKI/-CKI/-DZKI -> -SKY/-CKY/-DZKY or -SKE/-CKE/-DZKE;
  W->V (all)   : every W replaced by V (single W->V changes are already edit1);
  combination  : W->V (all) + suffix rule;
  female form  : the -SKA/-CKA/-DZKA form (the US file has one form per surname string).
These are SIMILAR SPELLINGS ONLY - not evidence of relation, origin or shared ancestry. US counts are people with that
surname string in the census (2020: noise-infused; files list only surnames with >= 100 bearers); a spelling missing
from a US file is 'not listed (<100 or absent)', never zero. PESEL columns show whether the variant string (fold-v1)
also appears in the 2026-01-20 national files (male and female files separately; missing = <2 or absent).
Output: repo us_similar_spellings.csv
"""
import numpy as np, pandas as pd
from common import *
from common import _read_pesel

AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
SUF = [('DZKI', 'DZKY', 'DZKE', 'DZKA'), ('SKI', 'SKY', 'SKE', 'SKA'), ('CKI', 'CKY', 'CKE', 'CKA')]


def edit1(s):
    out = set()
    for i in range(len(s) + 1):
        for c in AZ:
            out.add(s[:i] + c + s[i:])
            if i < len(s):
                out.add(s[:i] + c + s[i + 1:])
        if i < len(s):
            out.add(s[:i] + s[i + 1:])
    out.discard(s)
    return out


def lev(a, b):
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return d[-1]


def candidates(key):
    c = {}
    for v in edit1(key):
        c.setdefault(v, []).append('edit1')
    for m, y, e, f in SUF:
        if key.endswith(m):
            stem = key[: -len(m)]
            c.setdefault(stem + y, []).append('suffix -' + m + '->-' + y)
            c.setdefault(stem + e, []).append('suffix -' + m + '->-' + e)
            c.setdefault(stem + f, []).append('female form -' + f)
            if 'W' in stem:
                sv = stem.replace('W', 'V')
                c.setdefault(sv + y, []).append('W->V (all) + -' + m + '->-' + y)
                c.setdefault(sv + e, []).append('W->V (all) + -' + m + '->-' + e)
            break
    if key.count('W') >= 1:
        c.setdefault(key.replace('W', 'V'), []).append('W->V (all)')
    c.pop(key, None)
    return c


def main():
    us20 = load_us2020(); us20 = us20[us20['name'] != 'ALL OTHER NAMES'].set_index('name')
    us00 = load_us2000().set_index('name')
    pm = _read_pesel(PESEL_M_2026); pf = _read_pesel(PESEL_F_2026)
    pm = pm.assign(k=pm.surname.map(fold)).groupby('k')['n'].sum()
    pf = pf.assign(k=pf.surname.map(fold)).groupby('k')['n'].sum()
    rows = []
    for sur in SHOWCASE + SHOWCASE_EXTRA:
        key = fold(sur)
        base20 = us20['count'].get(key, np.nan)
        cands = candidates(key)
        cands = {v: r for v, r in cands.items() if v in us20.index or v in us00.index}
        allrows = [(key, ['showcase key itself'])] + sorted(cands.items(), key=lambda kv: (-us20['count'].get(kv[0], 0), -us00['count'].get(kv[0], 0), kv[0]))
        for v, rules in allrows:
            c20 = us20['count'].get(v, np.nan); c00 = us00['count'].get(v, np.nan)
            rows.append({'showcase_surname': sur, 'showcase_key_fold': key, 'us_spelling': v, 'rules': '; '.join(sorted(set(rules))),
                         'levenshtein': lev(key, v),
                         'us2020': c20, 'us2020_rank': us20['rank'].get(v, np.nan), 'us2000': c00, 'us2000_rank': us00['rank'].get(v, np.nan),
                         'us_change_pct': round((c20 / c00 - 1) * 100, 1) if pd.notna(c20) and pd.notna(c00) else np.nan,
                         'us2020_vs_key_pct': round(c20 / base20 * 100, 1) if pd.notna(c20) and pd.notna(base20) else np.nan,
                         'pesel_m_2026_same_string': pm.get(v, np.nan), 'pesel_f_2026_same_string': pf.get(v, np.nan)})
    T = pd.DataFrame(rows)
    for c in ['us2020', 'us2020_rank', 'us2000', 'us2000_rank', 'pesel_m_2026_same_string', 'pesel_f_2026_same_string']:
        T[c] = T[c].astype('Int64')
    T['us2020_status'] = np.where(T['us2020'].notna(), 'listed', 'not listed (<100 or absent)')
    T['us2000_status'] = np.where(T['us2000'].notna(), 'listed', 'not listed (<100 or absent)')
    T['pesel_status'] = np.where(T['pesel_m_2026_same_string'].notna() | T['pesel_f_2026_same_string'].notna(),
                                 'string also in 2026 PESEL file(s)', 'not listed in 2026 PESEL files (<2 or absent)')
    T.insert(0, 'method', 'usvariant-v1 (fold-v1; edit1 / suffix / W->V / female form); similar spelling, not evidence of relation')
    T.to_csv(REPO_OUT + '/us_similar_spellings.csv', index=False)
    pd.set_option('display.width', 250)
    print(T.drop(columns=['method', 'showcase_key_fold', 'us2020_status', 'us2000_status', 'pesel_status']).to_string(index=False))


if __name__ == '__main__':
    main()

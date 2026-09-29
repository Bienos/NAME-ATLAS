"""C4 - German WWI casualty lists 1914-1919: coverage, and surname matching to today's PESEL register
(methods wwiname-v1, fold-v1, wwimatch-v1).

Source: Verein fuer Computergenealogie, Verlustlisten 1. Weltkrieg (Deutschland), data status 2025-10-14, CC0
(Zenodo DOI 10.5281/zenodo.18330751), 8,551,758 list entries. Entries are LIST ENTRIES, not people: the lists also
print corrections and follow-up notices (the documentation says so), so one soldier can appear several times.
Status is used only as a dataset-level aggregate. No person-level row is ever written to the repo.

Matching rule wwimatch-v1: the raw 'lastname' is cleaned with wwiname-v1 (common.clean_wwi_surname), uppercased and
folded with fold-v1; it matches when it equals the fold-v1 form of a surname in the 2026-01-20 national male PESEL
file (living persons; only surnames with >= 2 entries are published). All PESEL spellings that fold to the same key are
pooled (e.g. WIŚNIEWSKI + WISNIEWSKI); the dominant spelling is reported. No other spelling normalisation (German
sch/sz, w/v, -ky/-ki, umlauts) is applied, so similar spellings are NOT merged.
Outputs: repo wwi_coverage.csv, wwi_surname_match.csv; scratch wwi_keys.parquet (row-aligned key per entry).
"""
import time
import numpy as np, pandas as pd, pyarrow.parquet as pq
from common import *
from common import _read_pesel

SPECIAL = ('zurückgekehrt', 'Przurückgekehrte', 'Vermissten-Nachweis', 'Austausch', '^Austausch', 'Sonder-Verlustliste',
           'Internierte', 'in', 'In', 'aus', 'Kriegsgefangene')


def army_group(liste: pd.Series) -> pd.Series:
    t = liste.str.strip().str.split(' ').str[0].fillna('')
    t = t.str.lstrip('^')
    g = pd.Series('other or unparsed', index=liste.index, dtype=object)
    g[t.isin(['Preußen', 'Preussen', 'Preußische', 'Nachtrag'])] = 'Preußen (Prussia)'
    g[t == 'Bayern'] = 'Bayern (Bavaria)'
    g[t == 'Sachsen'] = 'Sachsen (Saxony)'
    g[t == 'Württemberg'] = 'Württemberg'
    g[t == 'Marine'] = 'Marine (Imperial Navy)'
    g[t.isin(['Schutztruppen', 'Schutztruppe'])] = 'Schutztruppen (colonial troops)'
    sp = t.str.startswith(('zurückgekehrt', 'Przurückgekehrt', 'Vermissten-Nachweis', 'Austausch', 'Sonder-Verlustliste',
                           'Internierte', 'Kriegsgefangene')) | t.isin(['in', 'In', 'aus'])
    g[sp] = 'special lists (returned/exchanged/interned POWs, missing-person notices, unidentified)'
    return g


def pesel_fold_table(path):
    """fold-v1 key -> total entries, dominant spelling, number of spellings, dominant share (one PESEL file)."""
    p = _read_pesel(path)
    p['key'] = p['surname'].map(fold)
    p = p.sort_values(['key', 'n'], ascending=[True, False])
    g = p.groupby('key')
    t = pd.DataFrame({'n': g['n'].sum(), 'spelling': g['surname'].first(), 'n_dom': g['n'].first(), 'n_spellings': g.size()})
    t['dominant_share'] = t['n_dom'] / t['n']
    return t


def main():
    t0 = time.time()
    w = pq.read_table(WWI_PARQUET, columns=['lastname', 'Liste', 'Datum', 'Status', 'Ort', 'GOV-Id']).to_pandas()
    N = len(w)
    print('entries', N, 'read secs', round(time.time() - t0, 1))
    rows = []

    def add(section, item, n, denom=N, note=''):
        rows.append({'section': section, 'item': item, 'entries': int(n), 'share_pct': round(n / denom * 100, 2) if denom else None,
                     'denominator': int(denom), 'note': note})

    add('dataset', 'all list entries', N, note='list entries, not unique people (lists include corrections and follow-ups)')
    add('dataset', 'distinct raw lastname strings', w['lastname'].nunique(), note='count of distinct strings, not entries')
    add('dataset', 'distinct Ort strings', w['Ort'].str.strip().nunique(), note='count of distinct strings, not entries')
    add('dataset', 'distinct GOV-Id values', w['GOV-Id'].str.strip().replace('', np.nan).nunique(), note='count of distinct IDs, not entries')

    grp = army_group(w['Liste'])
    for k, v in grp.value_counts().items():
        add('list (army contingent)', k, v)
    yr = w['Datum'].str.strip().str[:4].replace('', 'no date')
    for k, v in yr.value_counts().sort_index().items():
        add('issue date (year)', k, v, note='date of the list issue (Datum), not date of the event')
    d = w['Datum'].str.strip(); d = d[d != '']
    add('issue date (year)', f'range {d.min()} to {d.max()}', len(d))
    st = w['Status'].str.strip()
    st = st.where(st.isin(['verwundet', 'tot', 'vermisst', 'gefangen', 'zurückgekehrt']), 'empty or other')
    for k, v in st.value_counts().items():
        add('status (dataset-level aggregate only)', k, v, note='never shown per person; causes not in data (INSUFFICIENT_DATA)')

    ort = w['Ort'].str.strip(); gov = w['GOV-Id'].str.strip()
    add('place fields', 'Ort (place) present', (ort != '').sum(), note='documentation: the place given is the Geburtsort (place of birth)')
    add('place fields', 'Ort contains a comma qualifier (district/region)', ort.str.contains(',').sum())
    add('place fields', 'GOV-Id present', (gov != '').sum(), note='link to the GOV historical gazetteer (genealogy.net)')
    add('place fields', 'Ort present but GOV-Id empty', ((ort != '') & (gov == '')).sum())
    add('place fields', 'GOV-Id present but Ort empty', ((ort == '') & (gov != '')).sum())

    # ---------------- surname cleaning (on distinct strings, mapped back)
    u = w['lastname'].value_counts()
    cl = pd.DataFrame([clean_wwi_surname(s) for s in u.index], columns=['key', 'reason'], index=u.index)
    cl['n'] = u.values
    key = w['lastname'].map(cl['key']).fillna('')
    reason = w['lastname'].map(cl['reason'])
    rmap = {'ok': 'single-token surname (kept)', 'complex': 'multi-token / particle ", v." / other complex form (excluded)',
            'particle': 'nobiliary particle tail, e.g. ", von" / ", de" (excluded)', 'uncertain_or_correction': 'illegible "{}" or "{korr." correction (excluded)',
            'empty': 'empty (excluded)'}
    for k, v in reason.value_counts().items():
        add('surname cleaning wwiname-v1', rmap.get(k, k), v)
    print('cleaning secs', round(time.time() - t0, 1))

    # ---------------- match to PESEL 2026 male file (fold-v1 pooled spellings)
    M = pesel_fold_table(PESEL_M_2026)
    F = pesel_fold_table(PESEL_F_2026)
    kept = key != ''
    m_n = key.map(M['n'])
    matched = kept & m_n.notna()
    add('PESEL match wwimatch-v1', 'matched: cleaned surname = fold of a 2026 male-file surname', matched.sum(), note='denominator = all entries')
    add('PESEL match wwimatch-v1', 'matched (share of kept single-token entries)', matched.sum(), denom=int(kept.sum()))
    bins = [(1000, 10 ** 9, '>= 1,000'), (100, 999, '100-999'), (20, 99, '20-99'), (2, 19, '2-19')]
    for lo, hi, lab in bins:
        add('PESEL match wwimatch-v1', f'matched, 2026 male-file entries {lab}', (matched & m_n.between(lo, hi)).sum(), denom=int(kept.sum()))
    fonly = kept & ~matched & key.isin(F.index)
    add('PESEL match wwimatch-v1', 'not in male file but cleaned surname = fold of a 2026 female-file surname', fonly.sum(), denom=int(kept.sum()))
    add('PESEL match wwimatch-v1', 'not matched (not in 2026 file with >= 2 entries; may be absent, single, or spelled differently)',
        (kept & ~matched & ~fonly).sum(), denom=int(kept.sum()), note='not matched is not zero bearers')
    amb = matched & key.map(M['dominant_share']).lt(0.95)
    add('PESEL match wwimatch-v1', 'matched to a fold-ambiguous key (dominant PESEL spelling < 95%)', amb.sum(), denom=int(matched.sum()))

    # distinct surname forms
    ks = pd.Series(key[kept]).value_counts()
    km = ks[ks.index.isin(M.index)]
    add('PESEL match wwimatch-v1', 'distinct cleaned surname forms (kept)', len(ks), denom=len(ks), note='forms, not entries')
    add('PESEL match wwimatch-v1', 'distinct cleaned surname forms matched', len(km), denom=len(ks), note='forms, not entries')
    add('PESEL match wwimatch-v1', 'distinct matched forms with >= 20 WWI entries', (km >= 20).sum(), denom=len(km), note='forms, not entries')
    add('PESEL match wwimatch-v1', 'distinct matched forms with >= 20 WWI entries and >= 20 male-file entries',
        ((km >= 20) & (km.index.map(M['n']) >= 20)).sum(), denom=len(km), note='forms, not entries')

    cov = pd.DataFrame(rows)
    cov.insert(0, 'dataset', 'Verlustlisten 1. Weltkrieg (VfCG, status 2025-10-14, CC0); PESEL 1681 M/F 2026-01-20')
    cov.to_csv(REPO_OUT + '/wwi_coverage.csv', index=False)
    print(cov[['section', 'item', 'entries', 'share_pct', 'denominator']].to_string())

    # ---------------- match table for surname forms (aggregate; >= 20 entries in each dataset)
    T = pd.DataFrame({'key_fold': km.index, 'wwi_entries': km.values})
    T['pesel_m_2026'] = T['key_fold'].map(M['n']).astype(int)
    T['pesel_m_spelling'] = T['key_fold'].map(M['spelling'])
    T['pesel_m_n_spellings'] = T['key_fold'].map(M['n_spellings']).astype(int)
    T['pesel_m_dominant_share'] = T['key_fold'].map(M['dominant_share']).round(3)
    T = T[(T['wwi_entries'] >= 20) & (T['pesel_m_2026'] >= 20)].sort_values('wwi_entries', ascending=False)
    T['wwi_rank_among_matched'] = np.arange(1, len(T) + 1)
    T['wwi_entries_per_100_pesel_m'] = (T['wwi_entries'] / T['pesel_m_2026'] * 100).round(1)
    T.insert(0, 'method', 'wwiname-v1+fold-v1+wwimatch-v1; >=20 entries in each dataset')
    T.head(1500).to_csv(REPO_OUT + '/wwi_surname_match.csv', index=False)
    print('match table rows (>=20/>=20):', len(T), '| written top 1500')
    print(T.head(25).drop(columns=['method']).to_string(index=False))

    # ---------------- scratch: row-aligned key per entry (no names leave the scratchpad)
    out = pd.DataFrame({'key': key.to_numpy(), 'matched_m': matched.to_numpy(), 'army': grp.to_numpy(), 'year': yr.to_numpy()})
    out.to_parquet(WORK + '/wwi_keys.parquet', index=False)
    print('secs', round(time.time() - t0, 1))


if __name__ == '__main__':
    main()

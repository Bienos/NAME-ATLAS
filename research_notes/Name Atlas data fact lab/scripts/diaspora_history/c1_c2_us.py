"""C1 + C2 - US Census 2000/2020 counts for surname forms in today's Polish PESEL register (methods fold-v1, pair-v1.1, usmatch-v1).

PESEL: 1681 living persons, national, 2026-01-20; paired totals keyed on the male form (pair-v1.1).
Folding: all Polish keys with the same folded spelling are summed (the US file cannot tell them apart); the dominant
spelling and its share are reported, and groups where the dominant spelling is < 95% are flagged fold_ambiguous.
US: 2020 Census last names (named rows only; the 'ALL OTHER NAMES' row is dropped) and 2000 Census surnames; race and
Hispanic columns are never loaded. Missing in a US file = not listed (fewer than ~100 bearers, or absent) - never zero.
Outputs (repo): us_vs_pl_top.csv (top 1,300 US-listed forms), us_editorial_lists.csv, us_top20_pl.csv, us_fold_ambiguity.csv, showcase_us.csv
"""
import os, time
import numpy as np, pandas as pd
from common import *

MIN_PL = 1000          # C1 scope: folded Polish total >= 1,000 PESEL entries
MIN_US_LIST = 1000     # editorial lists: US count >= 1,000 in each US year used
REPO_ROWS = 1300       # rows of us_vs_pl_top.csv kept in the repo (size limit)
os.makedirs(REPO_OUT, exist_ok=True)


def pesel_folded():
    agg, unp = load_pesel_national_paired()
    agg['m'] = agg['m'].fillna(0).astype(int); agg['f'] = agg['f'].fillna(0).astype(int)
    agg = agg.sort_values(['key_fold', 'total'], ascending=[True, False])
    g = agg.groupby('key_fold')
    out = pd.DataFrame({'pl_total': g['total'].sum(), 'pl_m': g['m'].sum(), 'pl_f': g['f'].sum(),
                        'n_pl_spellings': g.size(), 'pl_spelling': g['key'].first(), 'dominant_n': g['total'].first()})
    out['dominant_share'] = out['dominant_n'] / out['pl_total']
    sp = agg.groupby('key_fold').apply(lambda d: ' | '.join(f"{k} {n}" for k, n in zip(d['key'], d['total'])), include_groups=False)
    out['pl_spellings_detail'] = sp
    return out.reset_index(), agg, unp


def main():
    t0 = time.time()
    pl, agg, unp = pesel_folded()
    us20 = load_us2020(); us20 = us20[us20['name'] != 'ALL OTHER NAMES']
    us00 = load_us2000()
    print('US2020 named rows', len(us20), 'min count', us20['count'].min(), '| US2000 rows', len(us00), 'min count', us00['count'].min())
    pop20 = (us20['count'] / us20['prop100k'] * 1e5).median(); pop00 = (us00['count'] / us00['prop100k'] * 1e5).median()
    print('implied denominators (median count/prop100k*1e5): 2020', round(pop20), '2000', round(pop00), 'ratio', round(pop20 / pop00, 4))
    u20 = us20.set_index('name'); u00 = us00.set_index('name')

    T = pl[pl['pl_total'] >= MIN_PL].copy()
    T['us2020'] = T['key_fold'].map(u20['count']); T['us2020_rank'] = T['key_fold'].map(u20['rank'])
    T['us2020_per100k'] = T['key_fold'].map(u20['prop100k'])
    T['us2000'] = T['key_fold'].map(u00['count']); T['us2000_rank'] = T['key_fold'].map(u00['rank'])
    T['us2000_per100k'] = T['key_fold'].map(u00['prop100k'])
    T['us_change_pct'] = (T['us2020'] / T['us2000'] - 1) * 100
    T['us_share_change_pct'] = (T['us2020_per100k'] / T['us2000_per100k'] - 1) * 100
    T['us2020_per_100_pl'] = T['us2020'] / T['pl_total'] * 100
    T['fold_ambiguous'] = T['dominant_share'] < 0.95
    T['form_class'] = np.where(T['key_fold'].str.contains(r'(?:SKI|CKI|DZKI)$'), 'adjectival -ski/-cki/-dzki', 'other')
    fem = T['key_fold'].str.replace(r'(DZ|S|C)KI$', r'\1KA', regex=True)
    T['us2020_female_form_count'] = np.where(T['form_class'] != 'other', fem.map(u20['count']), np.nan)
    T['us2020_status'] = np.where(T['us2020'].notna(), 'listed', 'not listed (<100 or absent)')
    T['us2000_status'] = np.where(T['us2000'].notna(), 'listed', 'not listed (<100 or absent)')
    T = T.sort_values('pl_total', ascending=False)
    T['pl_rank_folded'] = np.arange(1, len(T) + 1)

    n = len(T); f20 = T['us2020'].notna().sum(); f00 = T['us2000'].notna().sum(); both = (T['us2020'].notna() & T['us2000'].notna()).sum()
    print(f'C1 scope: {n} folded Polish surname forms with >=1,000 PESEL entries; in US2020 {f20} ({f20/n:.1%}); in US2000 {f00} ({f00/n:.1%}); both {both}')
    print('fold-ambiguous groups in scope', int(T['fold_ambiguous'].sum()))
    print('median US change % (both years listed):', round(T['us_change_pct'].median(), 1), '| median share change %:', round(T['us_share_change_pct'].median(), 1))
    for fc in ['adjectival -ski/-cki/-dzki', 'other']:
        s = T[T.form_class == fc]
        print(fc, 'n', len(s), 'in US2020', int(s.us2020.notna().sum()), 'median change %', round(s.us_change_pct.median(), 1),
              'share of declines', round((s.us_change_pct < 0).mean(), 3), 'sum US2020', int(s.us2020.sum()), 'sum US2000 (same names, both listed)',
              int(s.loc[s.us2000.notna() & s.us2020.notna(), 'us2000'].sum()), int(s.loc[s.us2000.notna() & s.us2020.notna(), 'us2020'].sum()))
    ff = T.loc[T['us2020_female_form_count'].notna()].copy()
    ff['female_form'] = fem[ff.index]; ff['female_form_us2000'] = ff['female_form'].map(u00['count'])
    print('female -SKA/-CKA/-DZKA forms listed in US2020 for in-scope adjectival keys:', len(ff), 'of', int((T.form_class != 'other').sum()))
    print(ff[['key_fold', 'us2020', 'female_form', 'us2020_female_form_count', 'female_form_us2000']].sort_values('us2020_female_form_count', ascending=False).to_string(index=False))

    cols = ['pl_rank_folded', 'key_fold', 'pl_spelling', 'n_pl_spellings', 'dominant_share', 'fold_ambiguous', 'form_class', 'pl_total', 'pl_m', 'pl_f',
            'us2020', 'us2020_rank', 'us2000', 'us2000_rank', 'us_change_pct', 'us_share_change_pct', 'us2020_per_100_pl', 'us2020_status', 'us2000_status']
    out = T[cols].copy()
    for c in ['dominant_share', 'us_change_pct', 'us_share_change_pct', 'us2020_per_100_pl']:
        out[c] = out[c].round(3 if c == 'dominant_share' else 1)
    for c in ['us2020', 'us2020_rank', 'us2000', 'us2000_rank']:
        out[c] = out[c].astype('Int64')
    out.insert(0, 'method', 'fold-v1+pair-v1.1+usmatch-v1')
    # full C1 table is large (scratch copy us_vs_pl_all_scope.csv); the repo copy keeps the 1,300 most frequent Polish forms
    # that are listed in US 2020 (size limit ~200 KB); 'us2020_status' is dropped there because it is always 'listed'
    rep = out[out['us2020'].notna()].drop(columns=['us2020_status']).head(REPO_ROWS)
    rep.to_csv(REPO_OUT + '/us_vs_pl_top.csv', index=False)
    print('repo us_vs_pl_top.csv rows', len(rep), 'lowest pl_total', int(rep['pl_total'].min()))
    out.to_csv(WORK + '/us_vs_pl_all_scope.csv', index=False)

    # ---- fold ambiguity report
    amb = T[T['n_pl_spellings'] > 1].copy()
    amb['secondary_n'] = amb['pl_total'] - amb['dominant_n']
    amb = amb.sort_values('secondary_n', ascending=False)
    amb[['key_fold', 'pl_spelling', 'dominant_share', 'fold_ambiguous', 'pl_total', 'secondary_n', 'pl_spellings_detail', 'us2020']].head(60).to_csv(REPO_OUT + '/us_fold_ambiguity.csv', index=False)
    print('multi-spelling groups in scope', len(amb), '| ambiguous (<95% dominant)', int(amb['fold_ambiguous'].sum()))
    print(amb[['key_fold', 'dominant_share', 'pl_spellings_detail', 'us2020']].head(15).to_string())

    # ---- C2 editorial lists
    L = []
    E = T[(T['us2020'] >= MIN_US_LIST) & ~T['fold_ambiguous']]
    for label, sub in [('ratio_all_forms', E), ('ratio_adjectival_forms', E[E.form_class != 'other'])]:
        s = sub.sort_values('us2020_per_100_pl', ascending=False).head(25)
        L.append(s.assign(list=label, list_rank=np.arange(1, len(s) + 1)))
        s = sub.sort_values('us2020_per_100_pl', ascending=True).head(15)
        L.append(s.assign(list=label.replace('ratio', 'lowest_ratio'), list_rank=np.arange(1, len(s) + 1)))
    G = T[(T['us2020'] >= MIN_US_LIST) & (T['us2000'] >= MIN_US_LIST) & ~T['fold_ambiguous']]
    for label, sub in [('growth_all_forms', G), ('growth_adjectival_forms', G[G.form_class != 'other'])]:
        s = sub.sort_values('us_change_pct', ascending=False).head(15)
        L.append(s.assign(list=label, list_rank=np.arange(1, len(s) + 1)))
        s = sub.sort_values('us_change_pct', ascending=True).head(15)
        L.append(s.assign(list=label.replace('growth', 'decline'), list_rank=np.arange(1, len(s) + 1)))
    ed = pd.concat(L)
    ecols = ['list', 'list_rank', 'key_fold', 'pl_spelling', 'form_class', 'pl_total', 'us2020', 'us2000', 'us_change_pct', 'us_share_change_pct', 'us2020_per_100_pl']
    ed = ed[ecols].copy()
    for c in ['us_change_pct', 'us_share_change_pct', 'us2020_per_100_pl']:
        ed[c] = ed[c].round(1)
    for c in ['us2020', 'us2000']:
        ed[c] = ed[c].astype('Int64')
    ed.insert(0, 'method', 'fold-v1+pair-v1.1+usmatch-v1; min PL 1000, min US 1000 per year used; fold-ambiguous excluded')
    ed.to_csv(REPO_OUT + '/us_editorial_lists.csv', index=False)
    for lab in ed['list'].unique():
        print('\n==', lab); print(ed[ed['list'] == lab][['list_rank', 'pl_spelling', 'pl_total', 'us2020', 'us2000', 'us_change_pct', 'us_share_change_pct', 'us2020_per_100_pl']].head(12).to_string(index=False))

    # ---- top-20 Polish surnames in the US
    top20 = T.head(20)[['pl_rank_folded', 'pl_spelling', 'key_fold', 'pl_total', 'us2020', 'us2020_rank', 'us2000', 'us2000_rank', 'us_change_pct', 'us_share_change_pct', 'us2020_per_100_pl']].copy()
    for c in ['us2020', 'us2020_rank', 'us2000', 'us2000_rank']:
        top20[c] = top20[c].astype('Int64')
    for c in ['us_change_pct', 'us_share_change_pct', 'us2020_per_100_pl']:
        top20[c] = top20[c].round(1)
    top20.to_csv(REPO_OUT + '/us_top20_pl.csv', index=False)
    print('\n== top 20 PL in US'); print(top20.to_string(index=False))

    # ---- showcase
    keys = set(fold(k) for k in SHOWCASE + SHOWCASE_EXTRA)
    sc = pl[pl['key_fold'].isin(keys)].copy()
    sc['us2020'] = sc['key_fold'].map(u20['count']).astype('Int64'); sc['us2020_rank'] = sc['key_fold'].map(u20['rank']).astype('Int64')
    sc['us2000'] = sc['key_fold'].map(u00['count']).astype('Int64'); sc['us2000_rank'] = sc['key_fold'].map(u00['rank']).astype('Int64')
    sc['us_change_pct'] = ((sc['us2020'].astype(float) / sc['us2000'].astype(float) - 1) * 100).round(1)
    sc['us_share_change_pct'] = ((sc['key_fold'].map(u20['prop100k']) / sc['key_fold'].map(u00['prop100k']) - 1) * 100).round(1)
    sc['us2020_per_100_pl'] = (sc['us2020'].astype(float) / sc['pl_total'] * 100).round(1)
    sc['pl_rank_folded'] = sc['key_fold'].map(pl.sort_values('pl_total', ascending=False).reset_index(drop=True).reset_index().set_index('key_fold')['index'] + 1)
    sc['us2020_status'] = np.where(sc['us2020'].notna(), 'listed', 'not listed (<100 or absent)')
    sc['us2000_status'] = np.where(sc['us2000'].notna(), 'listed', 'not listed (<100 or absent)')
    sc = sc[['key_fold', 'pl_spelling', 'pl_spellings_detail', 'pl_rank_folded', 'pl_total', 'pl_m', 'pl_f', 'us2020', 'us2020_rank', 'us2000', 'us2000_rank',
             'us_change_pct', 'us_share_change_pct', 'us2020_per_100_pl', 'us2020_status', 'us2000_status']].sort_values('pl_total', ascending=False)
    sc.insert(0, 'method', 'fold-v1+pair-v1.1+usmatch-v1')
    sc.to_csv(REPO_OUT + '/showcase_us.csv', index=False)
    print('\n== showcase'); print(sc.drop(columns=['method']).to_string(index=False))
    print('secs', round(time.time() - t0, 1))


if __name__ == '__main__':
    main()

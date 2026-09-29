"""Prints the derived numbers and example sentences quoted in diaspora_history.md (reads the CSVs written by c1-c7 and
the scratch C1 table). Nothing here is new analysis; it only formats numbers that the other scripts computed."""
import numpy as np, pandas as pd
from common import *

R = REPO_OUT + '/'


def pl_int(n):
    return f"{int(n):,}".replace(',', ' ')


def pl_num(x):
    return str(x).replace('.', ',')


def main():
    A = pd.read_csv(WORK + '/us_vs_pl_all_scope.csv')
    both = A[A.us2020.notna() & A.us2000.notna()]
    adj = both[(both.form_class != 'other') & (both.us2020 >= 1000) & (both.us2000 >= 1000) & ~both.fold_ambiguous]
    print('C2 check: adjectival forms with >=1,000 in both US years (fold-unambiguous):', len(adj),
          '| max share change %:', adj.us_share_change_pct.max(), '| share with share change < 0:', round((adj.us_share_change_pct < 0).mean(), 4),
          '| count change > 0:', int((adj.us_change_pct > 0).sum()))
    oth = both[(both.form_class == 'other') & (both.us2020 >= 1000) & (both.us2000 >= 1000) & ~both.fold_ambiguous]
    print('   other forms (same filter):', len(oth), '| share with share change < 0:', round((oth.us_share_change_pct < 0).mean(), 4))
    # female forms: which are also noun-type male surnames (pair-v1.1 tie-break set)?
    nt = noun_type_ska()
    fem = A[A.form_class != 'other'].key_fold.str.replace(r'(DZ|S|C)KI$', r'\1KA', regex=True)
    us20 = load_us2020().set_index('name')['count']; us00 = load_us2000().set_index('name')['count']
    F = pd.DataFrame({'key': A.loc[fem.index, 'key_fold'], 'fem': fem, 'us2020': fem.map(us20), 'us2000': fem.map(us00)}).dropna(subset=['us2020'])
    ntf = set(fold(x) for x in nt)
    F['noun_type_in_pesel'] = F.fem.isin(ntf)
    print('\nC1 female forms listed in US 2020:', len(F), '| of which noun-type male forms in PESEL:', int(F.noun_type_in_pesel.sum()), sorted(F[F.noun_type_in_pesel].fem))
    G = F[~F.noun_type_in_pesel]
    print('   female forms excluding noun-type:', len(G), '| sum 2020:', int(G.us2020.sum()), '| sum 2000 (listed):', int(G.us2000.sum()),
          '| listed in 2000:', int(G.us2000.notna().sum()))
    print(G.sort_values('us2020', ascending=False).to_string(index=False))

    # US showcase sentences
    S = pd.read_csv(R + 'showcase_us.csv')
    V = pd.read_csv(R + 'us_similar_spellings.csv')
    print()
    for _, r in S.iterrows():
        if pd.isna(r.us2020):
            print(f"EN {r.pl_spelling}: not listed in the 2020 or 2000 US census surname files (fewer than about 100 people or absent). "
                  f"Poland (PESEL, 20 Jan 2026): {int(r.pl_m):,} male-file and {int(r.pl_f):,} female-file entries (paired forms).")
            continue
        print(f"EN {r.pl_spelling}: In the 2020 US census, {int(r.us2020):,} people had the surname {r.key_fold} (2000: {int(r.us2000):,}; {r.us_change_pct:+.1f}%). "
              f"For every 100 entries in Poland's PESEL register (male file + paired female file: {int(r.pl_m):,} + {int(r.pl_f):,}), the 2020 US census lists "
              f"{r.us2020_per_100_pl} people with the spelling {r.key_fold}.")
        print(f"PL {r.pl_spelling}: W spisie powszechnym USA z 2020 r. nazwisko {r.key_fold} nosiło {pl_int(r.us2020)} osób (2000: {pl_int(r.us2000)}; "
              f"{pl_num(f'{r.us_change_pct:+.1f}')}%). W rejestrze PESEL (20.01.2026) jest {pl_int(r.pl_m)} wpisów w rejestrze mężczyzn i {pl_int(r.pl_f)} w rejestrze kobiet; "
              f"na każde 100 takich wpisów (obie płcie razem) przypada {pl_num(r.us2020_per_100_pl)} osób w spisie USA.")
    print()
    print(V[V.levenshtein > 0].sort_values('us2020', ascending=False)[['showcase_surname', 'us_spelling', 'rules', 'us2020', 'us2000', 'us_change_pct']].head(12).to_string(index=False))

    # WWI numbers
    C = pd.read_csv(R + 'wwi_coverage.csv')
    print('\n', C[['section', 'item', 'entries', 'share_pct', 'denominator']].to_string(index=False))
    P = pd.read_csv(R + 'persistence_summary.csv')
    print('\n', P[['variant', 'n_surname_forms', 'wwi_entries_used', 'pesel_entries_used', 'suppressed_cells', 'cells', 'observed_mean_overlap',
                    'baseline_mean_overlap', 'baseline_2.5pct', 'baseline_97.5pct', 'p_one_sided', 'mean_own_percentile_vs_other_surnames',
                    'share_surnames_own_above_chance', 'same_top_voivodeship_observed', 'same_top_voivodeship_baseline']].to_string(index=False))
    D = pd.read_parquet(WORK + '/persistence_by_surname_full.parquet')
    print('\nper-surname own overlap median', round(D.overlap.median(), 3), '| chance median', round(D.chance_overlap_mean_other_surnames.median(), 3))

    # ---- C1/C2 arithmetic quoted in the notes
    a = both[both.form_class != 'other']
    s00, s20 = a.us2000.sum(), a.us2020.sum()
    print('\nadjectival forms listed in both years:', len(a), '| sum 2000', int(s00), '| sum 2020', int(s20), '| change %', round((s20 / s00 - 1) * 100, 2))
    o = both[both.form_class == 'other']
    print('other forms listed in both years:', len(o), '| change %', round((o.us2020.sum() / o.us2000.sum() - 1) * 100, 2))
    T20 = pd.read_csv(R + 'us_top20_pl.csv')
    print("Poland's top 20 in the US: count change 2000->2020 negative for", int((T20.us_change_pct < 0).sum()), 'of', len(T20),
          '| range', T20.us_change_pct.min(), 'to', T20.us_change_pct.max(), '| NOVAK/NOWAK 2020 ratio',
          round(V.loc[V.us_spelling == 'NOVAK', 'us2020'].iloc[0] / V.loc[(V.us_spelling == 'NOWAK'), 'us2020'].iloc[0], 3))

    # ---- WWI data-quality numbers quoted in the notes (dataset-level aggregates only)
    import pyarrow.parquet as pq
    from c5a_gov_ids import normalise_gov
    w = pq.read_table(WWI_PARQUET, columns=['lastname', 'Ort', 'GOV-Id', 'Status', 'Liste']).to_pandas()
    print('\nWWI distinct Liste values:', w.Liste.nunique())
    pol = w.lastname.str.contains('[ĄĆĘŁŃÓŚŹŻąćęłńóśźż]')
    print('\nWWI raw lastnames with a Polish letter: entries', int(pol.sum()), '| distinct strings', w.lastname[pol].nunique())
    print('raw Status values (aggregate):', w.Status.value_counts().to_dict())
    L = pd.read_parquet(WORK + '/wwi_entry_loc.parquet')
    o = w.Ort.str.strip()
    for t in ['Königshütte', 'Ratibor', 'Beuthen', 'Tarnowitz', 'Zabrze', 'Myslowitz', 'Kattowitz', 'Gleiwitz', 'Hindenburg', 'Rybnik']:
        m = o == t
        print(f'plain Ort {t}: entries {int(m.sum())}, located {round((L.route[m] != "none").mean() * 100, 1)}%, top gov type {L.gov_type[m].value_counts().index[0]},',
              'located to', L.loc[m & (L.route != 'none')].groupby(['country', 'voiv']).size().sort_values(ascending=False).head(2).to_dict())
    g = normalise_gov(w['GOV-Id'])
    m = (o == 'Rybnik') & (L.voiv == 'łódzkie')
    print('Rybnik -> łódzkie: entries', int(m.sum()), '| GOV-Ids', g[m].value_counts().to_dict(), '| subsquare bounds', maidenhead_bounds('JO91GL'))
    p = pd.read_csv(PRNG_CACHE)
    print(p[p.name == 'Rybnik'][['name', 'kind', 'voivodeship', 'powiat', 'lat', 'lon']].to_string(index=False))
    u = L.route == 'none'
    op = u & L.gov_type.isin(['object', 'adm'])
    vc = g[op].value_counts()
    print('unlocated entries', int(u.sum()), '| by gov type', L.gov_type[u].value_counts().to_dict())
    print('unlocated opaque-ID entries', int(op.sum()), '| distinct IDs', len(vc), '|',
          {n: (round(vc.head(n).sum() / op.sum() * 100, 1), round(vc.head(n).sum() / u.sum() * 100, 1)) for n in [100, 1000, 5000]})
    loc = L[L.route != 'none']
    print('located entries in Kazakhstan', int((loc.country == 'Kazakhstan').sum()), '| outside Europe box', int((loc.country == 'outside Europe box').sum()),
          '| sea/unmatched', int((loc.country == 'no country (sea/unmatched)').sum()))
    print('Kazakhstan GOV-Ids:', g[(L.country == 'Kazakhstan')].value_counts().head(3).to_dict())
    # Ruhr box by surname form (matched forms with >= 200 point entries and >= 2,000 male-file entries)
    K = pd.read_parquet(WORK + '/wwi_keys.parquet', columns=['key', 'matched_m'])
    Rh = pd.read_parquet(WORK + '/wwi_entry_ruhr.parquet')
    t = pd.DataFrame({'k': K.key, 'm': K.matched_m, 'pt': Rh.point, 'r': Rh.ruhr_box})[K.matched_m & Rh.point]
    gg = t.groupby('k').agg(pt=('pt', 'size'), r=('r', 'sum'))
    from common import _read_pesel
    Mn = _read_pesel(PESEL_M_2026); Mk = Mn.assign(k=Mn.surname.map(fold)).groupby('k').n.sum()
    gg = gg[(gg.pt >= 200) & (gg.index.map(Mk) >= 2000)]
    gg['share'] = (gg.r / gg.pt * 100).round(1)
    print('Ruhr box: forms with >=200 point entries and >=2,000 male-file entries:', len(gg), '| max share', gg.share.max(), gg.share.idxmax(),
          '| median', gg.share.median(), '| all matched point entries', round(t.r.mean() * 100, 2))


if __name__ == '__main__':
    main()

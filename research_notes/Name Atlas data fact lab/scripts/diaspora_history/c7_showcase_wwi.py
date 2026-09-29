"""C7 - Historical showcase cards: German WWI casualty lists 1914-1919 x PESEL 2026 (methods wwiname-v1, fold-v1,
wwimatch-v1, loc-v1, persist-v1, card-v1).

Per showcase surname (male/identical form; the lists are soldiers' entries): list entries with that cleaned, folded
surname; where the printed place (Ort, documented as the Geburtsort) lies today (country; voivodeship inside today's
Poland); the 2026 distribution by voivodeship of permanent registered residence from the MALE and FEMALE voivodeship
files shown separately (never summed; female form = pair-v1.1 partner, e.g. KOWALSKA); top printed places (only
places with >= 5 entries, only for surnames with >= 20 entries); per-surname persistence metrics from c6.
Missing 2026 voivodeship cells are '<2 or absent' (never 0). Entries are list entries, not people.
Extras are picked by data rules (printed below and in common.py).
Outputs (repo): showcase_wwi.csv (long, per region), showcase_wwi_summary.csv, showcase_wwi_places.csv,\nwwi_top20_pl.csv (Poland's 20 most frequent male-file forms in the lists), wwi_geography_by_register_size.csv,
wwi_similar_spellings.csv (similar spellings in the lists; never merged)
"""
import numpy as np, pandas as pd, pyarrow.parquet as pq
from common import *
from common import _read_pesel

MIN_CARD = 20          # no breakdown below 20 entries
MIN_PLACE = 5          # a printed place is listed only with >= 5 entries
MIN_CELL = 5           # region cells with 1-4 list entries are suppressed in showcase_wwi.csv
SPELLING_ILLUSTRATIONS = ['DĄBROWSKI', 'SZYMAŃSKI']   # similar-spellings table only: illustrate German-orthography spellings in the lists
R9 = ['dolnośląskie', 'kujawsko-pomorskie', 'lubuskie', 'opolskie', 'pomorskie', 'śląskie', 'warmińsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie']
PL_NAMES = {'dolnośląskie': 'dolnośląskim', 'kujawsko-pomorskie': 'kujawsko-pomorskim', 'lubuskie': 'lubuskim', 'opolskie': 'opolskim',
            'pomorskie': 'pomorskim', 'śląskie': 'śląskim', 'warmińsko-mazurskie': 'warmińsko-mazurskim', 'wielkopolskie': 'wielkopolskim',
            'zachodniopomorskie': 'zachodniopomorskim', 'łódzkie': 'łódzkim', 'mazowieckie': 'mazowieckim', 'małopolskie': 'małopolskim',
            'lubelskie': 'lubelskim', 'podkarpackie': 'podkarpackim', 'podlaskie': 'podlaskim', 'świętokrzyskie': 'świętokrzyskim'}


def int_pl(n):
    return f"{int(n):,}".replace(',', '\u00a0')


def num_pl(x):
    return str(x).replace('.', ',')


def female_form(sur):
    for m, f in FEM_SUFFIX:
        if sur.endswith(m):
            return sur[: -len(m)] + f
    return sur


GERMAN_RULES = [('SZ', 'SCH'), ('CZ', 'TSCH'), ('ŚNI', 'SCHN'), ('Ś', 'SCH'), ('Y', 'I')]


def german_variants(sur):
    """wwivariant-v1 German-orthography rules on the Polish spelling (then fold-v1): SZ->SCH, CZ->TSCH, ŚNI->SCHN or Ś->SCH,
    Y->I, Ą/Ę->OM/EM before B/P else ON/EN, final K->CK, -SKI/-CKI->-SKY/-CKY. All rule subsets are applied."""
    import itertools, re as _re
    def nasal(x):
        x = _re.sub('Ą(?=[BP])', 'OM', x); x = _re.sub('Ę(?=[BP])', 'EM', x)
        return x.replace('Ą', 'ON').replace('Ę', 'EN')
    rules = [('SZ->SCH', lambda x: x.replace('SZ', 'SCH')), ('CZ->TSCH', lambda x: x.replace('CZ', 'TSCH')),
             ('Ś->SCH', lambda x: x.replace('ŚNI', 'SCHN').replace('Ś', 'SCH')), ('Y->I', lambda x: x.replace('Y', 'I')),
             ('Ą/Ę->OM/ON', nasal), ('final K->CK', lambda x: x[:-1] + 'CK' if x.endswith('K') else x),
             ('-SKI->-SKY', lambda x: _re.sub('(S|C)KI$', r'\1KY', x))]
    out = {}
    for r in range(1, len(rules) + 1):
        for combo in itertools.combinations(rules, r):
            v = sur
            for _, f in combo:
                v = f(v)
            v = fold(v)
            if v != fold(sur):
                out.setdefault(v, set()).add(' + '.join(n for n, _ in combo))
    # keep the shortest rule description per variant
    return {v: sorted(d, key=len)[0] for v, d in out.items()}


def check_extras():
    """Re-derive the three extras from the c6 per-surname table so the choice is reproducible."""
    D = pd.read_parquet(WORK + '/persistence_by_surname_full.parquet')
    D['excess'] = D['overlap'] - D['chance_overlap_mean_other_surnames']
    kp = D[(D.wwi_top_voivodeship == 'kujawsko-pomorskie') & (D.pesel_top_voivodeship == 'kujawsko-pomorskie')]
    e1 = kp.sort_values('wwi_entries_located_in_region', ascending=False).iloc[0]
    big = D[(D.wwi_entries_located_in_region >= 200) & (D.pesel_m_2026_entries_in_region >= 1000)]
    e2 = big.sort_values('excess', ascending=False).iloc[0]
    sl = D[D.wwi_top_voivodeship.isin(['śląskie', 'opolskie']) & D.pesel_top_voivodeship.isin(['śląskie', 'opolskie'])]
    e3 = sl.sort_values('wwi_entries_located_in_region', ascending=False).iloc[0]
    print('extras by rule:', e1.pesel_m_spelling, '| strongest excess:', e2.pesel_m_spelling, round(e2.excess, 3), f'(of {len(big)} forms)', '|', e3.pesel_m_spelling)
    return [e1.pesel_m_spelling, e2.pesel_m_spelling, e3.pesel_m_spelling]


def main():
    ex = check_extras()
    assert [fold(x) for x in ex] == [fold(x) for x in SHOWCASE_EXTRA], (ex, SHOWCASE_EXTRA)
    K = pd.read_parquet(WORK + '/wwi_keys.parquet', columns=['key', 'army'])
    L = pd.read_parquet(WORK + '/wwi_entry_loc.parquet', columns=['route', 'country', 'voiv'])
    Rh = pd.read_parquet(WORK + '/wwi_entry_ruhr.parquet')
    PS = pd.read_parquet(WORK + '/persistence_by_surname_full.parquet').set_index('key_fold')
    Mn = _read_pesel(PESEL_M_2026); Fn = _read_pesel(PESEL_F_2026)
    Mx = Mn.set_index('surname')['n']; Fx = Fn.set_index('surname')['n']
    Mf = Mn.assign(k=Mn.surname.map(fold)).groupby('k')['n'].sum(); Ff = Fn.assign(k=Fn.surname.map(fold)).groupby('k')['n'].sum()
    Mv = _read_pesel(PESEL_WOJ_M_2026); Fv = _read_pesel(PESEL_WOJ_F_2026)
    Mv['k'] = Mv.surname.map(fold); Fv['k'] = Fv.surname.map(fold)
    Mv = Mv.groupby(['k', 'voiv'])['n'].sum(); Fv = Fv.groupby(['k', 'voiv'])['n'].sum()

    names = SHOWCASE + SHOWCASE_EXTRA
    keys = [fold(s) for s in names]
    sel = K['key'].isin(keys).to_numpy()
    ort = pq.read_table(WWI_PARQUET, columns=['Ort']).column(0).to_pandas()[sel].str.strip()
    S = pd.DataFrame({'k': K['key'][sel].to_numpy(), 'army': K['army'][sel].to_numpy(), 'route': L['route'][sel].to_numpy(),
                      'country': L['country'][sel].to_numpy(), 'voiv': L['voiv'][sel].to_numpy(),
                      'point': Rh['point'][sel].to_numpy(), 'ruhr': Rh['ruhr_box'][sel].to_numpy(), 'ort': ort.to_numpy()})
    long_rows, summ, places = [], [], []
    for sur, k in zip(names, keys):
        fem = female_form(sur)
        s = S[S.k == k]
        n = len(s)
        m_nat, f_nat = Mx.get(sur, np.nan), Fx.get(fem, np.nan)
        base = {'surname': sur, 'key_fold': k, 'female_form': fem}
        loc = s[s.route != 'none']; pl = s[(s.country == 'Poland') & (s.voiv != '')]
        mv = {v: Mv.get((k, v), np.nan) for v in VOIV_ORDER}; fv = {v: Fv.get((fold(fem), v), np.nan) for v in VOIV_ORDER}
        m_pub = np.nansum(list(mv.values())); f_pub = np.nansum(list(fv.values()))
        m_r9 = np.nansum([mv[v] for v in R9])
        rec = dict(base, pesel_m_2026_national_exact=m_nat, pesel_f_2026_national_exact=f_nat, pesel_m_2026_national_folded=Mf.get(k, np.nan),
                   pesel_f_2026_national_folded=Ff.get(fold(fem), np.nan), pesel_m_2026_voiv_file_published=m_pub, pesel_f_2026_voiv_file_published=f_pub,
                   wwi_entries=n)
        if n == 0:
            rec['card_status'] = 'no entry with this cleaned spelling in the transcribed lists (not evidence of zero bearers in 1914-1919)'
            summ.append(rec); continue
        if n < MIN_CARD:
            rec['card_status'] = f'fewer than {MIN_CARD} entries: count only, no breakdown'
            summ.append(rec); continue
        vc = pl.voiv.value_counts()
        topv = vc.index[0] if len(vc) else ''
        pmv = pd.Series(mv).dropna()
        rec.update({'card_status': 'full card', 'wwi_share_preussen_pct': round((s.army == 'Preußen (Prussia)').mean() * 100, 1),
                    'wwi_located_pct': round(len(loc) / n * 100, 1), 'wwi_entries_poland_voiv': len(pl),
                    'wwi_poland_pct_of_all': round(len(pl) / n * 100, 1), 'wwi_poland_pct_of_located': round(len(pl) / max(1, len(loc)) * 100, 1),
                    'wwi_germany_pct_of_located': round((loc.country == 'Germany').mean() * 100, 1),
                    'wwi_other_countries_pct_of_located': round((~loc.country.isin(['Germany', 'Poland'])).mean() * 100, 1),
                    'wwi_point_entries': int(s.point.sum()), 'wwi_ruhr_box_pct_of_point': round(s.ruhr.sum() / max(1, s.point.sum()) * 100, 1),
                    'wwi_top_voivodeship': topv, 'wwi_top_voiv_entries': int(vc.iloc[0]) if len(vc) else 0,
                    'wwi_top_voiv_pct_of_all': round(vc.iloc[0] / n * 100, 1) if len(vc) else np.nan,
                    'wwi_top_voiv_pct_of_poland_located': round(vc.iloc[0] / len(pl) * 100, 1) if len(vc) else np.nan,
                    'pesel_m_top_voivodeship': pmv.idxmax(), 'pesel_m_top_voiv_pct': round(pmv.max() / m_pub * 100, 1),
                    'pesel_m_pct_in_wwi_top_voiv': round(mv.get(topv, np.nan) / m_pub * 100, 1) if topv else np.nan,
                    'pesel_f_pct_in_wwi_top_voiv': round(fv.get(topv, np.nan) / f_pub * 100, 1) if topv else np.nan,
                    'pesel_m_pct_in_wwi_top_voiv_within_R9': round(mv.get(topv, np.nan) / m_r9 * 100, 1) if topv in R9 else np.nan,
                    'pesel_f_pct_in_wwi_top_voiv_within_R9': round(fv.get(topv, np.nan) / np.nansum([fv[v] for v in R9]) * 100, 1) if topv in R9 else np.nan,
                    'wwi_top_voiv_pct_within_R9': round(vc.iloc[0] / pl.voiv.isin(R9).sum() * 100, 1) if topv in R9 else np.nan})
        supp = []
        for fld, num in [('wwi_germany_pct_of_located', int((loc.country == 'Germany').sum())),
                         ('wwi_other_countries_pct_of_located', int((~loc.country.isin(['Germany', 'Poland'])).sum())),
                         ('wwi_ruhr_box_pct_of_point', int(s.ruhr.sum()))]:
            if 1 <= num < MIN_CELL:
                rec[fld] = np.nan; supp.append(fld)
        rec['small_cells_suppressed'] = '; '.join(supp) + (f' (numerator 1-{MIN_CELL - 1} entries)' if supp else '')
        if k in PS.index:
            p = PS.loc[k]
            rec.update({'persist_overlap': p.overlap, 'persist_chance_overlap': p.chance_overlap_mean_other_surnames,
                        'persist_own_percentile': p.own_percentile, 'persist_in_test': True})
        else:
            rec.update({'persist_in_test': False})
        # code-built example sentences (English + Polish); male-file and female-file figures separate
        pct = rec['wwi_top_voiv_pct_of_all']
        en = (f"In the German casualty lists of 1914-1919, {n:,} entries carry the surname {sur}. For {pct}% of all these entries, the place "
              f"of birth printed in the list lies in today's {topv.capitalize()} voivodeship ({rec['wwi_located_pct']}% of entries could be placed at all). In 2026, "
              f"{rec['pesel_m_pct_in_wwi_top_voiv']}% of male-register entries {sur} and {rec['pesel_f_pct_in_wwi_top_voiv']}% of female-register entries {fem} "
              f"with a voivodeship of permanent registered residence are in {topv.capitalize()}.")
        pl_s = (f"W niemieckich listach strat z lat 1914-1919 nazwisko {sur} pojawia się w {int_pl(n)} wpisach; w {num_pl(pct)}% z nich podane "
                f"miejsce urodzenia leży dziś w województwie {PL_NAMES[topv]}. W 2026 r. w tym województwie zameldowanych na pobyt stały jest "
                f"{num_pl(rec['pesel_m_pct_in_wwi_top_voiv'])}% wpisów {sur} w rejestrze mężczyzn i "
                f"{num_pl(rec['pesel_f_pct_in_wwi_top_voiv'])}% wpisów {fem} w rejestrze kobiet (spośród wpisów z województwem).")
        rec['card_sentence_en'] = en
        rec['card_sentence_pl'] = pl_s
        summ.append(rec)
        # long rows: voivodeships
        for v in VOIV_ORDER:
            wn = int(vc.get(v, 0))
            long_rows.append(dict(base, region_type='voivodeship (today)', region=v, in_R9=v in R9, wwi_entries=wn,
                                  wwi_pct_of_all_entries=round(wn / n * 100, 1), wwi_pct_of_poland_located=round(wn / max(1, len(pl)) * 100, 1),
                                  pesel_m_2026=mv[v], pesel_m_pct=round(mv[v] / m_pub * 100, 1) if pd.notna(mv[v]) else np.nan,
                                  pesel_m_status='published' if pd.notna(mv[v]) else '<2 or absent',
                                  pesel_f_2026=fv[v], pesel_f_pct=round(fv[v] / f_pub * 100, 1) if pd.notna(fv[v]) else np.nan,
                                  pesel_f_status='published' if pd.notna(fv[v]) else '<2 or absent'))
        cc = loc.country.value_counts()
        for c, cn in cc.items():
            long_rows.append(dict(base, region_type='country (today)', region=c, wwi_entries=int(cn), wwi_pct_of_all_entries=round(cn / n * 100, 1),
                                  wwi_pct_of_located=round(cn / len(loc) * 100, 1)))
        long_rows.append(dict(base, region_type='not located', region='place not located', wwi_entries=int(n - len(loc)),
                              wwi_pct_of_all_entries=round((n - len(loc)) / n * 100, 1)))
        long_rows.append(dict(base, region_type='Ruhr-area box (point entries only)', region='51.35-51.70N 6.60-7.80E', wwi_entries=int(s.ruhr.sum()),
                              wwi_pct_of_point_entries=round(s.ruhr.sum() / max(1, s.point.sum()) * 100, 1)))
        # top printed places
        oc = s[s.ort != ''].ort.value_counts()
        for r, (o, on) in enumerate(oc[oc >= MIN_PLACE].head(5).items(), 1):
            so = s[s.ort == o]
            places.append(dict(base, place_rank=r, ort_as_printed=o, entries=int(on), pct_of_surname_entries=round(on / n * 100, 1),
                               located_country=so.country.mode().iloc[0] if (so.route != 'none').any() else 'not located',
                               located_voivodeship=so.voiv.mode().iloc[0] if (so.voiv != '').any() else ''))
    meth = 'card-v1: wwiname-v1+fold-v1+wwimatch-v1, loc-v1, persist-v1; PESEL 1681 + 1681woj 2026-01-20 (M and F files separate)'
    SM = pd.DataFrame(summ); SM.insert(0, 'method', meth)
    LG = pd.DataFrame(long_rows); LG.insert(0, 'method', meth + f'; WWI cells with 1-{MIN_CELL - 1} entries suppressed (no single-entry rows)')
    # small-cell protection: a region cell with 1-4 list entries would describe (almost) a single entry -> suppressed
    small = LG['wwi_entries'].between(1, MIN_CELL - 1)
    LG['wwi_status'] = np.where(small, f'1-{MIN_CELL - 1} entries (suppressed)', np.where(LG['wwi_entries'] == 0, 'no located entry', 'published'))
    for c in ['wwi_entries', 'wwi_pct_of_all_entries', 'wwi_pct_of_poland_located', 'wwi_pct_of_located', 'wwi_pct_of_point_entries']:
        LG.loc[small, c] = np.nan
    print('suppressed small WWI cells:', int(small.sum()))
    PL = pd.DataFrame(places); PL.insert(0, 'method', meth + f'; places with >= {MIN_PLACE} entries only')
    SM.to_csv(REPO_OUT + '/showcase_wwi_summary.csv', index=False)
    LG.to_csv(REPO_OUT + '/showcase_wwi.csv', index=False)
    PL.to_csv(REPO_OUT + '/showcase_wwi_places.csv', index=False)
    pd.set_option('display.width', 250); pd.set_option('display.max_colwidth', 400)
    print(SM.drop(columns=['method', 'card_sentence_en', 'card_sentence_pl']).T.to_string())
    for _, r in SM.iterrows():
        if isinstance(r.get('card_sentence_en'), str):
            print('\nEN:', r.card_sentence_en); print('PL:', r.card_sentence_pl)
    print(PL.drop(columns=['method', 'key_fold', 'female_form']).to_string(index=False))

    # ---- Poland's 20 most frequent male-file forms (2026, fold-v1 pooled) in the lists
    A = pd.DataFrame({'k': K['key'].to_numpy(), 'route': L['route'].to_numpy(), 'country': L['country'].to_numpy(), 'voiv': L['voiv'].to_numpy(),
                      'point': Rh['point'].to_numpy(), 'ruhr': Rh['ruhr_box'].to_numpy()})
    top = Mf.sort_values(ascending=False).head(20)
    spell = Mn.sort_values('n', ascending=False).assign(k=lambda d: d.surname.map(fold)).drop_duplicates('k').set_index('k')['surname']
    T = []
    sub = A[A.k.isin(top.index)]
    for r, (k, mn) in enumerate(top.items(), 1):
        s = sub[sub.k == k]; loc = s[s.route != 'none']; pl = s[(s.country == 'Poland') & (s.voiv != '')]
        vc = pl.voiv.value_counts()
        T.append({'pl_male_rank_2026': r, 'surname': spell[k], 'key_fold': k, 'pesel_m_2026_national_folded': int(mn), 'wwi_entries': len(s),
                  'wwi_entries_per_100_male_file_entries': round(len(s) / mn * 100, 1), 'wwi_located_pct': round(len(loc) / max(1, len(s)) * 100, 1),
                  'wwi_poland_pct_of_located': round(len(pl) / max(1, len(loc)) * 100, 1), 'wwi_germany_pct_of_located': round((loc.country == 'Germany').mean() * 100, 1),
                  'wwi_top_voivodeship': vc.index[0] if len(vc) else '', 'wwi_top_voiv_pct_of_poland_located': round(vc.iloc[0] / len(pl) * 100, 1) if len(vc) else np.nan,
                  'persist_overlap': PS.overlap.get(k, np.nan), 'persist_chance_overlap': PS.chance_overlap_mean_other_surnames.get(k, np.nan)})
    T = pd.DataFrame(T); T.insert(0, 'method', 'wwiname-v1+fold-v1+wwimatch-v1, loc-v1; rank = 2026 national male file (fold-v1 pooled); entries are list entries')
    T.to_csv(REPO_OUT + '/wwi_top20_pl.csv', index=False)
    print(T.drop(columns=['method']).to_string(index=False))

    # ---- geography of entries by how common the surname form is in today's male register
    mk = A.k.map(Mf)
    cls = pd.cut(mk, [1, 19, 99, 999, 10 ** 9], labels=['2-19', '20-99', '100-999', '>= 1,000']).astype(object)
    cls = cls.where(mk.notna(), 'not in 2026 male file (<2, absent or other spelling)')
    cls = cls.where(A.k != '', 'surname excluded by cleaning')
    G = []
    for c in ['>= 1,000', '100-999', '20-99', '2-19', 'not in 2026 male file (<2, absent or other spelling)', 'surname excluded by cleaning']:
        s = A[cls == c]; loc = s[s.route != 'none']
        G.append({'male_file_2026_size_class': c, 'entries': len(s), 'located_pct': round(len(loc) / max(1, len(s)) * 100, 1),
                  'poland_pct_of_located': round((loc.country == 'Poland').mean() * 100, 1), 'germany_pct_of_located': round((loc.country == 'Germany').mean() * 100, 1),
                  'other_pct_of_located': round((~loc.country.isin(['Poland', 'Germany'])).mean() * 100, 1),
                  'ruhr_box_pct_of_point': round(s.ruhr.sum() / max(1, s.point.sum()) * 100, 2)})
    G = pd.DataFrame(G); G.insert(0, 'method', 'wwimatch-v1 size classes (2026 national male file, fold-v1 pooled); loc-v1')
    G.to_csv(REPO_OUT + '/wwi_geography_by_register_size.csv', index=False)
    print(G.drop(columns=['method']).to_string(index=False))

    # ---- similar spellings in the lists (not merged; not evidence of relation)
    from c3_us_similar import candidates, lev
    wc = A.k.value_counts()
    V = []
    for sur in names + SPELLING_ILLUSTRATIONS:
        k = fold(sur)
        c = {v: '; '.join(sorted(set(r))) for v, r in candidates(k).items()}
        for v, r in german_variants(sur).items():
            c[v] = (c[v] + '; ' if v in c else '') + 'German orthography: ' + r
        V.append({'surname': sur + (' (spelling illustration only)' if sur in SPELLING_ILLUSTRATIONS else ''), 'variant_in_lists': k, 'rules': 'showcase spelling itself (fold-v1)', 'levenshtein': 0, 'wwi_entries': int(wc.get(k, 0)),
                  'pesel_m_2026_same_string': Mf.get(k, np.nan), 'pesel_f_2026_same_string': Ff.get(k, np.nan)})
        for v, r in sorted(c.items(), key=lambda kv: (-wc.get(kv[0], 0), kv[0])):   # ties broken by spelling (deterministic)
            if wc.get(v, 0) >= MIN_CARD:
                V.append({'surname': sur + (' (spelling illustration only)' if sur in SPELLING_ILLUSTRATIONS else ''), 'variant_in_lists': v, 'rules': r, 'levenshtein': lev(k, v), 'wwi_entries': int(wc[v]),
                          'pesel_m_2026_same_string': Mf.get(v, np.nan), 'pesel_f_2026_same_string': Ff.get(v, np.nan)})
    V = pd.DataFrame(V)
    for col in ['pesel_m_2026_same_string', 'pesel_f_2026_same_string']:
        V[col] = V[col].astype('Int64')
    V['pesel_status'] = np.where(V.pesel_m_2026_same_string.notna() | V.pesel_f_2026_same_string.notna(), 'string also in 2026 PESEL file(s)',
                                 'not in 2026 PESEL files (<2 or absent)')
    V.insert(0, 'method', f'wwivariant-v1 (usvariant-v1 rules + German-orthography rules; variants with >= {MIN_CARD} list entries); similar spelling, not evidence of relation, NOT merged into counts')
    V.to_csv(REPO_OUT + '/wwi_similar_spellings.csv', index=False)
    print(V.drop(columns=['method', 'pesel_status']).to_string(index=False))


if __name__ == '__main__':
    main()

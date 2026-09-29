"""C5c - summary and validation of WWI place location (method loc-v1; reads the outputs of c5a/c5b).

Place meaning: 'Ort' is the place printed with the list entry; the dataset documentation lists it as the Geburtsort
(place of birth) in every period of the lists. We locate it only as 'today's country' and, inside today's Poland,
'today's voivodeship' (loc-v1). It is never an origin, ethnicity or residence claim.

Validation reported here:
  V1 internal, out of sample (from c5b): gazetteers learned on one half of the GOV-Ids, tested on the other half.
  V2 text route, entry split: exact-Ort gazetteer learned on a random half of point-located ENTRIES, tested on the other
     half (optimistic bound: the same string usually carries the same GOV-Id). V1 'text' is the pessimistic bound.
  V3 external check: entries whose Ort ends in ', <district>' for a hand-coded list of unambiguous Prussian district
     (Kreis) names, each assigned the voivodeship that contains the district seat today (historical-geography
     knowledge written into this script, not a data source). Measures located share, share placed outside today's
     Poland and share of Poland-located entries in the expected voivodeship, by route. Kreis borders do not follow
     today's voivodeship borders exactly, so 100% is not expected even for perfect locations.
  V4 plausibility: entries placed in voivodeships that lay outside the German Empire in 1914 (possible genuine births
     outside Germany, or location errors).
Ruhr-area box (diagnostic only): point-located entries whose GOV-Id subsquare centre lies in 51.35-51.70 N,
6.60-7.80 E (roughly Duisburg-Dortmund-Recklinghausen-Hattingen). Only point entries have coordinates.
Outputs: repo wwi_location_coverage.csv, wwi_location_validation.csv; scratch wwi_entry_ruhr.parquet.
"""
import time, zlib
import numpy as np, pandas as pd, pyarrow.parquet as pq
from common import *
from c5a_gov_ids import normalise_gov
from c5b_entry_locations import district_key, text_key, build_gazetteer, MIN_SUPPORT_TEXT

EXPECTED = {
    'wielkopolskie': ['Kosten', 'Schrimm', 'Schroda', 'Jarotschin', 'Krotoschin', 'Adelnau', 'Wreschen', 'Gnesen', 'Samter',
                      'Wongrowitz', 'Pleschen', 'Gostyn', 'Rawitsch', 'Neutomischel', 'Obornik', 'Koschmin', 'Ostrowo'],
    'kujawsko-pomorskie': ['Bromberg', 'Hohensalza', 'Strelno', 'Mogilno', 'Znin', 'Schubin', 'Thorn', 'Graudenz', 'Schwetz', 'Tuchel'],
    'pomorskie': ['Karthaus', 'Berent', 'Konitz', 'Pr. Stargard', 'Dirschau', 'Putzig', 'Stuhm', 'Danzig', 'Bütow', 'Stolp'],
    'warmińsko-mazurskie': ['Allenstein', 'Ortelsburg', 'Neidenburg', 'Sensburg', 'Lötzen', 'Lyck', 'Johannisburg', 'Rößel',
                            'Heilsberg', 'Braunsberg', 'Mohrungen', 'Oletzko', 'Elbing'],
    'śląskie': ['Rybnik', 'Pleß', 'Kattowitz', 'Tarnowitz', 'Lublinitz', 'Gleiwitz', 'Zabrze'],
    'opolskie': ['Oppeln', 'Groß Strehlitz', 'Gr. Strehlitz', 'Kosel', 'Leobschütz', 'Neustadt O. S.', 'Rosenberg O. S.',
                 'Grottkau', 'Neisse', 'Namslau'],
    'dolnośląskie': ['Breslau', 'Trebnitz', 'Oels', 'Wohlau', 'Striegau', 'Jauer', 'Bunzlau', 'Glogau', 'Lüben', 'Strehlen',
                     'Nimptsch', 'Militsch', 'Guhrau', 'Ohlau', 'Schweidnitz', 'Glatz', 'Liegnitz', 'Lauban', 'Habelschwerdt', 'Landeshut'],
    'lubuskie': ['Crossen', 'Sorau', 'Sagan', 'Sprottau', 'Meseritz', 'Züllichau', 'Schwiebus', 'Landsberg a. W.', 'Oststernberg',
                 'Friedeberg N. M.'],
    'zachodniopomorskie': ['Kolberg', 'Köslin', 'Belgard', 'Regenwalde', 'Naugard', 'Pyritz', 'Saatzig', 'Kammin', 'Dramburg',
                           'Neustettin', 'Schivelbein', 'Schlawe', 'Arnswalde', 'Soldin'],
}
NOT_GERMAN_1914 = ['lubelskie', 'łódzkie', 'małopolskie', 'mazowieckie', 'podkarpackie', 'podlaskie', 'świętokrzyskie']
RUHR_BOX = (51.35, 6.60, 51.70, 7.80)   # lat_min, lon_min, lat_max, lon_max


def main():
    t0 = time.time()
    L = pd.read_parquet(WORK + '/wwi_entry_loc.parquet')
    w = pq.read_table(WWI_PARQUET, columns=['Ort', 'GOV-Id']).to_pandas()
    N = len(L)
    rows = []

    def add(section, item, n, denom, note=''):
        rows.append({'section': section, 'item': item, 'entries': int(n), 'share_pct': round(n / denom * 100, 2), 'denominator': int(denom), 'note': note})

    rdesc = {'point': 'GOV-Id Maidenhead locator (subsquare inside one country)', 'text': 'exact Ort text seen >= 5x with agreeing point locations',
             'district': 'district key (text after last comma) seen >= 20x with agreeing point locations',
             'postcode': 'GOV-Id built from a German postal code -> today\'s Germany', 'none': 'not located'}
    for r in ['point', 'text', 'district', 'postcode', 'none']:
        add('route', r, (L.route == r).sum(), N, rdesc[r])
    loc = L.route != 'none'
    add('located', 'located to a present-day country (any route)', loc.sum(), N)
    pl = L.country == 'Poland'
    add('located', "in today's Poland", pl.sum(), N)
    add('located', "in today's Poland with a voivodeship", (pl & (L.voiv != '')).sum(), N)
    add('located', "in today's Poland, voivodeship not resolved", (pl & (L.voiv == '')).sum(), N)
    add('located', "point entries whose subsquare straddles a voivodeship border (kept; nearest-locality voivodeship)",
        (pl & L.voiv_straddle).sum(), int((pl & (L.voiv != '')).sum()))
    for k, v in L.loc[L.route == 'none', 'unlocated_reason'].value_counts().items():
        add('not located (reason)', k, v, N)
    cc = L.loc[loc, 'country'].value_counts()
    for k, v in cc.head(15).items():
        add('present-day country (share of located)', k, v, int(loc.sum()))
    add('present-day country (share of located)', 'all other countries / sea / outside box', cc.iloc[15:].sum(), int(loc.sum()))
    plv = L[pl & (L.voiv != '')]
    vc = plv.groupby(['voiv', 'route']).size().unstack(fill_value=0)
    for v in VOIV_ORDER:
        n = int(vc.loc[v].sum()) if v in vc.index else 0
        parts = ', '.join(f"{r} {int(vc.loc[v, r]) if v in vc.index and r in vc.columns else 0}" for r in ['point', 'text', 'district'])
        add("today's voivodeship (share of Poland-located with voivodeship)", v, n, len(plv), 'by route: ' + parts + ('; outside German Empire in 1914' if v in NOT_GERMAN_1914 else ''))

    # ---- Ruhr box (point entries only)
    g = normalise_gov(w['GOV-Id'])
    ids = pd.read_parquet(WORK + '/gov_ids_geo.parquet', columns=['g', 'lat', 'lon']).set_index('g')
    lat = g.map(ids['lat']); lon = g.map(ids['lon'])
    pt = (L.route == 'point').to_numpy()
    a, b, c, d = RUHR_BOX
    ruhr = pt & (lat >= a).to_numpy() & (lat <= c).to_numpy() & (lon >= b).to_numpy() & (lon <= d).to_numpy()
    add('Ruhr-area box (diagnostic)', 'point entries in the Ruhr-area box 51.35-51.70N 6.60-7.80E', ruhr.sum(), int(pt.sum()), 'share of point entries')
    pd.DataFrame({'ruhr_box': ruhr, 'point': pt}).to_parquet(WORK + '/wwi_entry_ruhr.parquet', index=False)

    cov = pd.DataFrame(rows)
    cov.insert(0, 'method', 'loc-v1 (c5a/c5b); PRNG 2026-09-28 voivodeships; Natural Earth 1:10m countries')
    cov.to_csv(REPO_OUT + '/wwi_location_coverage.csv', index=False)
    print(cov.drop(columns=['method']).to_string())

    # ---------------- validation
    V = []
    v1 = pd.read_csv(WORK + '/district_route_validation.csv')
    for _, r in v1.iterrows():
        V.append({'check': 'V1 internal out-of-sample (GOV-Id halves)', 'subset': f"train half {r.train_half}", 'route': r.route,
                  'entries_tested': int(r.test_entries), 'resolved_share_pct': round(r.resolved_share * 100, 2),
                  'country_agree_pct': round(r.country_accuracy * 100, 2), 'voiv_agree_pct_PL': round(r.voiv_accuracy_PL * 100, 2),
                  'placed_outside_PL_pct': np.nan, 'note': f"resolved to PL {int(r.resolved_to_PL)}; false-PL share {round(r.false_PL_share * 100, 2)}%"})
    # V2 entry split for the text route
    P = pd.DataFrame({'tkey': text_key(w['Ort']), 'country': L['country'], 'voiv': L['voiv']})[pt]
    P = P[w.loc[pt, 'Ort'].str.strip() != '']
    rng = np.random.default_rng(20260929)
    half = rng.integers(0, 2, len(P))
    for h in (0, 1):
        tr, te = P[half == h], P[half != h]
        gt = build_gazetteer(tr['tkey'], tr['country'], tr['voiv'], MIN_SUPPORT_TEXT)
        rc, rv = te['tkey'].map(gt['res_country']), te['tkey'].map(gt['res_voiv'])
        res = rc.notna()
        plm = res & (rc == 'Poland') & (rv != '') & (te['country'] == 'Poland')
        V.append({'check': 'V2 text route, random entry halves (optimistic bound)', 'subset': f'train half {h}', 'route': 'text',
                  'entries_tested': len(te), 'resolved_share_pct': round(res.mean() * 100, 2),
                  'country_agree_pct': round((rc[res] == te.loc[res, 'country']).mean() * 100, 2),
                  'voiv_agree_pct_PL': round((rv[plm] == te.loc[plm, 'voiv']).mean() * 100, 2), 'placed_outside_PL_pct': np.nan, 'note': ''})
    # V3 external district check
    ort = w['Ort'].str.strip()
    dk = district_key(ort)
    hascomma = ort.str.contains(',')
    exp = {}
    for v, names in EXPECTED.items():
        keys = district_key(pd.Series(['x, ' + n for n in names]))
        for k in keys:
            exp[k] = v
    ev = dk.map(exp).where(hascomma)
    m = ev.notna()
    print('V3 entries with a listed district qualifier:', int(m.sum()))
    for v in list(EXPECTED) + ['ALL']:
        mv = m & ((ev == v) if v != 'ALL' else True)
        for r in ['ALL routes', 'point', 'text', 'district']:
            sel = mv & ((L.route == r) if r != 'ALL routes' else (L.route != 'none'))
            base = mv.sum()
            plsel = sel & (L.country == 'Poland') & (L.voiv != '')
            agree = (L.loc[plsel, 'voiv'] == ev[plsel]).mean() * 100 if plsel.any() else np.nan
            outside = (sel & (L.country != 'Poland')).sum() / max(1, sel.sum()) * 100
            V.append({'check': 'V3 external: listed Prussian district names -> voivodeship of district seat', 'subset': v, 'route': r,
                      'entries_tested': int(base), 'resolved_share_pct': round(sel.sum() / max(1, base) * 100, 2),
                      'country_agree_pct': round(100 - outside, 2), 'voiv_agree_pct_PL': round(agree, 2),
                      'placed_outside_PL_pct': round(outside, 2),
                      'note': 'country_agree = share of located entries placed in today\'s Poland' + ('' if v != 'ALL' else f"; {len(exp)} district keys")})
    # V4 plausibility
    n_ng = plv['voiv'].isin(NOT_GERMAN_1914).sum()
    V.append({'check': 'V4 plausibility: placed in a voivodeship outside the German Empire of 1914', 'subset': ', '.join(NOT_GERMAN_1914), 'route': 'ALL routes',
              'entries_tested': len(plv), 'resolved_share_pct': np.nan, 'country_agree_pct': np.nan, 'voiv_agree_pct_PL': np.nan,
              'placed_outside_PL_pct': np.nan, 'note': f"{int(n_ng)} entries = {round(n_ng / len(plv) * 100, 2)}% of Poland-located entries with voivodeship (genuine births outside Germany or errors)"})
    VV = pd.DataFrame(V)
    VV.insert(0, 'method', 'loc-v1 validation')
    VV.to_csv(REPO_OUT + '/wwi_location_validation.csv', index=False)
    pd.set_option('display.width', 250)
    print(VV.drop(columns=['method']).to_string())
    # details: worst V3 district keys (point route) for the notes
    d3 = pd.DataFrame({'k': dk[m], 'exp': ev[m], 'route': L.loc[m, 'route'], 'country': L.loc[m, 'country'], 'voiv': L.loc[m, 'voiv']})
    d3['ok'] = (d3.country == 'Poland') & (d3.voiv == d3.exp)
    agg = d3[d3.route != 'none'].groupby('k').agg(n=('ok', 'size'), ok=('ok', 'mean'), exp=('exp', 'first'))
    print(agg.sort_values('ok').head(15).round(3).to_string())
    print('secs', round(time.time() - t0, 1))


if __name__ == '__main__':
    main()

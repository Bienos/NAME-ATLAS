"""C5b - entry-level location of WWI list places (method loc-v1, step 2).

Routes, in priority order:
  point    : GOV-Id ends in a Maidenhead locator, subsquare not straddling a country border -> country (+ voivodeship
             of nearest PRNG locality if in Poland).  [from c5a_gov_ids.py]
  text     : all other entries with an Ort text: the exact Ort string (whitespace-normalised) is resolved if >= 5
             point-located entries with the same string agree (same thresholds as below).
  district : still unresolved entries. District key = text after the last comma of Ort (or the whole Ort if
             it has no comma), minus 'Kr.'/'Kreis'/'A.-H.'/'B.-A.'/'O.-A.' prefixes. The key is resolved only if
             point-located entries with the same key (>= MIN_SUPPORT entries) agree on one country (>= MIN_COUNTRY) and,
             for Poland, on one voivodeship (>= MIN_VOIV). Out-of-sample validation: GOV-Ids split in two halves;
             gazetteer built on one half, applied to the other half's point entries (and vice versa).
  postcode : GOV-Id built from a German postal code (_W####/_O####) -> today's Germany (no voivodeship).
  none     : straddling subsquare, empty Ort, or unresolved district.
Output (scratch only): wwi_entry_loc.parquet (row-aligned with the WWI parquet; no names), gazetteers, validation and
route summaries as scratch CSVs; the repo tables are written by c5c_location_summary.py.
"""
import time, zlib
import numpy as np, pandas as pd, pyarrow.parquet as pq
from common import *
from c5a_gov_ids import normalise_gov

MIN_SUPPORT, MIN_COUNTRY, MIN_VOIV = 20, 0.95, 0.90   # district-key gazetteer
MIN_SUPPORT_TEXT = 5                                   # exact-Ort-text gazetteer (same agreement thresholds)
PREFIX = re.compile(r'^(?:Kr\.|Kreis|Landkreis|Landkr\.|Stadtkreis|Amtshauptmannschaft|Amtsh\.|A\.\s?-\s?H\.|B\.\s?-\s?A\.|Bez\.-A\.|Bezirksamt|O\.\s?-\s?A\.|Oberamt)\s*', re.I)


def district_key(ort: pd.Series) -> pd.Series:
    s = ort.str.replace(r'\([^)]*\)', '', regex=True).str.replace(r'\s+', ' ', regex=True).str.strip()
    d = s.str.rsplit(',', n=1).str[-1].str.strip()
    d = d.str.replace(PREFIX, '', regex=True).str.strip(' .')
    return d


def text_key(ort: pd.Series) -> pd.Series:
    return ort.str.replace(r'\s+', ' ', regex=True).str.strip()


def build_gazetteer(keys, country, voiv, min_support=MIN_SUPPORT):
    t = pd.DataFrame({'k': keys, 'c': country, 'v': voiv})
    t = t[t.k != '']
    n = t.groupby('k').size().rename('n')
    cc = t.groupby(['k', 'c']).size().rename('nc').reset_index().sort_values(['k', 'nc'], ascending=[True, False]).drop_duplicates('k').set_index('k')
    g = cc.join(n)
    g['c_agree'] = g['nc'] / g['n']
    tv = t[(t.c == 'Poland') & (t.v != '')]
    vv = tv.groupby(['k', 'v']).size().rename('nv').reset_index().sort_values(['k', 'nv'], ascending=[True, False]).drop_duplicates('k').set_index('k')
    nvp = tv.groupby('k').size().rename('npl')
    g = g.join(vv).join(nvp)
    g['v_agree'] = g['nv'] / g['npl']
    ok = (g['n'] >= min_support) & (g['c_agree'] >= MIN_COUNTRY)
    okpl = ok & (g['c'] == 'Poland') & (g['v_agree'] >= MIN_VOIV)
    g['res_country'] = np.where(ok & ((g['c'] != 'Poland') | okpl), g['c'], '')
    g['res_voiv'] = np.where(okpl, g['v'], '')
    return g[g['res_country'] != '']


def main():
    t0 = time.time()
    w = pq.read_table(WWI_PARQUET, columns=['Ort', 'GOV-Id']).to_pandas()
    w['g'] = normalise_gov(w['GOV-Id'])
    ids = pd.read_parquet(WORK + '/gov_ids_geo.parquet').set_index('g')
    w['type'] = w['g'].map(ids['type']).fillna('empty')
    for c in ['country', 'voiv', 'country_straddle', 'voiv_straddle']:
        w[c] = w['g'].map(ids[c])
    w['dkey'] = district_key(w['Ort'])
    w['tkey'] = text_key(w['Ort'])
    w.loc[w['Ort'].str.strip() == '', ['dkey', 'tkey']] = ''
    point = (w['type'] == 'maidenhead') & (w['country_straddle'] != True)
    print('point entries', int(point.sum()), 'secs', round(time.time() - t0, 1))

    # ---------- out-of-sample validation (split by GOV-Id hash)
    P = w[point]
    half = P['g'].map(lambda s: zlib.crc32(s.encode()) % 2)
    rows = []
    for a in (0, 1):
        tr, te = P[half == a], P[half != a]
        gt = build_gazetteer(tr['tkey'], tr['country'], tr['voiv'].fillna(''), MIN_SUPPORT_TEXT)
        gd = build_gazetteer(tr['dkey'], tr['country'], tr['voiv'].fillna(''), MIN_SUPPORT)
        rc_t, rv_t = te['tkey'].map(gt['res_country']), te['tkey'].map(gt['res_voiv'])
        rc_d, rv_d = te['dkey'].map(gd['res_country']), te['dkey'].map(gd['res_voiv'])
        for name, rc, rv in [('text', rc_t, rv_t), ('district', rc_d.where(rc_t.isna()), rv_d.where(rc_t.isna())),
                             ('text+district', rc_t.fillna(rc_d), rv_t.fillna(rv_d))]:
            resolved = rc.notna()
            c_ok = (rc[resolved] == te.loc[resolved, 'country'])
            plm = resolved & (rc == 'Poland') & (rv != '') & (te['country'] == 'Poland')
            v_ok = (rv[plm] == te.loc[plm, 'voiv'])
            to_pl = resolved & (rc == 'Poland')
            false_pl = to_pl & (te['country'] != 'Poland')
            rows.append({'train_half': a, 'route': name, 'test_entries': len(te), 'resolved_share': round(resolved.mean(), 4),
                         'country_accuracy': round(c_ok.mean(), 4), 'voiv_accuracy_PL': round(v_ok.mean(), 4),
                         'resolved_to_PL': int(to_pl.sum()), 'false_PL_share': round(false_pl.sum() / max(1, to_pl.sum()), 4)})
    val = pd.DataFrame(rows)
    print(val.round(4).to_string())

    # ---------- full gazetteers, apply to non-point entries (text first, then district)
    gt = build_gazetteer(P['tkey'], P['country'], P['voiv'].fillna(''), MIN_SUPPORT_TEXT)
    gaz = build_gazetteer(P['dkey'], P['country'], P['voiv'].fillna(''), MIN_SUPPORT)
    gaz.to_csv(WORK + '/district_gazetteer.csv'); gt.to_csv(WORK + '/text_gazetteer.csv')
    print('text gazetteer keys', len(gt), 'district gazetteer keys', len(gaz), 'of which Poland', int((gaz.res_country == 'Poland').sum()))
    route = np.where(point, 'point', '').astype(object)
    country = np.where(point, w['country'], '').astype(object)
    voiv = np.where(point, w['voiv'].fillna(''), '').astype(object)
    nonpoint = (~point & (w['type'] != 'postcode') & (w['tkey'] != '')).to_numpy()
    for name, key, gz in [('text', 'tkey', gt), ('district', 'dkey', gaz)]:
        todo = nonpoint & (route == '')
        rc = w.loc[todo, key].map(gz['res_country'])
        rv = w.loc[todo, key].map(gz['res_voiv'])
        hit = rc.notna().to_numpy()
        ix = np.where(todo)[0][hit]
        route[ix] = name; country[ix] = rc[hit].to_numpy(); voiv[ix] = rv[hit].to_numpy()
    pc = (w['type'] == 'postcode').to_numpy() & (route == '')
    route[pc] = 'postcode'; country[pc] = 'Germany'
    route[route == ''] = 'none'
    strad = (w['type'] == 'maidenhead') & (w['country_straddle'] == True)
    reason = np.where(route != 'none', '', np.where(strad, 'border-straddling subsquare', np.where(w['Ort'].str.strip() == '', 'no Ort', 'district unresolved')))
    out = pd.DataFrame({'route': route, 'country': country, 'voiv': voiv, 'gov_type': w['type'].to_numpy(),
                        'voiv_straddle': (w['voiv_straddle'] == True).to_numpy() & point.to_numpy(), 'unlocated_reason': reason})
    out['country'] = out['country'].replace({'Germany (postcode GOV-Id)': 'Germany'})
    out.to_parquet(WORK + '/wwi_entry_loc.parquet', index=False)

    # ---------- summaries
    N = len(out)
    cov = out.groupby(['route']).size().rename('entries').reset_index()
    cov['share_pct'] = (cov['entries'] / N * 100).round(2)
    print(cov.to_string())
    print('unlocated reasons:', out.loc[out.route == 'none', 'unlocated_reason'].value_counts().to_dict())
    pl = out[(out.country == 'Poland') & (out.voiv != '')]
    tab = pl.groupby(['voiv', 'route']).size().unstack(fill_value=0)[['point', 'text', 'district']]
    tab['total'] = tab.sum(axis=1)
    print(tab.sort_values('total', ascending=False).to_string())
    print('Poland without voiv (district resolved to PL but voiv not agreed):', int(((out.country == 'Poland') & (out.voiv == '')).sum()))
    print('countries (all routes):', out[out.country != ''].groupby('country').size().sort_values(ascending=False).head(12).to_dict())
    # region diagnostic (same district lists as the diagnostic run)
    ort = w['Ort'].str.strip()
    kreise = {'Wielkopolska districts': ['Posen', 'Schrimm', 'Kosten', 'Schroda', 'Jarotschin', 'Krotoschin', 'Adelnau', 'Ostrowo', 'Wreschen', 'Gnesen', 'Samter', 'Obornik', 'Wongrowitz', 'Kempen'],
              'Upper Silesia districts': ['Rybnik', 'Pleß', 'Kattowitz', 'Beuthen', 'Tarnowitz', 'Lublinitz', 'Gleiwitz', 'Ratibor', 'Zabrze', 'Tost-Gleiwitz', 'Groß Strehlitz', 'Gr. Strehlitz', 'Oppeln', 'Kosel', 'Leobschütz', 'Neustadt O. S.', 'Kreuzburg', 'Rosenberg O. S.'],
              'West Prussia districts': ['Karthaus', 'Berent', 'Konitz', 'Pr. Stargard', 'Dirschau', 'Schwetz', 'Kulm', 'Thorn', 'Graudenz', 'Strasburg', 'Briesen', 'Löbau', 'Neumark'],
              'southern East Prussia districts': ['Allenstein', 'Ortelsburg', 'Neidenburg', 'Osterode', 'Sensburg', 'Lötzen', 'Lyck', 'Johannisburg', 'Rößel', 'Heilsberg']}
    diag = []
    for reg, ks in kreise.items():
        pat = r',\s*(?:Kr\.\s*|Kreis\s*)?(?:' + '|'.join([re.escape(k) for k in ks]) + r')\s*$'
        m = ort.str.contains(pat, regex=True).to_numpy()
        sub = out[m]
        diag.append({'district_group': reg, 'entries_with_district_suffix': int(m.sum()),
                     'point_pct': round((sub.route == 'point').mean() * 100, 1),
                     'text_route_pct': round((sub.route == 'text').mean() * 100, 1),
                     'district_route_pct': round((sub.route == 'district').mean() * 100, 1),
                     'located_with_voiv_pct': round(((sub.voiv != '')).mean() * 100, 1)})
    diag = pd.DataFrame(diag)
    print(diag.to_string())
    val.to_csv(WORK + '/district_route_validation.csv', index=False)
    diag.to_csv(WORK + '/location_region_diagnostic.csv', index=False)
    cov.to_csv(WORK + '/location_routes.csv', index=False)
    tab.to_csv(WORK + '/located_poland_by_voiv_route.csv')
    print('secs', round(time.time() - t0, 1))


if __name__ == '__main__':
    main()

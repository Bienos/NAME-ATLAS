"""C5a - classify WWI GOV-Ids and geolocate the Maidenhead ones (method loc-v1, step 1).

GOV-Id types: maidenhead (ends in a 6-char Maidenhead locator; case-normalised), postcode (_W####/_O####: GOV IDs
built from German postal codes), object_/adm_ (opaque GOV object numbers: no coordinates in the ID), empty, other.
Maidenhead IDs: subsquare centre + 4 corners tested against Natural Earth 1:10m admin-0 polygons (public domain,
world-atlas 2.0.2). If the five points touch >1 country the subsquare straddles a border (flag). Points in Poland:
voivodeship of the nearest PRNG locality (GUGiK, CC BY 4.0) within 10 km; corner voivodeships (nearest PRNG
locality within 3 km of each corner) flag subsquares straddling a voivodeship border.
Output (scratch only): gov_ids_geo.parquet - one row per GOV-Id (no personal data).
"""
import time
import numpy as np, pandas as pd, pyarrow.parquet as pq
from common import *

MAX_PRNG_KM = 10.0
EUROPE_BOX = (-30.0, 25.0, 60.0, 72.0)   # lon_min, lat_min, lon_max, lat_max: countries tested; points outside -> 'outside Europe box'


def gov_type(g):
    if g == '':
        return 'empty'
    if MH_RE.match(g):
        return 'maidenhead'
    if re.match(r'^[A-Z0-9]{6}_[WO][0-9]{4}$', g):
        return 'postcode'
    if re.match(r'^object_[0-9]+$', g):
        return 'object'
    if re.match(r'^adm_[0-9]+$', g):
        return 'adm'
    return 'other'


def normalise_gov(series):
    g = series.str.strip()
    mhlike = g.str.match(r'^[^_]{6}[A-Ra-r]{2}[0-9]{2}[A-Xa-x]{2}$')
    return g.where(~mhlike, g.str.upper())


def main():
    t0 = time.time()
    g = normalise_gov(pq.read_table(WWI_PARQUET, columns=['GOV-Id']).column(0).to_pandas())
    ids = g.value_counts().rename_axis('g').reset_index(name='entries')
    ids['type'] = ids['g'].map(gov_type)
    mh = ids['type'] == 'maidenhead'
    ids.loc[mh, 'locator'] = ids.loc[mh, 'g'].str[-6:]
    locs = pd.DataFrame({'locator': ids.loc[mh, 'locator'].unique()})
    b = np.array([maidenhead_bounds(x) for x in locs['locator']])
    locs['lat'] = (b[:, 0] + b[:, 2]) / 2; locs['lon'] = (b[:, 1] + b[:, 3]) / 2
    print('maidenhead IDs', int(mh.sum()), 'distinct subsquares', len(locs))

    allc = load_countries()
    lo0, la0, lo1, la1 = EUROPE_BOX
    countries = {k: v for k, v in allc.items()
                 if any((r[:, 0].max() >= lo0) and (r[:, 0].min() <= lo1) and (r[:, 1].max() >= la0) and (r[:, 1].min() <= la1) for r in v)}
    print('countries tested', len(countries))
    pts = {'c': (locs['lat'].to_numpy(), locs['lon'].to_numpy()),
           'sw': (b[:, 0] + 1e-6, b[:, 1] + 1e-6), 'se': (b[:, 0] + 1e-6, b[:, 3] - 1e-6),
           'nw': (b[:, 2] - 1e-6, b[:, 1] + 1e-6), 'ne': (b[:, 2] - 1e-6, b[:, 3] - 1e-6)}
    cc = {k: country_of(v[0], v[1], countries) for k, v in pts.items()}
    sets = [set(x for x in (cc['c'][i], cc['sw'][i], cc['se'][i], cc['nw'][i], cc['ne'][i]) if x) for i in range(len(locs))]
    locs['country'] = cc['c']
    locs['countries_touched'] = ['|'.join(sorted(s)) for s in sets]
    locs['country_straddle'] = [len(s) > 1 for s in sets]
    sea = (locs['country'] == '') & np.array([len(s) == 1 for s in sets])
    locs.loc[sea, 'country'] = [next(iter(s)) for s, m in zip(sets, sea) if m]
    inbox = (locs['lon'] >= lo0) & (locs['lon'] <= lo1) & (locs['lat'] >= la0) & (locs['lat'] <= la1)
    locs.loc[(locs['country'] == '') & ~inbox, 'country'] = 'outside Europe box'
    locs.loc[locs['country'] == '', 'country'] = 'no country (sea/unmatched)'
    print('country step secs', round(time.time() - t0, 1))

    idx = PRNGIndex()
    pl = locs['countries_touched'].str.contains('Poland').to_numpy()
    vv, dd, cv = [], [], []
    for la, lo, bd in zip(locs.loc[pl, 'lat'], locs.loc[pl, 'lon'], b[pl]):
        i, d = idx.nearest(la, lo, MAX_PRNG_KM + 5)
        vv.append(idx.p.at[i, 'voivodeship'] if i is not None and d <= MAX_PRNG_KM else '')
        dd.append(d)
        corner_v = set()
        for (a, c_) in [(bd[0], bd[1]), (bd[0], bd[3]), (bd[2], bd[1]), (bd[2], bd[3])]:
            j, dj = idx.nearest(a, c_, 3.0)
            if j is not None and dj <= 3.0:
                corner_v.add(idx.p.at[j, 'voivodeship'])
        cv.append('|'.join(sorted(corner_v)))
    locs.loc[pl, 'voiv'] = vv; locs.loc[pl, 'prng_km'] = dd; locs.loc[pl, 'corner_voivs'] = cv
    locs['voiv'] = locs['voiv'].fillna('')
    locs['voiv_straddle'] = locs['corner_voivs'].fillna('').str.contains(r'\|')
    ids = ids.merge(locs, on='locator', how='left')
    ids.loc[ids['type'] == 'postcode', 'country'] = 'Germany (postcode GOV-Id)'
    ids.to_parquet(WORK + '/gov_ids_geo.parquet', index=False)

    E = ids['entries'].sum()
    print('\nentries by GOV type (%):'); print((ids.groupby('type')['entries'].sum() / E * 100).round(2).to_dict())
    m = ids[ids['type'] == 'maidenhead']
    print('\nMaidenhead entries by country (top 12):'); print(m.groupby('country')['entries'].sum().sort_values(ascending=False).head(12).to_dict())
    print('straddling entries:', int(m.loc[m.country_straddle == True, 'entries'].sum()))
    print(m[m.country_straddle == True].groupby('countries_touched')['entries'].sum().sort_values(ascending=False).head(6).to_dict())
    p = m[(m.country == 'Poland') & (m.country_straddle != True)]
    print('Poland non-straddling', int(p.entries.sum()), 'no PRNG<=10km', int(p.loc[p.voiv == '', 'entries'].sum()), 'max prng km', round(p.prng_km.max(), 2))
    print(p.groupby('voiv')['entries'].sum().sort_values(ascending=False).to_dict())
    print('secs', round(time.time() - t0, 1))


if __name__ == '__main__':
    main()

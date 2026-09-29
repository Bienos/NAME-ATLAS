"""Build a compact scratch cache of PRNG localities (name, kind, voivodeship, powiat, lat, lon).
Source: GUGiK PRNG localities export 2026-09-28 (CC BY 4.0). Scratchpad cache only; never committed."""
import openpyxl, re, pandas as pd, time
SRC='/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/prng/PRNG_MIEJSCOWOSCI_XLSX.xlsx'
OUT='/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/analysis/diaspora_history/prng_points.csv'
DMS=re.compile(r"(\d+)°(\d+)'(\d+(?:[.,]\d+)?)\"\s+(\d+)°(\d+)'(\d+(?:[.,]\d+)?)\"")
def main():
    t=time.time()
    ws=openpyxl.load_workbook(SRC, read_only=True).worksheets[0]
    out=[]; bad=0
    for i,row in enumerate(ws.iter_rows(values_only=True)):
        if i==0:
            assert row[2]=='nazwa główna' and row[19]=='współrzędne geograficzne' and row[32]=='województwo'
            continue
        m=DMS.search(str(row[19] or ''))
        if not m: bad+=1; continue
        d=[float(x.replace(',','.')) for x in m.groups()]
        lat=d[0]+d[1]/60+d[2]/3600; lon=d[3]+d[4]/60+d[5]/3600
        out.append((row[1],row[2],row[9],row[32],row[33],round(lat,6),round(lon,6)))
    df=pd.DataFrame(out,columns=['prng_id','name','kind','voivodeship','powiat','lat','lon'])
    df.to_csv(OUT,index=False)
    print('rows',len(df),'unparsed coords',bad,'secs',round(time.time()-t,1))
    print(df['voivodeship'].value_counts())
    print(df[['lat','lon']].describe())
if __name__=='__main__': main()

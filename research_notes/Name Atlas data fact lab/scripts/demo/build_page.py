import json
D="/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/demo"
t=open(f"{D}/fact-lab.template.html",encoding="utf-8").read()
data=open(f"{D}/data.json",encoding="utf-8").read()
geo=open(f"{D}/voivodeships.json",encoding="utf-8").read()
assert "/*__DATA__*/null" in t and "/*__GEO__*/null" in t
t=t.replace("/*__DATA__*/null",data.replace("</","<\\/")).replace("/*__GEO__*/null",geo.replace("</","<\\/"))
open(f"{D}/fact-lab.html","w",encoding="utf-8").write(t)
print("fact-lab.html", round(len(t.encode())/1024),"KB")

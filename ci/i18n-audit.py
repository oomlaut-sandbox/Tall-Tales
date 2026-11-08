# Every t(…) / tr(…) string used in the code must have an entry in src/i18n.js or src/strings/*.js. Prints the missing ones.
# Usage: python3 ci/i18n-audit.py  (from the repo root). "0 missing" is the goal.
import re,glob,sys,collections
def unq(s):
    return s.encode().decode('unicode_escape').encode('latin1').decode('utf8') if '\\' in s else s
dict_files=['src/i18n.js']+glob.glob('src/strings/*.js')
keys=set()
pat_key=re.compile(r"""^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*:\s*\{""",re.M)
for f in dict_files:
    s=open(f).read()
    for m in pat_key.finditer(s):
        k=m.group(1) if m.group(1) is not None else m.group(2)
        keys.add(k.replace("\\'", "'").replace('\\"','"'))
# also keys that have a de entry: assume all
use=collections.defaultdict(list)
pat_t=re.compile(r"""\b(?:t|tr|tt)\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`([^`$]*)`)""")
files=glob.glob('src/**/*.js',recursive=True)+['App.js']
for f in files:
    if f.startswith('src/strings') or f=='src/i18n.js': continue
    for n,line in enumerate(open(f),1):
        for m in pat_t.finditer(line):
            k=next(g for g in m.groups() if g is not None)
            k=k.replace("\\'", "'").replace('\\"','"')
            if k and k not in keys: use[k].append(f'{f}:{n}')
for k,v in sorted(use.items(), key=lambda x:x[1][0]):
    print(v[0], '|', k[:110])
print(len(use),'missing', len(keys),'keys', file=sys.stderr)

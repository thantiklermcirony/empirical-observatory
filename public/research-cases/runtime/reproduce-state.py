"""Independent original-ODE reference for the registered state-recovery witness.
SPDX-License-Identifier: GPL-3.0-only. Requires NumPy/SciPy; see ../chlamydomonas/upstream/LICENSE.
Writes STATE_RECOVERY_BDF.json, a new record, without replacing recovered evidence.
"""
from pathlib import Path
import sys, json, platform
sys.dont_write_bytecode=True
import scipy
ROOT=Path(__file__).resolve().parent.parent/'chlamydomonas'
sys.path.insert(0,str(ROOT))
from reference import reference

histories=['111000','110001']
results=[]
for bits in histories:
    schedule=[{'start':i*240,'end':(i+1)*240,'light':int(bit)} for i,bit in enumerate(bits)]
    config={'initial':[.75,.75,0,1.95,.75,6.45,0,0],'parameters':{'mu':.00145},'schedule':schedule}
    preparation=reference(config)
    future_config={'initial':preparation['final'],'parameters':{'mu':.00145},'schedule':[{'start':0,'end':1440,'light':0}]}
    future=reference(future_config)
    tighter_preparation=reference(config,rtol=1e-10)
    tighter_future=reference({**future_config,'initial':tighter_preparation['final']},rtol=1e-10)
    assert len(future['events'])==len(tighter_future['events'])
    assert all(abs(a-b)<.001 for a,b in zip(future['events'],tighter_future['events']))
    results.append({'history':bits,'config':config,'preparation':preparation,'future':future,'tighterFuture':tighter_future})
    print(bits,'future events',future['events'],flush=True)
out={'schema':'observatory-independent-model-check/1','modelSourceCommit':'ab87e1314e27239d763e9cab188291e01b153574','method':'SciPy BDF on original eight ODEs; rtol=1e-9, atol=1e-11, max_step=2 min; repeat at rtol=1e-10','environment':{'python':platform.python_version(),'scipy':scipy.__version__},'witness':{'histories':histories,'selection':'First differing binary-outcome pair from the declared six-slot exploratory search. This is a post-selection numerical check, not an empirical preregistration.','results':results},'limits':'One selected model witness under a common future. No universal minimum-state or empirical claim.'}
(ROOT/'STATE_RECOVERY_BDF.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')

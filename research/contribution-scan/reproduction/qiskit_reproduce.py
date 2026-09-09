"""Bounded diagnostic for reported Qiskit seed reuse; no quantum hardware or patch."""
from pathlib import Path
import json, hashlib, inspect, platform
import numpy as np
import qiskit
from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorSampler

def batches(seed):
    qc=QuantumCircuit(1);qc.h(0);qc.measure_all()
    sampler=StatevectorSampler(seed=seed)
    return [r.data.meas.get_bitstrings() for r in sampler.run([qc]*10,shots=64).result()]
integer=batches(42);generator=batches(np.random.default_rng(42));repeated=batches(np.random.default_rng(42))
source=inspect.getsourcefile(StatevectorSampler)
result={'qiskitVersion':qiskit.__version__,'sourceFileSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),'pubs':10,'shotsPerPub':64,'integerSeedUniqueShotStrings':len({''.join(x) for x in integer}),'generatorSeedUniqueShotStrings':len({''.join(x) for x in generator}),'generatorReproducibleAcrossFreshInstances':generator==repeated,'classification':'Reproduction on installed Qiskit version; not a latest-main test or a novel algorithm.','issueUrls':['https://github.com/Qiskit/qiskit/issues/13730','https://github.com/Qiskit/qiskit/issues/13047']}
result.update({'numpyVersion':np.__version__, 'pythonVersion':platform.python_version(), 'platform':platform.platform()})
assert result['integerSeedUniqueShotStrings']==1
assert result['generatorSeedUniqueShotStrings']>1 and result['generatorReproducibleAcrossFreshInstances']
(Path(__file__).parent/'qiskit-reproduction.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print(json.dumps(result,indent=2))

# Attribution and reuse

The station uses the pinned Sites scaffold, React, vinext, shadcn/Base UI, Lucide, Three.js, Recharts and other dependencies listed in `package.json` and `pnpm-lock.yaml`. Original dependency notices remain in their packages. The source bundle does not vendor node_modules.

- [Three.js](https://github.com/mrdoob/three.js): MIT; renders the orbital scene.
- [Quantum Tensors](https://github.com/Quantum-Flytrap/quantum-tensors): package declares MIT; calculates circuit probabilities. Its installed package metadata is the release reference, distinct from current repository metadata.
- [BrainFlow](https://github.com/brainflow-dev/brainflow): separate SDK with component/device terms; installed through Python requirements, not redistributed here as a binary.
- [Qiskit](https://github.com/Qiskit/qiskit) and [Aer](https://github.com/Qiskit/qiskit-aer): Apache-2.0; independent circuit adapter and numerical checks.

The TAO equations and scientific framing are attributed to Daniel John Murray's [manuscript](https://ssrn.com/abstract=6779487). This implementation introduces a distinct synthetic fixture and does not reproduce the original paper's numerical results. The [programme](https://github.com/thantiklermcirony/empirical-architecture) and [IDA StateAtlas](https://github.com/thantiklermcirony/ida-stateatlas) provide the broader research context.

No AlphaGenome predictions, God's Eye View assets, biosensor recordings or third-party biological datasets are distributed in this release. Code licenses do not automatically permit reuse of provider data, model weights or commercial API outputs. The audit records these distinctions for the next build.

## New integration data and code

Oslo City Bike observations are distributed under NLOD 2.0 with provider attribution, source URLs, retrieval times and modification notices. See `integrations/earth/README.md` and the capture manifest. This dataset is not relicensed as MIT. The God's Eye module is original integration code; no upstream globe or provider tiles/assets are vendored.

The AlphaGenome SDK is Apache-2.0; model and Atlas outputs have separate provider restrictions. This repository contains an adapter and clearly synthetic fixtures, no live provider outputs. `adapters/genome/RESEARCH.md` records terms and assay sources.

POPGym 1.0.7 (MIT) is installed as an external dependency. Its established task is credited in the memory protocol; the recorded diagnostic does not claim the environment or sufficient-history method is new.

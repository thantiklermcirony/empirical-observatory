import { reason } from '../lib/engine/reasoning.ts';
import { investigate } from '../lib/engine/question.ts';
import { REASONING_EXAMPLES } from '../lib/engine/reasoning-examples.ts';

const question = 'How can we build an AI from boundedness that learns a world model, remembers evidence and answers new questions?';
const first = reason({ prompt: REASONING_EXAMPLES[1].prompt });
const observation = reason({ prompt: 'The van is at the depot. Where is the parcel?', notebook: first.notebook });
const revision = reason({ prompt: 'Forget: van | at | depot\nThe van is at the bridge. Where is the parcel?', notebook: observation.notebook });
const retraction = reason({ prompt: 'Forget: parcel | inside | van\nWhere is the parcel?', notebook: revision.notebook });
console.log(JSON.stringify({
  scope: 'Local software execution. Facts and rules are supplied premises; this is not measured autonomous learning or a discovery.',
  oldDesk: investigate({ prompt: question }),
  unrestrictedQuestion: reason({ prompt: question }),
  aiDesign: reason({ prompt: REASONING_EXAMPLES[2].prompt }),
  memorySequence: [first, observation, revision, retraction],
}, null, 2));

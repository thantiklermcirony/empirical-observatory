/** Single trusted runtime configuration, shared by the ledger and the existing inquiry engine. */
import {temporalCatalogue,type TemporalRuntimeOptions} from './engine/temporal-router.ts';
import {evaluateQuantumReference} from './engine/quantum-reference.ts';
export const LEDGER_RUNTIME:TemporalRuntimeOptions={
 implementationIdentity:{id:'temporal-router-ts/0.1.0',source_sha256:'e430925cc2d4a1bf5c6665043a645697236afc111b95ce0c3e6c432d4d0c3c29'},
 quantumReference:{execute:evaluateQuantumReference,identity:{id:'quantum-reference-ts/0.1.0',source_sha256:'3ecb62e0c834c50dc197b7e8b2196dc38ba9b1ea3345c2ed995386b319ebbabc'}},
};
export const registeredScientificOperations=()=>temporalCatalogue(LEDGER_RUNTIME);

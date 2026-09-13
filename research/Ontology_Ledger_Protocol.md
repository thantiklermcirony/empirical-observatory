# Scientific ontology ledger: capture, projection and admission

The Observatory reuses scientific ontologies and thesauri as a vocabulary layer beneath its rooms. This layer records what a source says a term and relation mean. It does not turn those assertions into empirical observations, mathematical theorems, causal discoveries or callable operations.

## Three separate ledgers

1. **Vocabulary and source assertions:** `/ledger` and `/ledger-data/manifest.json`. Stable IRIs, labels, definitions, synonyms, predicates, selected restrictions, original captures, versions, hashes, attribution and licences.
2. **Scientific claims and observations:** the existing framework and research cases. These require explicit premises, evidence class, calibration, comparison, uncertainty and dependencies.
3. **Executable contracts:** `/api/ledger`. Four registered operations continue to enforce their existing input/premise contracts. An imported relation named “causes” grants no new execution authority.

## Source capture

The capture manifest lists each selected official product URL, retrieval time, content length and SHA-256. Ontology licences come from the OBO Foundry registry or the source's explicit licence. QUDT is a versioned release; SWEET, UAT and LexInfo are repository commit captures. Other products may have moving URLs: the content hash identifies this actual snapshot. A later changed download is a new candidate release, not an in-place replacement.

Original files are downloadable. Non-ZIP captures are deterministically gzip compressed; their manifest SHA-256 is for the **decompressed original bytes**. ZIP captures retain their original bytes and member selection is listed. No downloaded code is executed. RDF imports are listed but are not fetched automatically. External XML entities are rejected. Already embedded imports remain statements of the captured product, with source metadata intact.

## What normalization preserves and omits

- Named RDF subjects with types or standard labels; their named-object and literal statements. Literal language and datatype are retained. No RDFS or OWL entailment is claimed.
- Simple OWL restrictions retain the enclosing predicate, property, quantifier and named/literal filler. `someValuesFrom` is an existential class restriction, **not a claim that an observed individual caused an event**.
- OBO Graph JSON nodes, metadata and edges retain their representation. `is_a` is represented as `rdfs:subClassOf`. Other edge meanings follow the OBO Graph serialization; they are not flattened into universal individual-level facts. Graph axiom counts and complete original captures retain the route back to logical definitions omitted by the browser projection.
- Anonymous expressions, RDF lists, complex axioms, constraints, SHACL validation and imported documents are not exhaustively interpreted. Named source links whose targets are absent remain explicit external references. No missing meaning is guessed.
- Labels use an English preference where a language tag is supplied, followed by untagged labels. Identifier-derived display labels are flagged. Missing definitions remain missing. Obsolete terms are retained and hidden from search by default.

## Identity and ambiguity

The same IRI can carry multiple source assertions; each remains inspectable. Overlap often reflects imports and is not independent corroboration. Identical text with different IRIs is **never merged**. `sameAs`, `exactMatch`, synonyms and cross-references remain assertions with their exact predicates, not automatic Observatory identity decisions. NFKC/lowercase search is only a finding aid. A scientific noun need not be a grammatical noun; a biological process term need not be a callable verb.

Word-prefix search indexes labels and synonyms, with at least two letters per indexed word. It does not search prose definitions. Results are deduplicated by IRI and paginated without silently dropping additional matches. Search shards and record shards are gzip compressed with separate hashes for compressed and expanded bytes. The browser loads only the required shards and retains at most two in its read cache. JSON is data; source text is never treated as instructions or rendered as executable HTML. Explanatory comments remain labelled comments rather than being silently promoted into formal definitions.

## Licences and attribution

This is a collection of separately attributed sources. Each source-derived assertion and index label retains the licence of its identified source. In particular, **UAT-derived adaptations remain CC BY-SA 3.0; EDAM-derived adaptations remain CC BY-SA 4.0**. The collection does not relicense them as CC0. LexInfo and OntoMathPRO's Apache-2.0 licence texts are distributed. QUDT attribution is to QUDT.org. OBO products retain their registry-declared CC licence and source metadata. Source licence files are supplied when present in the capture, and every source links its licence and original institution. Changes consist of a normalized, indexed projection; endorsement by the original authors is not implied. The APS scheme is attributed as a source; the Observatory does not adopt its name as its own product name.

## Rebuilding and checking

`scripts/ontology/capture.mjs CAPTURE_DIRECTORY` restores exact releases using the committed capture manifest. `scripts/ontology/compile.py CAPTURE_DIRECTORY SITE_DIRECTORY` reads `sources.json` plus original files. Install `rdflib==7.6.0` in the Python environment (or CAPTURE_DIRECTORY/runtime). The script verifies all raw hashes before parsing. Optional `--reuse` verifies existing compiled record hashes and reuses matching source snapshots; use a full rebuild when changing projection semantics. Run `scripts/ontology/refine.py SITE_DIRECTORY/public/ledger-data` afterwards to check source-specific APS retirement flags and generate the typed predicate directory. This refinement is idempotent. The generated manifest, integrity table, ambiguity audit and source summary are committed with the browser. `tests/ontology-ledger.test.ts` checks compressed/expanded integrity, every original capture, reconciled counts, ambiguity, search, source licensing and the absence of new execution authority.

## Coverage and next admission gate

This import covers selected collections across science. It is not a complete ledger of all scientific knowledge. Source counts include imported or obsolete terms and should not be reported as new discoveries. Rooms are navigation assignments, not ontological proof that a field is complete. An ontology relationship alone cannot validate the boundedness programme or select a physical composition law.

The next meaningful step is to bind a reviewed operation's actual input/output quantities to specific external IRIs, with a human-reviewed mapping record, preparation/clock/unit/domain conditions, provenance and tests that reject incorrect transfers. No imported QUDT unit or shared dimensional vector automatically enables conversion or transfer. That admission gate remains separate from vocabulary capture.

"""Optional test of the real SDK with a local protobuf transport stub. No network."""
import importlib.util
import unittest

import atlas_adapter as adapter

SDK_AVAILABLE = importlib.util.find_spec("alphagenome") is not None


@unittest.skipUnless(SDK_AVAILABLE, "optional pinned AlphaGenome SDK is not installed")
class SdkContract(unittest.TestCase):
    def test_real_sdk_serializes_expected_variant_and_filters_without_network(self):
        from alphagenome.atlas import atlas
        from alphagenome.data import genome
        from alphagenome.protos import atlas_service_pb2
        from alphagenome.protos import dna_model_pb2
        import numpy as np
        import pandas as pd
        from types import SimpleNamespace

        class Stub:
            def GetDenseVariantScores(self, request, metadata=None):
                self.request, self.metadata = request, metadata
                return atlas_service_pb2.DenseVariantScores(variant=request.variant)

        stub = Stub()
        client = atlas.AtlasClient(stub, metadata=[])
        variant = genome.Variant(chromosome="chr5", position=1295046,
                                 reference_bases="T", alternate_bases="G")
        result = client.query_variant(variant, requested_scorers=["FIXTURE_SCORER"],
                                      ontology_terms=["EFO:0001187"], gene_ids=["ENSG00000164362"])
        self.assertEqual(result, {})
        self.assertEqual(stub.request.organism, dna_model_pb2.ORGANISM_HOMO_SAPIENS)
        self.assertEqual(genome.Variant.from_proto(stub.request.variant).position, 1295046)
        self.assertIn("FIXTURE_SCORER", str(stub.request.filter))
        self.assertIn("ONTOLOGY_TYPE_EFO", str(stub.request.filter))
        self.assertIn("1187", str(stub.request.filter))
        self.assertEqual(stub.metadata, [])

        description = adapter.describe_metadata({"FIXTURE_SCORER": atlas.ScorerMetadata(
            name="FIXTURE_SCORER", is_signed=True,
            track_metadata=pd.DataFrame([{"ontology_curie": "EFO:0001187"}]))})
        self.assertEqual(description[0]["isSigned"], True)
        self.assertEqual(adapter.json_safe(variant)["position"], 1295046)
        self.assertEqual(adapter.json_safe(np.array([1., np.nan])), [1., None])


if __name__ == "__main__":
    unittest.main()

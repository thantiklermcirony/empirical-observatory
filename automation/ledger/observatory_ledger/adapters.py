"""Reusable seams only. These Protocols do not collect data or fit models."""

from dataclasses import dataclass
from typing import Any, Iterable, Protocol

from .ledger import Ledger


@dataclass(frozen=True)
class SnapshotInput:
    snapshot_id: str
    raw: bytes
    source_id: str
    entity: str
    event_at: str
    received_at: str
    source_version: str
    license: str
    content_type: str
    kind: str = "observation"
    published_at: str | None = None
    quality: tuple[str, ...] = ()

    def capture(self, ledger: Ledger) -> dict:
        return ledger.capture_snapshot(
            self.snapshot_id, self.raw, source_id=self.source_id, entity=self.entity,
            event_at=self.event_at, received_at=self.received_at, published_at=self.published_at,
            source_version=self.source_version, license=self.license, content_type=self.content_type,
            kind=self.kind, quality=list(self.quality))


@dataclass(frozen=True)
class ForecastContext:
    """Only caller-selected as-of sources; core independently checks issuance."""

    experiment_id: str
    slot_id: str
    entity: str
    cutoff_at: str
    target_at: str
    snapshots: tuple[SnapshotInput, ...]


@dataclass(frozen=True)
class PredictionInput:
    slot_id: str
    model_id: str
    value: float | dict[str, float]
    input_snapshot_ids: tuple[str, ...]
    feature_sha256: str
    compute_ms: float = 0

    def issue(self, ledger: Ledger) -> dict:
        return ledger.issue_prediction(self.slot_id, self.model_id, self.value,
                                       list(self.input_snapshot_ids), self.feature_sha256, self.compute_ms)


@dataclass(frozen=True)
class OutcomeInput:
    slot_id: str
    snapshot_id: str
    value: float | str

    def resolve(self, ledger: Ledger) -> dict:
        return ledger.resolve_outcome(self.slot_id, self.snapshot_id, self.value)


class SourceAdapter(Protocol):
    def capture(self) -> Iterable[SnapshotInput]:
        """Supply exact bytes plus honest metadata; preserve every revision."""
        ...


class PredictorAdapter(Protocol):
    def predict(self, context: ForecastContext) -> PredictionInput:
        """Use only provided as-of inputs and the frozen model artifact."""
        ...


class OutcomeAdapter(Protocol):
    def resolve(self, slot: dict[str, Any], snapshot: SnapshotInput) -> OutcomeInput:
        """Extract the target faithfully; do not substitute forecasts for truth."""
        ...

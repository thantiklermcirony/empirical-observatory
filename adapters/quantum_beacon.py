"""Run the Observatory beacon circuits using Qiskit Aer or explicit IBM hardware."""
import argparse
import json
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Statevector
from qiskit_aer import AerSimulator

STATES = ("0", "1", "+", "-", "+i", "-i")


def circuit(state, basis, measure=True):
    if state not in STATES or basis not in ("X", "Y", "Z"):
        raise ValueError("Unknown state or basis")
    qc = QuantumCircuit(1, 1) if measure else QuantumCircuit(1)
    if state in ("1", "-"):
        qc.x(0)
    if state in ("+", "-", "+i", "-i"):
        qc.h(0)
    if state == "+i":
        qc.s(0)
    if state == "-i":
        qc.sdg(0)
    if basis == "Y":
        qc.sdg(0)
    if basis != "Z":
        qc.h(0)
    if measure:
        qc.measure(0, 0)
    return qc


def reference():
    return [{"state": state, "basis": basis,
             "ideal": float(Statevector.from_instruction(circuit(state, basis, False)).probabilities()[0])}
            for state in STATES for basis in ("X", "Y", "Z")]


def run_aer(state, basis, shots=1024, seed=101):
    backend = AerSimulator()
    job = backend.run(transpile(circuit(state, basis), backend), shots=shots, seed_simulator=seed)
    counts = job.result().get_counts()
    return {"source": "qiskit-aer-simulation", "state": state, "basis": basis,
            "shots": shots, "plus": counts.get("0", 0), "seed": seed,
            "noise": 0, "note": "Ideal simulator; browser defaults to 0.12 depolarising noise."}


def run_hardware(state, basis, shots, backend_name):
    # Optional SDK: install separately. No cloud account is touched on the Aer path.
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
    service = QiskitRuntimeService()  # Uses the operator's previously saved account.
    backend = service.backend(backend_name)
    qc = transpile(circuit(state, basis), backend, optimization_level=1)
    sampler = SamplerV2(mode=backend)
    job = sampler.run([qc], shots=shots)
    # Submit and return immediately; hardware executes through the provider queue.
    return {"source": "ibm-quantum-hardware-submission", "backend": backend_name,
            "jobId": job.job_id(), "state": state, "basis": basis, "shots": shots,
            "note": "Submission is not a measured result. Retrieve with the provider SDK."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", choices=STATES, default="+i")
    parser.add_argument("--basis", choices=("X", "Y", "Z"), default="Y")
    parser.add_argument("--shots", type=int, default=1024)
    parser.add_argument("--seed", type=int, default=101)
    parser.add_argument("--reference", action="store_true")
    parser.add_argument("--execute-hardware", action="store_true")
    parser.add_argument("--backend")
    parser.add_argument("--output")
    args = parser.parse_args()
    if not 1 <= args.shots <= 4096:
        parser.error("Shots must be from 1 to 4096.")
    if args.execute_hardware and not args.backend:
        parser.error("Specify the backend you intend to use. Provider quotas/costs apply.")
    result = reference() if args.reference else run_hardware(args.state, args.basis, args.shots, args.backend) if args.execute_hardware else run_aer(args.state, args.basis, args.shots, args.seed)
    text = json.dumps(result, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")
    print(text)


if __name__ == "__main__":
    main()

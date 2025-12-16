#!/usr/bin/env python3
"""
Verify exported ONNX model against ACTIVATIONS_CONTRACT.md.

Usage:
    python verify.py --model model.onnx
"""

import argparse
import onnxruntime as ort
import numpy as np
from typing import Dict, List, Tuple


def verify_model(model_path: str) -> bool:
    """
    Verify ONNX model against contract.

    Returns:
        True if verification passes, False otherwise
    """
    print(f"Loading model: {model_path}")
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

    # Get input/output info
    inputs = session.get_inputs()
    outputs = session.get_outputs()

    print(f"\n{'='*60}")
    print("Model Information")
    print(f"{'='*60}")
    print(f"\nInputs ({len(inputs)}):")
    for inp in inputs:
        print(f"  - {inp.name}: shape={inp.shape}, dtype={inp.type}")

    print(f"\nOutputs ({len(outputs)}):")
    output_names = []
    for out in outputs:
        print(f"  - {out.name}: shape={out.shape}, dtype={out.type}")
        output_names.append(out.name)

    # Run inference
    print(f"\n{'='*60}")
    print("Running Inference Test")
    print(f"{'='*60}")
    seq_len = 8
    vocab_size = 50257
    dummy_input = np.random.randint(0, vocab_size, (1, seq_len), dtype=np.int64)

    print(f"\nInput shape: {dummy_input.shape}")
    result = session.run(None, {inputs[0].name: dummy_input})

    print(f"\nOutput shapes:")
    for name, data in zip(output_names, result):
        print(f"  {name}: {data.shape}")

    # Verify contract
    print(f"\n{'='*60}")
    print("Contract Verification")
    print(f"{'='*60}")

    errors = []
    warnings = []

    # Check required outputs
    if "logits" not in output_names:
        errors.append("Missing required output: 'logits'")
    else:
        logits_idx = output_names.index("logits")
        logits_shape = result[logits_idx].shape
        if len(logits_shape) < 2:
            errors.append(
                f"logits shape should be [seq_len, vocab_size] or [batch, seq_len, vocab_size], got {logits_shape}"
            )
        print(f"✓ logits: {logits_shape}")

    # Check for attention outputs
    attn_outputs = [n for n in output_names if "attn_probs" in n]
    if not attn_outputs:
        warnings.append("No attention outputs found (layer_{L}_attn_probs)")
    else:
        print(f"✓ Found {len(attn_outputs)} attention output(s):")
        for attn_name in attn_outputs:
            attn_idx = output_names.index(attn_name)
            attn_shape = result[attn_idx].shape
            print(f"    {attn_name}: {attn_shape}")
            # Verify shape: [num_heads, seq_len, seq_len] or [batch, num_heads, seq_len, seq_len]
            if len(attn_shape) not in [3, 4]:
                errors.append(
                    f"{attn_name} shape should be 3D or 4D, got {len(attn_shape)}D"
                )

    # Check embedding output (optional but recommended)
    if "embedding_sum" in output_names:
        emb_idx = output_names.index("embedding_sum")
        emb_shape = result[emb_idx].shape
        print(f"✓ embedding_sum: {emb_shape}")
    else:
        warnings.append("embedding_sum not found (optional but recommended)")

    # Check MLP outputs
    mlp_outputs = [n for n in output_names if "mlp_output" in n]
    if mlp_outputs:
        print(f"✓ Found {len(mlp_outputs)} MLP output(s):")
        for mlp_name in mlp_outputs:
            mlp_idx = output_names.index(mlp_name)
            mlp_shape = result[mlp_idx].shape
            print(f"    {mlp_name}: {mlp_shape}")

    # Summary
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    if errors:
        print(f"\n❌ Errors ({len(errors)}):")
        for err in errors:
            print(f"  - {err}")
    else:
        print("\n✓ No errors")

    if warnings:
        print(f"\n⚠ Warnings ({len(warnings)}):")
        for warn in warnings:
            print(f"  - {warn}")
    else:
        print("\n✓ No warnings")

    return len(errors) == 0


def main():
    parser = argparse.ArgumentParser(description="Verify ONNX model against contract")
    parser.add_argument("--model", type=str, required=True, help="Path to ONNX model")
    args = parser.parse_args()

    success = verify_model(args.model)
    exit(0 if success else 1)


if __name__ == "__main__":
    main()

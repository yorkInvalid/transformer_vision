#!/usr/bin/env python3
"""
Export GPT-2 model to ONNX with intermediate activations.

Usage:
    python export.py [--model-path PATH] [--output PATH] [--layers LAYERS] [--all-layers] [--verify]
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
import torch
import torch.nn as nn
from transformers import GPT2LMHeadModel, GPT2Config
import onnx
import onnxruntime as ort
import numpy as np


class GPT2WithActivations(nn.Module):
    """
    GPT-2 wrapper that outputs intermediate activations.
    """

    def __init__(
        self, model: GPT2LMHeadModel, export_layers: Optional[List[int]] = None
    ):
        super().__init__()
        self.model = model
        self.config = model.config
        self.export_layers = export_layers or [self.config.n_layer - 1]  # 默认最后一层

    def forward(
        self,
        input_ids: torch.Tensor,
    ) -> Dict[str, torch.Tensor]:
        """
        Forward pass with intermediate activations.

        Returns:
            Dictionary with logits and activations.
        """
        outputs = {}
        batch_size, seq_len = input_ids.shape

        # Get embeddings
        wte = self.model.transformer.wte  # token embeddings
        wpe = self.model.transformer.wpe  # positional embeddings

        # Token and positional embeddings
        token_emb = wte(input_ids)
        position_ids = torch.arange(
            seq_len, dtype=torch.long, device=input_ids.device
        ).unsqueeze(0)
        pos_emb = wpe(position_ids)

        # Sum embeddings
        hidden_states = token_emb + pos_emb
        outputs["embedding_sum"] = hidden_states

        # Apply layer norm
        hidden_states = self.model.transformer.ln_f(hidden_states)

        # Process through transformer blocks
        for i, block in enumerate(self.model.transformer.h):
            # Self-attention
            attn_outputs = block.attn(
                block.ln_1(hidden_states),
                use_cache=False,
            )
            attn_output = attn_outputs[0]

            # Get attention weights (if available)
            if len(attn_outputs) > 1 and attn_outputs[1] is not None:
                # Attention weights from the attention module
                # Note: GPT2Attention doesn't return weights by default
                # We need to modify the forward to capture them
                pass

            # Residual connection
            hidden_states = hidden_states + attn_output

            # MLP
            mlp_output = block.mlp(block.ln_2(hidden_states))
            hidden_states = hidden_states + mlp_output

            # Export activations for specified layers
            if i in self.export_layers:
                # For attention weights, we need to manually compute them
                # This is a simplified version - in practice, you might need to
                # modify the attention module to return weights
                layer_prefix = f"layer_{i}"

                # Store MLP output
                outputs[f"{layer_prefix}_mlp_output"] = mlp_output

                # Note: Getting attention weights requires modifying the attention module
                # For now, we'll create a placeholder that can be filled by modifying
                # the model architecture or using a custom attention implementation
                # This is a limitation - we'll document it

        # Final layer norm
        hidden_states = self.model.transformer.ln_f(hidden_states)

        # Get logits
        logits = self.model.lm_head(hidden_states)
        outputs["logits"] = logits

        return outputs


class GPT2WithAttentionWeights(nn.Module):
    """
    Modified GPT-2 that captures attention weights.
    This is a more complete implementation that actually extracts attention weights.
    """

    def __init__(
        self, model: GPT2LMHeadModel, export_layers: Optional[List[int]] = None
    ):
        super().__init__()
        self.model = model
        self.config = model.config
        self.export_layers = export_layers or [self.config.n_layer - 1]

    def forward(self, input_ids: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Forward with attention weights."""
        outputs = {}
        batch_size, seq_len = input_ids.shape

        # Embeddings
        wte = self.model.transformer.wte
        wpe = self.model.transformer.wpe
        token_emb = wte(input_ids)
        position_ids = torch.arange(
            seq_len, dtype=torch.long, device=input_ids.device
        ).unsqueeze(0)
        pos_emb = wpe(position_ids)
        hidden_states = token_emb + pos_emb
        outputs["embedding_sum"] = hidden_states

        # Process layers
        for i, block in enumerate(self.model.transformer.h):
            # Layer norm 1
            ln1_out = block.ln_1(hidden_states)

            # Attention (we need to manually compute attention weights)
            # This is a simplified version - in production, you'd want to
            # modify the attention module to return weights
            attn_module = block.attn

            # Get Q, K, V
            # We'll use the attention module's internal computation
            # This is a workaround - ideally we'd modify GPT2Attention
            residual = hidden_states
            hidden_states = ln1_out

            # Manual attention computation to get weights
            # This is a simplified version
            # In practice, you might want to subclass GPT2Attention
            qkv = attn_module.c_attn(hidden_states)
            q, k, v = qkv.split(attn_module.split_size, dim=2)

            # Reshape for multi-head attention
            num_heads = attn_module.num_heads
            head_dim = attn_module.head_dim
            q = q.view(batch_size, seq_len, num_heads, head_dim).transpose(1, 2)
            k = k.view(batch_size, seq_len, num_heads, head_dim).transpose(1, 2)
            v = v.view(batch_size, seq_len, num_heads, head_dim).transpose(1, 2)

            # Compute attention scores
            attn_scores = torch.matmul(q, k.transpose(-2, -1)) / (head_dim**0.5)
            attn_probs = torch.softmax(attn_scores, dim=-1)

            # Apply to values
            attn_output = torch.matmul(attn_probs, v)
            attn_output = attn_output.transpose(1, 2).contiguous()
            attn_output = attn_output.view(batch_size, seq_len, attn_module.embed_dim)
            attn_output = attn_module.c_proj(attn_output)
            attn_output = attn_module.dropout(attn_output)

            hidden_states = residual + attn_output

            # Export attention weights for specified layers
            if i in self.export_layers:
                layer_prefix = f"layer_{i}"
                # Remove batch dimension for consistency with contract
                # Shape: [num_heads, seq_len, seq_len]
                outputs[f"{layer_prefix}_attn_probs"] = attn_probs.squeeze(0)

            # MLP
            mlp_input = block.ln_2(hidden_states)
            mlp_output = block.mlp(mlp_input)
            hidden_states = hidden_states + mlp_output

            if i in self.export_layers:
                layer_prefix = f"layer_{i}"
                outputs[f"{layer_prefix}_mlp_output"] = mlp_output.squeeze(0)

        # Final layer norm
        hidden_states = self.model.transformer.ln_f(hidden_states)

        # Logits
        logits = self.model.lm_head(hidden_states)
        outputs["logits"] = logits.squeeze(0)  # Remove batch dimension

        return outputs


def export_to_onnx(
    model_path: Optional[str] = None,
    output_path: str = "out/model.onnx",
    layers: Optional[List[int]] = None,
    all_layers: bool = False,
    opset_version: int = 14,
) -> str:
    """
    Export GPT-2 model to ONNX.

    Args:
        model_path: Path to model weights (None = download from HuggingFace)
        output_path: Output ONNX file path
        layers: List of layer indices to export (None = last layer only)
        all_layers: Export all layers
        opset_version: ONNX opset version

    Returns:
        Path to exported ONNX file
    """
    print("Loading model...")
    if model_path:
        model = GPT2LMHeadModel.from_pretrained(model_path)
    else:
        print("Downloading GPT-2 from HuggingFace...")
        model = GPT2LMHeadModel.from_pretrained("gpt2")

    model.eval()

    # Determine which layers to export
    num_layers = model.config.n_layer
    if all_layers:
        export_layers = list(range(num_layers))
    elif layers:
        export_layers = [int(l) for l in layers]
    else:
        export_layers = [num_layers - 1]  # Last layer only

    print(f"Exporting layers: {export_layers}")

    # Wrap model to capture activations
    wrapped_model = GPT2WithAttentionWeights(model, export_layers=export_layers)

    # Create dummy input
    dummy_input_ids = torch.randint(
        0, model.config.vocab_size, (1, 10), dtype=torch.long
    )

    print("Exporting to ONNX...")
    # Export
    torch.onnx.export(
        wrapped_model,
        dummy_input_ids,
        output_path,
        input_names=["input_ids"],
        output_names=list(wrapped_model(dummy_input_ids).keys()),
        dynamic_axes={
            "input_ids": {1: "seq_len"},
            "logits": {0: "seq_len"},
            "embedding_sum": {0: "seq_len"},
        },
        opset_version=opset_version,
        do_constant_folding=True,
    )

    print(f"✓ Exported to {output_path}")
    return output_path


def verify_onnx(model_path: str):
    """
    Verify exported ONNX model.

    Args:
        model_path: Path to ONNX model
    """
    print(f"\nVerifying {model_path}...")

    # Load model
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

    # Get input/output info
    input_name = session.get_inputs()[0].name
    input_shape = session.get_inputs()[0].shape

    print(f"\nInput:")
    print(f"  Name: {input_name}")
    print(f"  Shape: {input_shape}")

    print(f"\nOutputs ({len(session.get_outputs())}):")
    for output in session.get_outputs():
        print(f"  {output.name}: shape={output.shape}, dtype={output.type}")

    # Run inference with dummy input
    seq_len = 5
    dummy_input = np.random.randint(0, 50257, (1, seq_len), dtype=np.int64)

    print(f"\nRunning inference with input shape {dummy_input.shape}...")
    outputs = session.run(None, {input_name: dummy_input})

    print(f"\nOutput shapes:")
    for name, output in zip([o.name for o in session.get_outputs()], outputs):
        print(f"  {name}: {output.shape}")

    # Check required outputs
    output_names = [o.name for o in session.get_outputs()]
    required = ["logits"]
    missing = [r for r in required if r not in output_names]
    if missing:
        print(f"\n⚠ Warning: Missing required outputs: {missing}")
    else:
        print(f"\n✓ All required outputs present")

    # Check for attention weights
    attn_outputs = [n for n in output_names if "attn_probs" in n]
    if attn_outputs:
        print(f"✓ Found attention outputs: {attn_outputs}")
    else:
        print(f"⚠ Warning: No attention outputs found")


def main():
    parser = argparse.ArgumentParser(
        description="Export GPT-2 to ONNX with activations"
    )
    parser.add_argument(
        "--model-path", type=str, default=None, help="Path to model weights"
    )
    parser.add_argument(
        "--output", type=str, default="out/model.onnx", help="Output ONNX file path"
    )
    parser.add_argument(
        "--layers",
        type=str,
        default=None,
        help="Comma-separated layer indices to export (e.g., '0,5,11')",
    )
    parser.add_argument("--all-layers", action="store_true", help="Export all layers")
    parser.add_argument("--opset", type=int, default=14, help="ONNX opset version")
    parser.add_argument("--verify", action="store_true", help="Verify after export")

    args = parser.parse_args()

    # Parse layers
    layers = None
    if args.layers:
        layers = [int(l.strip()) for l in args.layers.split(",")]

    # Create output directory
    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Export
    try:
        export_to_onnx(
            model_path=args.model_path,
            output_path=args.output,
            layers=layers,
            all_layers=args.all_layers,
            opset_version=args.opset,
        )

        if args.verify:
            verify_onnx(args.output)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

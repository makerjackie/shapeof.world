# Inside a GPT — numerical provenance and limits

## Actual trained model

The unchanged [published model file](https://github.com/bbycroft/llm-viz/blob/9da93742382f1bf36c020c38a1ace454e82c4490/public/gpt-nano-sort-model.json)
comes from Brendan Bycroft's MIT-licensed LLM Visualization. It is the tiny
minGPT A/B/C sorting demonstration described in the upstream README, not a
chat model, a random network or a reproduction of any closed model's weights.
The weight file is 466,124 bytes; SHA-256:
`a38d5f450e0c808305973c587cdd389ca4de92bbf60fa6a4482bf9a03f0a6051`.

- Vocabulary: 0=A, 1=B, 2=C; six prompt letters followed by six sorted letters.
- Maximum context 11; the sixth generated output is predicted from six prompt
  tokens plus five previous output tokens. There is no separator or EOS token.
- 3 decoder blocks, 3 attention heads/block, 48-dimensional residual stream,
  16 dimensions/head, 192-dimensional feed-forward expansion.
- 85,728 trainable parameters, counting embeddings, affine biases, normalisation
  parameters and vocabulary projection; causal-mask buffers are not parameters.
- Learned absolute position embeddings; pre-layer normalisation with epsilon
  1e-5; affine projections; causal scaled dot-product attention; tanh-approximate
  GELU. Training dropout settings are exported but dropout is disabled for inference.

Model and reference values carry the original MIT notices. Complete licenses,
including the minGPT license, are in public/assets/llm-inside/. No upstream
homepage, font, photo, illustration or other third-party artistic asset is used.

## Reference checks

The [reference partials](https://github.com/bbycroft/llm-viz/blob/9da93742382f1bf36c020c38a1ace454e82c4490/public/gpt-nano-sort-t0-partials.json)
are preserved in __fixtures__/reference-partials.json. They contain three samples
of 11 positions. model.test.ts compares every element of 24 exported intermediates:
embeddings, normalisation, Q/K/V, attention scores and probabilities, value mixing,
projections, residual additions, feed-forward activations, all block outputs,
final normalisation, logits and vocabulary probabilities. Maximum observed
absolute difference is 1.907349e-6; the test tolerance is 3e-6. Differences arise
from JavaScript double accumulation versus upstream float32 arithmetic. Buffers
store float32 and the reference causal negative infinities are checked exactly.

All 729 possible length-six inputs are tested by real six-step autoregressive
**greedy** inference, with 729/729 correct sorts. Expected sorted strings are used
only by tests and the completed-output check, never by forward inference or
sampling. Higher-temperature sampling can produce incorrect sorts.

## Inference and sampling

model.ts implements every forward operation locally on the CPU; the GPU draws
actual resulting tensors. There is no remote AI API. Weight downloads are
reported from actual streamed bytes, and the original checksum is verified when
Web Crypto is available. Inference does not update trained weights.

At each position, Q and K dot products are divided by sqrt(16). Future keys are
masked with negative infinity and receive exactly zero attention probability.
Each head's weighted sum of V has 16 features; concatenation returns 48 features.
The attention output projection and the feed-forward output are added to the
residual stream. The final linear projection has three logits.

Raw probability matrices always use softmax at temperature one, with no top-k.
The generation panel applies temperature and top-k separately. Temperature zero
is greedy argmax; other temperatures divide logits before softmax. The highest-k
logits are retained, with stable ordering for ties. Sampling uses a deterministic
Mulberry32-style generator with seed + outputIndex × 104729. The displayed
runtime is the measured elapsed CPU time of that forward pass, not an average
or performance guarantee. Presentation slow-motion is independent of CPU time.

## Real interventions

Muting a head zeros that head's 16 context features before attention output
projection; skipping a feed-forward block zeros its projected FFN contribution
before the second residual addition. All later blocks are genuinely recomputed.
Attention maps themselves need not change when their head's context is muted.
The comparison uses identical context and raw temperature-one distributions,
so changes are not confounded with sampling temperature. Bias terms in later
projections remain; muting a head does not delete a block or retrain weights.
These demonstrations are local causal interventions, not a complete explanation
of the model's behaviour or evidence about the roles of all large-model heads.

## Reading the scene

The overview emphasises embeddings, all heads' Q/K/V vectors, attention matrices,
FFN activations, residual outputs and probabilities. All other actual matrices
and trained weights are available in the inspector and isolated matrix view.
Every displayed numerical cell belongs to its selected tensor. Row/column indices
are zero-based. Weight matrices store [output, input], as in the export.

Signed values use a blue/neutral/copper false-colour map normalised per tensor;
probabilities use a fixed zero-to-one green map. Cell height encodes normalised
absolute magnitude; masked score cells are dark. Spatial arrangement, cell size,
baseplate thickness, stage highlighting, labels and moving lights are artistic
presentation. Moving lights indicate order rather than physical data velocity.
Attention-link widths scale with their actual selected-row weights. Numeric
matrices and pointwise dot-product inspection remain the authority.

## Architecture references

- [Andrej Karpathy, minGPT](https://github.com/karpathy/minGPT): decoder blocks,
  learned positions, causal masking, GELU and the sorting task; MIT.
- [Vaswani et al., Attention Is All You Need](https://arxiv.org/abs/1706.03762):
  scaled dot-product and multi-head attention. The runnable model is decoder-only,
  rather than the original paper's full encoder-decoder translation network.
- [OpenAI GPT-2 model.py](https://github.com/openai/gpt-2/blob/master/src/model.py):
  default small-model comparison only: 12 blocks, width 768, 12 heads and context
  1024. No GPT-2 or larger-model weights are loaded or implied by this comparison.

The new source follows the repository AGPL-3.0-only license. Original public
content follows the repository content license. The unchanged upstream model
and reference fixture retain MIT terms, with notices and source links preserved.

The MAC readout counts mathematical multiply-accumulate terms in affine
projections and the causal QK/AV products. It excludes normalisation, softmax,
GELU, embedding lookup, bias addition and scalar scaling. It is not a count of
CPU machine instructions or a hardware-throughput estimate.

---
title: Transformer
kind: core
order: 4
tex: '\times\, n_l \text{ layers}'
---

A stack of $$n_l$$ identical layers. Each layer lets every token look at every other token through self-attention:

$$Q = XW_Q,\quad K = XW_K,\quad V = XW_V$$

$$\mathrm{Attn}(X) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V$$

followed by a feed-forward network, with residual connections around both: $$X \leftarrow X + \mathrm{Attn}(X)$$, then $$X \leftarrow X + \mathrm{FFN}(X)$$.

After $$n_l$$ layers each token's vector depends on the entire configuration, which is why the orbitals above are configuration-dependent.

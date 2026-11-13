---
title: Embedding
kind: layer
order: 5
---

Each token $$t_j$$ becomes a vector in $$\mathbb{R}^d$$:

$$x_j^{(0)} = W_E\,\mathrm{onehot}(t_j) + p_j$$

$$W_E$$ is a learned lookup table and $$p_j$$ a positional encoding, so the network knows which site a token belongs to. Stacking all tokens gives $$X^{(0)} \in \mathbb{R}^{L\times d}$$.

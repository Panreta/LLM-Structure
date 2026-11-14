---
title: Cross-entropy
order: 4
tex: '\mathrm{CE}(p, q) = -\sum_i p_i \log q_i = H(p) + \mathrm{KL}(p \,\Vert\, q)'
---
Split the KL divergence:

$$\mathrm{KL}(p \,\Vert\, q) = \underbrace{\sum_i p_i \log p_i}_{-H(p)} \; \underbrace{- \sum_i p_i \log q_i}_{\mathrm{CE}(p, q)}$$

When $$p$$ is fixed, $$-H(p)$$ is a constant, and constants do not matter in an optimization. **Minimizing the KL divergence over $$q$$ is the same as minimizing the cross-entropy.**

That is why classifiers and language models train with cross-entropy loss. The data supply $$p$$, often a one-hot label with $$H(p) = 0$$, and the model supplies $$q$$. For a language model, $$-\log q(\text{next token})$$ averaged over the data is exactly this loss.

**The figure** fixes a true distribution $$p$$ and lets the model $$q$$ vary. The blue curve is $$\mathrm{CE}(p, q)$$, the dashed line is $$H(p)$$, and the brown band between them is $$\mathrm{KL}(p \,\Vert\, q)$$. The curve never dips below the line and touches it only at $$q = p$$. The next block shows why.

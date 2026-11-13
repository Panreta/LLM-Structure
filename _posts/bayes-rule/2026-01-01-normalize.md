---
title: Normalize
kind: core
order: 2
tex: '\div\, p(x)'
---

Divide by the evidence, so the posterior sums (or integrates) to 1:

$$p(x) = \sum_\theta p(x \mid \theta)\,p(\theta) \quad\text{or}\quad \int p(x \mid \theta)\,p(\theta)\,d\theta$$

Because $$p(x)$$ doesn't depend on $$\theta$$, the posterior is proportional to the joint. This is why sampling methods like MCMC can skip computing it.

Example: $$p(H) = 0.25 + 0.45 = 0.7$$.

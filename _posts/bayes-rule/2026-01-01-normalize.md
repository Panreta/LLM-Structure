---
title: Normalize
order: 4
tex: 'p(x) = \int_0^1 p(x \mid \theta)\,p(\theta)\,d\theta'
---
Divide the joint by the evidence $$p(x)$$, its total area, so the posterior integrates to 1.

Example:

$$p(x) = 6\,B(9,5) = 6 \cdot \frac{8!\,4!}{13!} \approx 9.32 \times 10^{-4}$$

Since $$p(x)$$ doesn't depend on $$\theta$$, the posterior is proportional to the joint. That is why sampling methods like MCMC never need to compute it.

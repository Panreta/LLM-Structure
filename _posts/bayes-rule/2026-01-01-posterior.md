---
title: Posterior
order: 5
tex: 'p(\theta \mid x) = \frac{p(x \mid \theta)\,p(\theta)}{p(x)}'
---
The blue curve: the updated belief about $$\theta$$.

With a Beta prior the posterior is again a Beta, $$\mathrm{Beta}(2 + h, 2 + t)$$. In the example that is $$\mathrm{Beta}(9, 5)$$, with mean $$\tfrac{9}{14} \approx 0.643$$. That lies between the prior mean $$0.5$$ and the observed frequency $$0.7$$.

Add flips with the sliders: the data outweigh the prior, and the posterior narrows.

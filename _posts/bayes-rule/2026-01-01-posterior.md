---
title: Posterior
kind: tensor
order: 1
tex: 'p(\theta \mid x) = \frac{p(x \mid \theta)\,p(\theta)}{p(x)}'
---

The updated belief about $$\theta$$ after seeing the data $$x$$.

Running example: a coin is either fair ($$\theta = 0.5$$) or biased towards heads ($$\theta = 0.9$$). You flip it once and see heads. The posterior is

$$p(\text{fair} \mid H) = \tfrac{5}{14} \approx 0.36$$

$$p(\text{biased} \mid H) = \tfrac{9}{14} \approx 0.64$$

Today's posterior is tomorrow's prior: feeding it back in and observing more flips repeats the whole diagram.

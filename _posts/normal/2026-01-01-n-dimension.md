---
title: n dimensions
order: 4
tex: 'p_n(r) = \frac{r^{n-1} e^{-r^2/2}}{2^{n/2-1}\,\Gamma(n/2)}, \qquad \text{mode} = \sqrt{n - 1}'
---
For $$\mathbf{X} \sim \mathcal{N}(0, I_n)$$, the density at a point is $$(2\pi)^{-n/2} e^{-r^2/2}$$, largest at the center in every dimension (dashed). The probability at distance $$r$$ multiplies it by the area of the sphere of radius $$r$$, which grows like $$r^{n-1}$$. The product is the **chi distribution** (blue).

As $$n$$ grows, the factor $$r^{n-1}$$ wins near the center and $$e^{-r^2/2}$$ wins far out, so the probability piles up in a thin shell:

- the most likely radius is $$\sqrt{n - 1}$$ and the mean is close to $$\sqrt{n}$$;
- the width of the shell stays about $$1/\sqrt2$$, whatever $$n$$ is;
- the chance of landing within radius 1 of the center collapses: about $$2 \times 10^{-4}$$ at $$n = 10$$, $$2 \times 10^{-10}$$ at $$n = 20$$ and $$10^{-17}$$ at $$n = 30$$.

So the picture of an $$n$$-dimensional normal is a **soap bubble of radius $$\sqrt{n}$$**. Its density is highest at the center, yet almost no samples are found there. This is the unit-norm lemma of the high-dimensional geometry diagram, seen from the normal distribution's side: scale $$\mathbf{X}$$ by $$1/\sqrt{n}$$ and it lands near the unit sphere.

Practical consequences: random vectors in high dimensions are nearly orthogonal, Gaussian noise in a 1000-dimensional embedding has length about $$\sqrt{1000} \approx 32$$, and sampling "typical" points from a model never visits its single most likely point.

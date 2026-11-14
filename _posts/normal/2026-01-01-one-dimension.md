---
title: One dimension
order: 1
tex: '\varphi(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)'
---
The normal (Gaussian) distribution $$\mathcal{N}(\mu, \sigma^2)$$ has mean $$\mu$$, the center of the bell, and standard deviation $$\sigma$$, its width. The curve is highest at $$\mu$$ and bends from concave to convex at $$\mu \pm \sigma$$.

The constant $$\frac{1}{\sigma\sqrt{2\pi}}$$ makes the total area 1, because of the Gaussian integral $$\int_{-\infty}^{\infty} e^{-x^2/2}\, dx = \sqrt{2\pi}$$. Squaring that integral turns it into a 2-D integral in polar coordinates, which is the first hint that the normal distribution is happiest in several dimensions.

**The 68–95–99.7 rule.** About 68.3% of the probability lies within $$\mu \pm \sigma$$, 95.4% within $$\mu \pm 2\sigma$$ and 99.7% within $$\mu \pm 3\sigma$$. These are the shaded bands in the figure.

**Why it is everywhere.** By the central limit theorem, the sum of many small independent effects is approximately normal, whatever the effects' own distributions. Measurement errors, heights and the noise in a minibatch gradient all look Gaussian for this reason.

Write $$X = \mu + \sigma Z$$ with $$Z \sim \mathcal{N}(0, 1)$$: every normal is a shifted, stretched copy of the standard one. The next blocks build on $$Z$$.

---
title: Coefficients
kind: tensor
order: 2
tex: '\hat{\beta} = (X^\top X)^{-1} X^\top \mathbf{y}'
---

The minimizer of the squared error $$\lVert \mathbf{y} - X\beta \rVert^2$$.

Probabilistic view: if $$\mathbf{y} = X\beta + \varepsilon$$ with Gaussian noise $$\varepsilon \sim \mathcal{N}(\mathbf{0}, \sigma^2 I)$$, then $$\hat{\beta}$$ is also the maximum-likelihood estimate.

Example: $$\hat{\beta} = (\tfrac76, \tfrac12)$$, the line $$y = \tfrac76 + \tfrac12 x$$.

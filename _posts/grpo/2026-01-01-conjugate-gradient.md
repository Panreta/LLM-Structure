---
title: Conjugate gradient
order: 6
tex: 'H x = g \iff \min_x\ \varphi(x) = \tfrac12 x^\top H x - g^\top x'
---
Forming and inverting $$H$$ is far too expensive for a network with millions of parameters. Set $$x = H^{-1} g$$, so that the step is

$$\theta_{k+1} = \theta_k + \sqrt{\frac{2\delta}{x^\top H x}}\, x$$

and solve the linear system $$Hx = g$$ iteratively instead. Since $$\nabla\varphi(x) = Hx - g$$, solving it is the same as minimizing the quadratic $$\varphi$$.

**Steepest descent** steps along the residual $$r = g - Hx = -\nabla\varphi(x)$$ with the exact best step length. Every new direction is orthogonal to the last, so on a long narrow bowl it zigzags (brown): it uses only local information.

**Conjugate gradient** makes each new direction $$H$$-conjugate to all earlier ones, $$p_i^\top H p_j = 0$$, so later steps never undo earlier progress. On an $$n$$-dimensional quadratic it finishes in at most $$n$$ steps, 2 in the figure (blue).

**Algorithm.** Input: symmetric positive definite $$H$$, vector $$g$$, tolerance $$\epsilon$$. Start with $$x_0 = 0$$, $$r_0 = g - Hx_0$$, $$p_0 = r_0$$. For $$k = 0, 1, \dots$$:

1. Step size: $$\alpha_k = \dfrac{r_k^\top r_k}{p_k^\top H p_k}$$.
2. Update the solution: $$x_{k+1} = x_k + \alpha_k p_k$$.
3. Update the residual: $$r_{k+1} = r_k - \alpha_k H p_k$$.
4. If $$r_{k+1}^\top r_{k+1} < \epsilon$$, stop.
5. Conjugate direction: $$\beta_k = \dfrac{r_{k+1}^\top r_{k+1}}{r_k^\top r_k}$$, then $$p_{k+1} = r_{k+1} + \beta_k p_k$$.

Output: $$x \approx H^{-1} g$$.

The key point for TRPO: the algorithm touches $$H$$ only through products $$Hp$$. These Hessian-vector products cost about two backward passes, by differentiating $$(\nabla D_{\text{KL}})^\top p$$. So $$H$$ is never stored, and about 10 iterations are enough in practice.

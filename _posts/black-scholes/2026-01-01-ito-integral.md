---
title: Itô integral
order: 4
tex: '\int_0^t H_s\, dW_s = \lim_{\lVert\Pi\rVert \to 0} \sum_i H_{t_i}\bigl(W_{t_{i+1}} - W_{t_i}\bigr) \quad \text{in } L^2'
---
**Integrands.** Let $$H$$ be adapted (each $$H_t$$ is $$\mathcal{F}_t$$-measurable: it uses no future information) with $$\mathbb{E}\int_0^T H_s^2\, ds < \infty$$.

**Definition.** For a simple process $$H_s = \sum_i h_i \mathbf{1}_{[t_i, t_{i+1})}(s)$$, with $$h_i$$ being $$\mathcal{F}_{t_i}$$-measurable, set $$\int_0^t H\, dW = \sum_i h_i (W_{t_{i+1} \wedge t} - W_{t_i \wedge t})$$. The **Itô isometry**

$$\mathbb{E}\Bigl(\int_0^t H\, dW\Bigr)^2 = \mathbb{E}\int_0^t H_s^2\, ds$$

holds for simple processes. Every admissible $$H$$ is an $$L^2$$-limit of simple ones, so the integral extends by continuity. For continuous adapted $$H$$ it is the limit of the **left-point** sums above. The integral is a martingale with mean 0.

**Example.** The algebraic identity $$a(b - a) = \tfrac12(b^2 - a^2) - \tfrac12(b - a)^2$$ gives

$$\sum_i W_{t_i}\,\Delta W_i = \tfrac12 W_t^2 - \tfrac12 \sum_i (\Delta W_i)^2 \ \longrightarrow\ \tfrac12 W_t^2 - \tfrac12 t$$

by the previous block. So $$\int_0^t W\, dW = \tfrac12 W_t^2 - \tfrac12 t$$, not the $$\tfrac12 W_t^2$$ of ordinary calculus. The extra $$-\tfrac12 t$$ is the quadratic variation.

**The evaluation point matters.** With midpoints $$\tfrac12(W_{t_i} + W_{t_{i+1}})$$ the sums telescope exactly to $$\tfrac12 W_t^2$$: that is the Stratonovich integral. In finance the left point is the right choice. $$H_{t_i}$$ is the number of shares held over $$[t_i, t_{i+1})$$, which must be decided before the price move $$\Delta W_i$$ is known.

**The figure** shows all three on one path. The left sums (blue) approach $$\tfrac12 W_t^2 - \tfrac12 t$$ (dashed) as the partition is refined; the gap is exactly $$\tfrac12(t - \sum (\Delta W_i)^2)$$.

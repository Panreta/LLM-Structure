---
title: Quadratic variation
order: 3
tex: '\sum_{i} \bigl(W_{t_{i+1}} - W_{t_i}\bigr)^2 \;\xrightarrow{\ L^2\ }\; t \qquad \text{as } \max_i (t_{i+1} - t_i) \to 0'
---
**Theorem.** Let $$0 = t_0 < t_1 < \dots < t_n = t$$ be partitions of $$[0, t]$$ whose mesh $$\lVert\Pi\rVert = \max_i (t_{i+1} - t_i)$$ tends to 0, and let $$Q_\Pi = \sum_i (\Delta W_i)^2$$ with $$\Delta W_i = W_{t_{i+1}} - W_{t_i}$$. Then $$Q_\Pi \to t$$ in $$L^2$$.

**Proof.** The $$\Delta W_i \sim \mathcal{N}(0, \Delta t_i)$$ are independent, with $$\mathbb{E}(\Delta W_i)^2 = \Delta t_i$$ and $$\operatorname{Var}(\Delta W_i)^2 = 2(\Delta t_i)^2$$. So $$\mathbb{E}Q_\Pi = t$$ and

$$\mathbb{E}(Q_\Pi - t)^2 = \operatorname{Var} Q_\Pi = 2\sum_i (\Delta t_i)^2 \le 2t\,\lVert\Pi\rVert \to 0$$

For dyadic partitions, $$\sum_n 2t \cdot 2^{-n} < \infty$$, and Borel–Cantelli upgrades this to almost-sure convergence.

**Consequence: infinite total variation.**

$$\sum_i \lvert \Delta W_i \rvert \ \ge\ \frac{\sum_i (\Delta W_i)^2}{\max_i \lvert \Delta W_i \rvert} \ \to\ \infty$$

because the numerator tends to $$t > 0$$ and the denominator tends to 0 by uniform continuity of the path. A Brownian path has infinite length on every interval, so $$\int H\, dW$$ cannot be defined path by path as a Riemann–Stieltjes integral.

**Calculus shorthand.** Increments of size $$\sqrt{dt}$$ make second-order terms count: $$(dW_t)^2 = dt$$, $$dW_t\, dt = 0$$, $$(dt)^2 = 0$$. This multiplication table is all that Itô's lemma adds to ordinary calculus.

**The figure** refines the partition of one fixed path. The blue sum of squares settles onto the line $$y = t$$, while the readout shows the total variation growing like $$\sqrt{2n/\pi}$$.

---
title: Random walk
order: 1
tex: 'W^{(n)}_t = \frac{1}{\sqrt n} S_{\lfloor nt \rfloor} \;\xrightarrow{\ d\ }\; W_t \quad (n \to \infty)'
---
Let $$\xi_1, \xi_2, \dots$$ be independent with $$P(\xi_i = 1) = P(\xi_i = -1) = \tfrac12$$, so $$\mathbb{E}\xi_i = 0$$ and $$\operatorname{Var}\xi_i = 1$$. The random walk is $$S_k = \xi_1 + \dots + \xi_k$$.

Speed it up and shrink it: take $$n$$ steps per unit of time, each of size $$1/\sqrt n$$,

$$W^{(n)}_t = \frac{1}{\sqrt n}\, S_{\lfloor nt \rfloor}, \qquad t \ge 0$$

The scaling $$1/\sqrt n$$ is the only one that keeps the variance finite and nonzero: $$\operatorname{Var} W^{(n)}_t = \lfloor nt \rfloor / n \to t$$. With $$1/n$$ the walk would flatten to 0, and with steps of size 1 it would explode.

**Each fixed time.** By the central limit theorem, $$W^{(n)}_t \to \mathcal{N}(0, t)$$ in distribution.

**Whole paths.** Interpolate linearly between the steps, so that $$W^{(n)}$$ is a random continuous function. **Donsker's invariance principle** (1951) says $$W^{(n)}$$ converges in distribution, as a random element of $$C[0, 1]$$ with the sup norm, to Brownian motion $$W$$. The limit does not depend on the step distribution, as long as the steps are i.i.d. with mean 0 and variance 1: hence "invariance".

**The figure** shows five walks. Increase $$n$$: the staircase becomes a rough continuous curve, and most paths stay within $$\pm 2\sqrt t$$.

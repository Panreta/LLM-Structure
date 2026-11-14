---
title: Brownian motion
order: 2
tex: 'W_0 = 0, \qquad W_t - W_s \sim \mathcal{N}(0,\, t - s) \ \text{independent of } \mathcal{F}_s, \qquad t \mapsto W_t \ \text{continuous}'
---
**Definition.** A standard Brownian motion (Wiener process) on a probability space $$(\Omega, \mathcal{F}, P)$$ is a process $$(W_t)_{t \ge 0}$$ with

1. $$W_0 = 0$$;
2. independent increments: for $$0 \le t_0 < t_1 < \dots < t_k$$, the increments $$W_{t_1} - W_{t_0}, \dots, W_{t_k} - W_{t_{k-1}}$$ are independent;
3. Gaussian increments: $$W_t - W_s \sim \mathcal{N}(0, t - s)$$ for $$s < t$$;
4. continuous paths: $$t \mapsto W_t(\omega)$$ is continuous for almost every $$\omega$$.

Such a process exists (Wiener, 1923); Lévy's construction builds it from a series of hat functions with Gaussian coefficients. Let $$\mathcal{F}_t = \sigma(W_s : s \le t)$$ be the information revealed up to time $$t$$.

**Properties used later.**

- $$\mathbb{E}W_t = 0$$ and $$\operatorname{Cov}(W_s, W_t) = \min(s, t)$$.
- **Scaling:** for $$c > 0$$, $$\bigl(c^{-1/2} W_{ct}\bigr)_{t \ge 0}$$ is again a Brownian motion.
- **Martingale:** $$\mathbb{E}[W_t \mid \mathcal{F}_s] = W_s$$ for $$s \le t$$.
- **Roughness:** almost every path is nowhere differentiable (Paley, Wiener and Zygmund, 1933). Paths are Hölder continuous of every order $$< \tfrac12$$ and of no order $$\ge \tfrac12$$. A typical increment over a step $$h$$ has size $$\sqrt h \gg h$$, so $$\Delta W / h$$ has no limit.

**The figure** draws 30 paths with the bands $$\pm\sqrt t$$ and $$\pm 2\sqrt t$$. At the chosen time the sideways curve is the $$\mathcal{N}(0, t)$$ density; the readout compares it with the 30 sampled values.

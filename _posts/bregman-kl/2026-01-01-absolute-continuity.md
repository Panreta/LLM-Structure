---
title: Absolute continuity
order: 4
tex: 'D_{\mathrm{KL}}(P \,\Vert\, Q) = \int \log\!\left(\frac{dP}{dQ}\right) dP \quad \text{requires} \quad P \ll Q'
---
**Formula.** For distributions $$P$$ and $$Q$$ with densities (or mass functions) $$p$$ and $$q$$:

$$D_{\mathrm{KL}}(P \,\Vert\, Q) = \sum_x p(x) \log \frac{p(x)}{q(x)} \quad \text{(discrete)}$$

$$D_{\mathrm{KL}}(P \,\Vert\, Q) = \int p(x) \log \frac{p(x)}{q(x)} \, dx \quad \text{(continuous)}$$

In full measure-theoretic form:

$$D_{\mathrm{KL}}(P \,\Vert\, Q) = \int \log\!\left(\frac{dP}{dQ}\right) dP$$

**Which direction?** $$P$$ must be absolutely continuous with respect to $$Q$$, written $$P \ll Q$$:

$$Q(A) = 0 \;\Longrightarrow\; P(A) = 0 \quad \text{for every measurable } A$$

In density terms, wherever $$q(x) = 0$$, you also need $$p(x) = 0$$. If this fails, $$D_{\mathrm{KL}}(P \,\Vert\, Q) = +\infty$$.

**Reason.** Short answer: you divide by $$q$$, so $$q$$ can't be zero where $$p$$ has mass.

Why it's that direction and not the other: look at a single term $$p(x)\log\frac{p(x)}{q(x)}$$ and check the two ways a zero can appear.

1. $$p(x) = 0,\ q(x) > 0$$: the term is $$0 \cdot \log 0$$. Since $$\lim_{t \to 0^+} t \log t = 0$$, the convention is $$0 \log \frac{0}{q} = 0$$. This is harmless, so $$Q$$ may put mass where $$P$$ doesn't.
2. $$p(x) > 0,\ q(x) = 0$$: the term is $$p(x) \log \frac{p(x)}{0} = +\infty$$. This one blows up, so $$P$$ may **not** put mass where $$Q$$ doesn't.

So the support of $$P$$ must lie inside the support of $$Q$$, which is exactly $$P \ll Q$$.

**Measure-theoretic version.** The general formula needs the Radon–Nikodym derivative $$\frac{dP}{dQ}$$. By the Radon–Nikodym theorem, a function $$f = \frac{dP}{dQ}$$ with

$$P(A) = \int_A f \, dQ$$

exists if and only if $$P \ll Q$$ (for $$\sigma$$-finite measures, which includes all probability measures). Without it, the integrand $$\log \frac{dP}{dQ}$$ isn't defined, and $$D_{\mathrm{KL}}$$ is set to $$+\infty$$ by definition.

**Example.** Let $$P = \text{Bernoulli}(0.5)$$ and $$Q = \text{Bernoulli}(1)$$, so $$q(0) = 0$$ but $$p(0) = 0.5$$:

$$D_{\mathrm{KL}}(P \,\Vert\, Q) = 0.5\log\frac{0.5}{0} + 0.5\log\frac{0.5}{1} = +\infty$$

$$D_{\mathrm{KL}}(Q \,\Vert\, P) = 0\cdot\log\frac{0}{0.5} + 1\cdot\log\frac{1}{0.5} = \log 2$$

The second is finite because $$Q \ll P$$ holds.

This asymmetry has a practical consequence. Minimizing $$D_{\mathrm{KL}}(P \,\Vert\, Q)$$ over $$Q$$ forces $$Q$$ to cover all of $$P$$'s support ("mass-covering"). Minimizing $$D_{\mathrm{KL}}(Q \,\Vert\, P)$$, as in variational inference, lets $$Q$$ ignore parts of $$P$$ ("mode-seeking").

**The figure.** In the first case, Q is positive on all of $$[-1, 1]$$, so $$D_{\mathrm{KL}}(P \,\Vert\, Q)$$ is finite even though Q looks nothing like P. The reverse $$D_{\mathrm{KL}}(Q \,\Vert\, P)$$ is $$+\infty$$, because Q has mass outside $$[-1, 1]$$ where $$p = 0$$. "Q has a hole" zeroes Q on a strip inside P's support, and $$D_{\mathrm{KL}}(P \,\Vert\, Q)$$ jumps to $$+\infty$$. "Bernoulli" draws the example above.

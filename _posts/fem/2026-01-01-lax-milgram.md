---
title: Lax–Milgram
order: 3
tex: '\lvert a(u, v) \rvert \le M \lVert u \rVert \lVert v \rVert, \quad a(v, v) \ge \alpha \lVert v \rVert^2 \;\Longrightarrow\; \exists!\, u: \ a(u, v) = \ell(v)\ \forall v, \quad \lVert u \rVert \le \frac{\lVert \ell \rVert}{\alpha}'
---
**Theorem (Lax–Milgram, 1954).** Let $$V$$ be a Hilbert space, $$a(\cdot,\cdot)$$ a bilinear form on $$V$$ and $$\ell$$ a bounded linear functional. If $$a$$ is

- **bounded:** $$\lvert a(u, v) \rvert \le M \lVert u \rVert \lVert v \rVert$$, and
- **coercive:** $$a(v, v) \ge \alpha \lVert v \rVert^2$$ with $$\alpha > 0$$,

then there is exactly one $$u \in V$$ with $$a(u, v) = \ell(v)$$ for all $$v \in V$$, and it depends continuously on the data: $$\lVert u \rVert \le \lVert \ell \rVert / \alpha$$.

**Why.** By the Riesz representation theorem, $$a(u, \cdot)$$ is $$\langle Au, \cdot \rangle$$ for a bounded operator $$A$$, and $$\ell$$ is $$\langle r, \cdot \rangle$$. The problem is $$Au = r$$. Coercivity gives $$\alpha \lVert u \rVert \le \lVert Au \rVert$$, so $$A$$ is injective with closed range. If some $$w$$ were orthogonal to the range, then $$\alpha \lVert w \rVert^2 \le \langle Aw, w \rangle = 0$$. So $$A$$ is invertible. When $$a$$ is symmetric, this is just Riesz in the energy inner product, and $$u$$ minimizes the energy $$\tfrac12 a(v, v) - \ell(v)$$.

For $$-u'' = f$$, $$a(v, v) = \lVert v' \rVert^2$$, so $$\alpha = M = 1$$ and the weak problem has exactly one solution.

**The figure** adds a reaction term, $$a(u, v) = \int u' v' + c\, u v$$, and tests coercivity on the modes $$\phi_k = \sin k\pi x$$. Each bar is $$a(\phi_k, \phi_k) / \lVert \phi_k' \rVert^2 = 1 + c/(k\pi)^2$$. The Poincaré inequality $$\lVert v \rVert \le \lVert v' \rVert / \pi$$ is sharp for $$\phi_1$$, so $$\alpha = \min(1, 1 + c/\pi^2)$$.

- $$c \ge 0$$ (absorption): always coercive.
- $$-\pi^2 < c < 0$$: still coercive, but $$\alpha \to 0$$ and the bound $$\lVert \ell \rVert / \alpha$$ blows up.
- $$c = -\pi^2$$: $$\sin \pi x$$ solves the problem with $$f = 0$$, so uniqueness fails.
- $$c < -\pi^2$$: not coercive; Lax–Milgram is silent. Other tools, such as the Fredholm alternative, are needed.

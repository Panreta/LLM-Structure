---
title: Three dimensions
order: 3
tex: 'p(\mathbf{x}) = (2\pi)^{-3/2}\, e^{-\lVert \mathbf{x} \rVert^2 / 2}, \qquad P(\lVert \mathbf{X} \rVert \le r) = P\bigl(\chi^2_3 \le r^2\bigr)'
---
The 3-D standard normal is again a product of three independent 1-D normals, and again depends only on the radius. Its density is a **ball of fog**, thickest at the center and thinning out in every direction alike. A correlated 3-D normal stretches the ball into an ellipsoid, just as in 2-D.

**The figure** shows that fog as samples, slowly rotating so you can see it looks the same from every side. Drag to turn it, tap for a fresh sample, or pause the rotation. The core within $$1\sigma$$ (blue) is packed tight. The outer points (black, then brown) become sparse.

Now count instead of looking. The share of samples is

| region | probability | volume | density |
|---|---|---|---|
| core, $$r \le 1$$ | 19.9% | 4.2 | highest |
| shell, $$1 < r \le 2$$ | 54.0% | 29.3 | medium |
| shell, $$2 < r \le 3$$ | 23.2% | 79.6 | low |

The **middle shell holds the most points**, yet the core is the **densest** region. Both are true because shells farther out have more volume: the sphere's area grows like $$4\pi r^2$$. The readout measures both quantities on the drawn samples.

This is the key to picturing any dimension. Do not try to draw $$n$$ axes. Use symmetry: the density depends only on $$r = \lVert \mathbf{x} \rVert$$, so draw how probability is spread over $$r$$. That is the next block.

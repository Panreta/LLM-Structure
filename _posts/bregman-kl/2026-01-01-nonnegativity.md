---
title: Nonnegativity
order: 5
tex: 'B_\varphi(p, q) = \varphi(p) - \varphi(q) - \langle \nabla\varphi(q),\, p - q \rangle \ge 0'
---
Since $$\varphi$$ is convex, its Bregman divergence is never negative, and it is zero only at $$p = q$$ when $$\varphi$$ is strictly convex. Two ways to see it:

**Geometry.** A convex function lies above all of its tangents. The **epigraph** $$\{(x, y) : y \ge \varphi(x)\}$$ is a convex set, and each tangent plane is a supporting plane of it. So the tangent at $$q$$ is below $$\varphi$$ everywhere, and the gap at $$p$$ is $$\ge 0$$. In the figure, all the gray tangents stay under the blue curve.

**Taylor.** In one dimension, Taylor's theorem with the Lagrange remainder gives

$$\varphi(p) = \varphi(q) + \varphi'(q)(p - q) + \tfrac12 \varphi''(\xi)(p - q)^2$$

for some $$\xi$$ between $$p$$ and $$q$$, so $$B_\varphi(p, q) = \tfrac12\varphi''(\xi)(p - q)^2 \ge 0$$ because $$\varphi'' \ge 0$$. In $$n$$ dimensions the Hessian is positive semidefinite instead. The dashed brown curve is the quadratic approximation at $$q$$: near $$q$$, the divergence behaves like $$\tfrac12\varphi''(q)(p - q)^2$$.

For the negative entropy, $$\varphi''(q) = 1/(q(1 - q))$$ on two outcomes. That quadratic term is the **Fisher information**, the matrix $$H$$ in the TRPO block of the GRPO diagram.

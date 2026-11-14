---
title: Variation
order: 1
tex: 'J(x) = \int_0^T L(t, x, \dot x)\, dt, \qquad J(x + \alpha\eta) = J(x) + \alpha \int_0^T \Bigl(\frac{\partial L}{\partial x}\eta + \frac{\partial L}{\partial \dot x}\dot\eta\Bigr)dt + o(\alpha)'
---
A **functional** assigns a number to a whole path. Set

$$J(x) := \int_0^T L(t, x, \dot x)\, dt$$

over paths $$x \in C^2[0, T]$$ with fixed ends $$x(0) = x_0$$, $$x(T) = x_T$$, where the **Lagrangian** $$L$$ is twice continuously differentiable.

To test whether $$x$$ is optimal, perturb it: $$x + \alpha\eta$$ with a direction $$\eta$$ and a number $$\alpha$$. The perturbed path must keep the same ends, so $$x + \alpha\eta = x$$ at $$t = 0, T$$, which forces

$$\eta(0) = \eta(T) = 0$$

Expanding $$L$$ to first order in $$\alpha$$ gives the formula above. The remainder is $$o(\alpha)$$, smaller than $$\alpha$$ as $$\alpha \to 0$$ (generally not $$o(\alpha^2)$$: the next term is of order $$\alpha^2$$). The coefficient of $$\alpha$$ is the **first variation**

$$DJ(x)[\eta] = \frac{d}{d\alpha} J(x + \alpha\eta)\Big|_{\alpha = 0}$$

If $$x$$ minimizes $$J$$, then $$\alpha \mapsto J(x + \alpha\eta)$$ has a minimum at $$\alpha = 0$$ for **every** admissible $$\eta$$, so $$DJ(x)[\eta] = 0$$ for every $$\eta$$. This is calculus's "derivative equals zero" in infinitely many directions at once.

**The figure** uses $$J(x) = \int_0^1 \tfrac12\dot x^2 + \tfrac12 x^2\, dt$$ with $$x(0) = 0$$, $$x(1) = 1$$, whose minimizer is $$x^*(t) = \sinh t / \sinh 1$$. For it the expansion is exact: $$J(x^* + \alpha\eta) = J(x^*) + \alpha^2 \cdot \tfrac12\int(\dot\eta^2 + \eta^2)\, dt$$, with no linear term. The inset shows the parabola, flat at $$\alpha = 0$$ for each choice of $$\eta$$.

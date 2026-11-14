---
title: Euler–Lagrange equation
order: 2
tex: '\frac{\partial L}{\partial x} - \frac{d}{dt}\frac{\partial L}{\partial \dot x} = 0'
---
**Integrate by parts** the $$\dot\eta$$ term of the first variation:

$$\int_0^T \frac{\partial L}{\partial \dot x}\dot\eta\, dt = \Bigl[\frac{\partial L}{\partial \dot x}\eta\Bigr]_0^T - \int_0^T \frac{d}{dt}\frac{\partial L}{\partial \dot x}\, \eta\, dt$$

The boundary term vanishes because $$\eta(0) = \eta(T) = 0$$. Hence

$$DJ(x)[\eta] = \int_0^T \Bigl(\frac{\partial L}{\partial x} - \frac{d}{dt}\frac{\partial L}{\partial \dot x}\Bigr)\eta\, dt = \bigl\langle \delta J(x),\, \eta \bigr\rangle_{L^2}$$

with the $$L^2$$ inner product $$\langle f, g \rangle = \int_0^T f g\, dt$$. The function

$$\delta J(x) = \frac{\partial L}{\partial x} - \frac{d}{dt}\frac{\partial L}{\partial \dot x}$$

is the **gradient** of $$J$$ in this inner product (its Riesz representative), the infinite-dimensional analogue of $$\nabla f$$.

**Fundamental lemma of the calculus of variations.** If $$g$$ is continuous on $$[0, T]$$ and $$\int_0^T g\eta\, dt = 0$$ for every smooth $$\eta$$ with $$\eta(0) = \eta(T) = 0$$, then $$g \equiv 0$$.

*Proof.* If $$g(t_0) > 0$$ for some $$t_0 \in (0, T)$$, then by continuity $$g > 0$$ on an interval around $$t_0$$. Take $$\eta \ge 0$$ to be a bump supported in that interval and positive at $$t_0$$. Then $$\int g\eta > 0$$, a contradiction. The case $$g(t_0) < 0$$ is the same with $$-\eta$$.

So a minimizer (indeed any stationary path) satisfies the **Euler–Lagrange equation**

$$\frac{\partial L}{\partial x} - \frac{d}{dt}\frac{\partial L}{\partial \dot x} = 0$$

a second-order ODE for $$x(t)$$, to be solved with the two boundary values. It is necessary but not sufficient: a solution can be a minimum, a maximum or a saddle of $$J$$, as the Hamilton's principle block shows. When $$L$$ is convex in $$(x, \dot x)$$, a solution is a global minimizer.

**The figure** is the proof of the lemma. For the path $$x = t$$ with $$L = \tfrac12\dot x^2 + \tfrac12 x^2$$, $$\delta J = x - \ddot x = t > 0$$, and a bump where $$\delta J > 0$$ gives a positive first variation, so this path can be improved. Switch to $$x^* = \sinh t / \sinh 1$$: $$\delta J \equiv 0$$ and every bump gives 0.

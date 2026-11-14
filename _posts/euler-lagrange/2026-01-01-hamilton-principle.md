---
title: "Hamilton's principle"
order: 5
tex: 'S[x] = \int_0^T \bigl(K - U\bigr)\, dt, \qquad \delta S = 0 \;\Longleftrightarrow\; m\ddot x = -\frac{\partial U}{\partial x}'
---
Mechanics is a variational problem. For a particle of mass $$m$$ with kinetic energy $$K = \tfrac12 m\dot x^2$$ in a potential $$U(x)$$, take the Lagrangian $$L = K - U$$ and the **action** $$S[x] = \int_0^T L\, dt$$.

**Euler–Lagrange gives Newton.**

$$\frac{\partial L}{\partial x} = -\frac{\partial U}{\partial x}, \qquad \frac{\partial L}{\partial \dot x} = m\dot x, \qquad \frac{d}{dt}\frac{\partial L}{\partial \dot x} = m\ddot x$$

so the Euler–Lagrange equation reads $$m\ddot x = -\partial U / \partial x = F$$. **Hamilton's principle:** the motion between two fixed configurations makes the action stationary.

*Sign convention.* The standard choice is $$L = K - U$$. With $$L = U - K$$ the Euler–Lagrange equation is multiplied by $$-1$$: you get $$\frac{\partial U}{\partial x} = -m\ddot x$$, the same law. But then $$\frac{d}{dt}\frac{\partial L}{\partial \dot x} = -m\ddot x$$, not $$+m\ddot x$$, so each intermediate step must carry the minus sign.

**Stationary, not least.** "Least action" is a misnomer for long times. The figure takes the oscillator $$U = \tfrac12 x^2$$ ($$m = 1$$, so $$\ddot x = -x$$) from $$x(0) = 0$$ to $$x(T) = 1$$, with true path $$x = \sin t / \sin T$$. In the direction $$\eta = \sin(\pi t / T)$$,

$$S(x + \alpha\eta) = S(x) + \alpha^2 \cdot \frac{T}{4}\Bigl(\frac{\pi^2}{T^2} - 1\Bigr)$$

positive for $$T < \pi$$ (a minimum), negative for $$T > \pi$$. The true path is then a saddle of the action, yet still the physical motion, because only stationarity matters.

**Why this formulation is powerful.**

- Any coordinates work: angles, constrained coordinates, fields. One writes $$L = K - U$$ in those coordinates and the equations of motion follow.
- Symmetries give conservation laws (Noether's theorem). Time invariance gives energy, translation invariance momentum, rotation invariance angular momentum.
- The same principle with other Lagrangians gives Fermat's principle in optics (Snell's law), geodesics in general relativity, and the field equations of electromagnetism and the Standard Model.

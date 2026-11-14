---
title: "Hamilton's principle"
order: 5
tex: '\begin{aligned} S[x] &= \int_0^T \bigl(K - U\bigr)\, dt \\ \delta S = 0 \;&\Longleftrightarrow\; m\ddot x = -\frac{\partial U}{\partial x} \end{aligned}'
---
Mechanics is a variational problem. For a particle of mass $$m$$ with kinetic energy $$K = \tfrac12 m\dot x^2$$ in a potential $$U(x)$$, take the Lagrangian $$L = K - U$$ and the **action** $$S[x] = \int_0^T L\, dt$$.

**The short way: only $$K$$ and $$U$$.** The key fact is that the two energies depend on different things: $$K$$ only on the velocity $$\dot x$$, and $$U$$ only on the position $$x$$. So each partial derivative of $$L$$ sees just one of them:

$$\begin{aligned} \frac{\partial L}{\partial x} &= -\frac{\partial U}{\partial x} = F \\ \frac{\partial L}{\partial \dot x} &= \frac{\partial K}{\partial \dot x} = m\dot x = p \end{aligned}$$

The first is the force; the second is the momentum. Newton's second law, "force = rate of change of momentum", then reads

$$F = \frac{dp}{dt} \quad\Longleftrightarrow\quad \frac{\partial L}{\partial x} = \frac{d}{dt}\frac{\partial L}{\partial \dot x}$$

which is exactly the Euler–Lagrange equation for $$L = K - U$$. Read from right to left, Euler–Lagrange gives Newton; read from left to right, Newton is Euler–Lagrange. No general theory is needed, only the split of $$L$$ into a velocity part and a position part.

**Directly from the action.** The same two facts let you vary $$S$$ by hand. Perturb the path to $$x + \delta x$$ with $$\delta x(0) = \delta x(T) = 0$$. To first order, $$\delta K = m\dot x\,\delta\dot x$$ and $$\delta U = U'(x)\,\delta x$$, so

$$\begin{aligned} \delta S &= \int_0^T \bigl(m\dot x\,\delta\dot x - U'(x)\,\delta x\bigr)\, dt \\ &= \Bigl[m\dot x\,\delta x\Bigr]_0^T - \int_0^T \bigl(m\ddot x + U'(x)\bigr)\,\delta x\, dt \end{aligned}$$

after integrating the first term by parts. The boundary term is 0. By the fundamental lemma, $$\delta S = 0$$ for every $$\delta x$$ exactly when $$m\ddot x = -U'(x)$$.

**Hamilton's principle:** the motion between two fixed configurations makes the action stationary. In 3-D, or with many particles, the same computation runs coordinate by coordinate: $$K = \sum_i \tfrac12 m_i \lVert\dot{\mathbf{x}}_i\rVert^2$$ and $$U(\mathbf{x}_1, \dots, \mathbf{x}_N)$$ give $$m_i\ddot{\mathbf{x}}_i = -\nabla_{\mathbf{x}_i} U$$.

*Sign convention.* The standard choice is $$L = K - U$$. With $$L = U - K$$ both partial derivatives flip sign, $$\frac{\partial L}{\partial x} = \frac{\partial U}{\partial x}$$ and $$\frac{d}{dt}\frac{\partial L}{\partial \dot x} = -m\ddot x$$, so the Euler–Lagrange equation gives the same law $$m\ddot x = -\partial U/\partial x$$. Each intermediate step must carry the minus sign, though. The sign matters once $$L$$ is used for more than its equation: the momentum $$p = \partial L / \partial \dot x$$ and the Hamiltonian of the next block are defined from $$L = K - U$$.

**Stationary, not least.** "Least action" is a misnomer for long times. The figure takes the oscillator $$U = \tfrac12 x^2$$ ($$m = 1$$, so $$\ddot x = -x$$) from $$x(0) = 0$$ to $$x(T) = 1$$, with true path $$x = \sin t / \sin T$$. In the direction $$\eta = \sin(\pi t / T)$$,

$$S(x + \alpha\eta) = S(x) + \alpha^2 \cdot \frac{T}{4}\Bigl(\frac{\pi^2}{T^2} - 1\Bigr)$$

positive for $$T < \pi$$ (a minimum), negative for $$T > \pi$$. The true path is then a saddle of the action, yet still the physical motion, because only stationarity matters.

**Why this formulation is powerful.**

- Any coordinates work: angles, constrained coordinates, fields. One writes $$L = K - U$$ in those coordinates and the equations of motion follow.
- Symmetries give conservation laws (Noether's theorem). Time invariance gives energy, translation invariance momentum, rotation invariance angular momentum.
- The same principle with other Lagrangians gives Fermat's principle in optics (Snell's law), geodesics in general relativity, and the field equations of electromagnetism and the Standard Model.

---
title: "Hamilton's equations"
order: 6
tex: 'p = \frac{\partial L}{\partial \dot x}, \quad H(x, p) = p\dot x - L, \qquad \dot x = \frac{\partial H}{\partial p}, \quad \dot p = -\frac{\partial H}{\partial x}'
---
**Legendre transform.** Define the momentum $$p = \partial L / \partial \dot x$$. When $$L$$ is strictly convex in $$\dot x$$, this can be solved for $$\dot x(x, p)$$. The **Hamiltonian** is

$$H(x, p) = p\,\dot x - L(x, \dot x)$$

with $$\dot x$$ expressed through $$p$$. For $$L = \tfrac12 m\dot x^2 - U(x)$$: $$p = m\dot x$$ and $$H = \frac{p^2}{2m} + U(x)$$, the total energy.

**Hamilton's equations.** Differentiate:

$$dH = \dot x\, dp + p\, d\dot x - L_x\, dx - L_{\dot x}\, d\dot x = \dot x\, dp - L_x\, dx$$

since $$p = L_{\dot x}$$. So $$\partial H/\partial p = \dot x$$ and $$\partial H/\partial x = -L_x = -\frac{d}{dt}L_{\dot x} = -\dot p$$, using the Euler–Lagrange equation. One second-order equation becomes two first-order ones,

$$\dot x = \frac{\partial H}{\partial p}, \qquad \dot p = -\frac{\partial H}{\partial x}$$

**Consequences.**

- $$\frac{dH}{dt} = H_x\dot x + H_p\dot p = H_x H_p - H_p H_x = 0$$: energy is conserved when $$H$$ has no explicit $$t$$. This is the Beltrami identity of the brachistochrone block in another guise.
- Motion lives on level curves of $$H$$ in the **phase space** $$(x, p)$$, and the flow preserves area (Liouville's theorem). That is why symplectic integrators are used for long simulations of planets and molecules.
- Quantum mechanics starts here: replace $$p$$ by $$-i\hbar\,\partial_x$$ in $$H$$ to get the Schrödinger equation. Statistical mechanics weights states by $$e^{-H/kT}$$.

**The figure** is a pendulum: $$H = \tfrac12 p^2 - \cos\theta$$ (unit mass, length and gravity). Level curves with $$H < 1$$ are closed loops, back-and-forth swings. Curves with $$H > 1$$ run across, full rotations. The separatrix $$H = 1$$ (dashed) divides them. The blue point is integrated from Hamilton's equations, and the readout shows $$H$$ staying constant.

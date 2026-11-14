---
title: Optimal control
order: 7
tex: '\mathcal{H}(x, u, \lambda) = \lambda^\top f(x, u) - \ell(x, u), \qquad \dot x = \frac{\partial \mathcal{H}}{\partial \lambda}, \quad \dot\lambda = -\frac{\partial \mathcal{H}}{\partial x}, \quad u^* = \arg\max_u \mathcal{H}'
---
Control asks the variational question with a steering wheel: choose an input $$u(t)$$ to minimize

$$\int_0^T \ell(x, u)\, dt \quad \text{subject to} \quad \dot x = f(x, u), \quad x(0) = x_0$$

**From Euler–Lagrange to Pontryagin.** Treat the dynamics as a constraint with a multiplier $$\lambda(t)$$, the **costate**, and make

$$\int_0^T \bigl[\ell(x, u) + \lambda^\top(\dot x - f(x, u))\bigr]\, dt$$

stationary in $$x$$, $$u$$ and $$\lambda$$. With the control Hamiltonian $$\mathcal{H} = \lambda^\top f - \ell$$, the Euler–Lagrange equations become exactly Hamilton's equations above. The state $$x$$ plays the role of position and the costate $$\lambda$$ that of momentum. Stationarity in $$u$$ gives $$\partial\mathcal{H}/\partial u = 0$$. **Pontryagin's maximum principle** (1956) strengthens this to $$u^*(t) = \arg\max_u \mathcal{H}$$, which also covers bounded controls and bang-bang solutions.

**Linear–quadratic regulator.** For linear dynamics $$\dot x = Ax + Bu$$ and quadratic cost $$\ell = x^\top Q x + u^\top R u$$, the costate is linear in the state, $$\lambda = -2Px$$. Here $$P$$ solves the algebraic **Riccati equation** (for the infinite horizon)

$$A^\top P + PA - PBR^{-1}B^\top P + Q = 0$$

and the optimal control is the feedback $$u = -R^{-1}B^\top P x$$. **The figure** solves the cart $$\ddot x = u$$ ($$x$$ is position, $$v$$ velocity) with $$\ell = x^2 + r u^2$$. By hand, $$P_{12} = \sqrt r$$, $$P_{22} = \sqrt2\, r^{3/4}$$, so

$$u = -\frac{1}{\sqrt r}\, x - \sqrt2\, r^{-1/4}\, v$$

The minimal cost from $$x = 1$$ at rest is $$P_{11} = \sqrt2\, r^{1/4}$$, which the readout checks numerically. Lower $$r$$ makes control cheaper and the response faster and harsher.

**Where it is used.**

- Rockets and spacecraft: fuel-optimal landing and orbit transfers are Pontryagin problems, solved today by convex optimization on board.
- Robotics and autonomous driving: model predictive control re-solves a finite-horizon optimal control problem many times a second.
- Estimation: the Kalman filter is the dual of LQR, with the same Riccati equation.
- Dynamic programming: the value function $$V(t, x)$$ satisfies the Hamilton–Jacobi–Bellman equation $$-\partial_t V = \min_u \bigl[\ell + \nabla V \cdot f\bigr]$$, whose characteristics are Pontryagin's equations with $$\lambda = -\nabla V$$. It is the same Hamilton–Jacobi theory as in classical mechanics, and the continuous-time form of the Bellman equation in reinforcement learning.

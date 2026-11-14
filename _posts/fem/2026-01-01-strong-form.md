---
title: Strong form
order: 1
tex: '-u''''(x) = f(x) \ \text{on } (0, 1), \qquad u(0) = u(1) = 0'
---
The model problem for the whole story: a string, a rod or a wall under a load $$f$$, held at zero at both ends. In 1-D, the steady heat equation, an elastic bar and electrostatics all reduce to this equation.

A **classical** (strong) solution is a function $$u \in C^2$$ that satisfies the equation at every point. Asking for two continuous derivatives is demanding:

- a point load or a jump in $$f$$ already breaks it;
- so do a material coefficient that jumps, as in $$-(\kappa u')' = f$$ for a bar made of two metals;
- and so do domains with corners in 2-D or 3-D, like the plate in the last block.

The finite element method starts by weakening what "solution" means.

**The figure** shows the example used in every block. With $$f(x) = \pi^2 \sin \pi x + 1.6\pi^2 \sin 2\pi x$$ (brown, scaled down), the exact solution is $$u(x) = \sin \pi x + 0.4 \sin 2\pi x$$ (blue). Knowing $$u$$ exactly lets us measure the numerical error later.

---
title: The valley
order: 1
tex: 'f(\mathbf{x}) = \tfrac12 (x_1 - 1.2)^2 + \tfrac{25}{2} (x_2 - 0.4)^2'
---
Every chapter descends the same long, narrow valley. The contour lines are the level sets $$f = c$$, and the cross marks the minimizer $$\mathbf{x}^\star = (1.2,\ 0.4)$$.

The curvature is 1 along $$x_1$$ and 25 along $$x_2$$. The Hessian is $$\mathrm{diag}(1, 25)$$, so $$\mu = 1$$, $$L = 25$$, and the condition number is $$\kappa = L/\mu = 25$$.

A large $$\kappa$$ means steep walls and a nearly flat floor. Training a neural network looks like this in millions of dimensions at once, and each optimizer in the story is a better answer to the same question: how do you walk down a valley that is steep one way and flat the other?

Tap empty space in the figure to move the start $$\mathbf{x}_0$$.

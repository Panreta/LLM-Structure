---
title: Gradient descent
order: 3
tex: '\mathbf{x}_{k+1} = \mathbf{x}_k - \eta\,\nabla f(\mathbf{x}_k)'
---
The simplest optimizer: step downhill, scaled by the learning rate $$\eta$$. On this valley the update acts on each coordinate separately:

$$\begin{aligned} x_1 - 1.2 &\leftarrow (1 - \eta)\,(x_1 - 1.2) \\ x_2 - 0.4 &\leftarrow (1 - 25\eta)\,(x_2 - 0.4) \end{aligned}$$

Both factors must have magnitude below 1, so $$\eta < 2/L = 0.08$$. Push the slider past that and the path flies off.

At the default $$\eta = 0.07$$ the factor across the valley is $$-0.75$$: the path zigzags from wall to wall. The factor along the valley is $$0.93$$: progress toward $$\mathbf{x}^\star$$ is slow. A smaller $$\eta$$ stops the zigzag but crawls even more slowly.

The best fixed choice still shrinks the error by only $$\frac{\kappa - 1}{\kappa + 1} = \frac{24}{26}$$ per step. One learning rate cannot suit both directions.

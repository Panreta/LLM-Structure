---
title: Line search
order: 7
tex: '\theta_{k+1} = \theta_k + \alpha^i \sqrt{\frac{2\delta}{x^\top H x}}\; x, \qquad \alpha \in (0, 1)'
---
The step came from a linear model of $$J$$ and a quadratic model of the KL, so it can be wrong. TRPO backtracks: try $$i = 0, 1, 2, \dots$$ and take the smallest $$i$$ for which the new policy really improves the surrogate and really satisfies the KL constraint.

**The figure** uses the running example with $$\alpha = \tfrac12$$. Brown rings are rejected candidates, and the blue dot is the first one accepted. Here the full step ($$i = 0$$) is always rejected. The quadratic model underestimates the true KL as the policy moves away from a nearly deterministic $$p$$, so even a small $$\delta$$ overshoots it slightly. With a large $$\delta$$ the full step also runs past the peak of $$J$$ and makes things worse.

**Algorithm: TRPO with a value network.**

1. Initialize the policy parameters $$\theta$$ and the value-network parameters $$\omega$$.
2. For each iteration:
   1. Sample trajectories $$\{s_1, a_1, r_1, s_2, a_2, r_2, \dots\}$$ with the current policy $$\pi_\theta$$.
   2. Estimate the advantages $$A(s_t, a_t)$$ with the value network.
   3. Compute the gradient $$g$$ of the surrogate objective.
   4. Compute $$x \approx H^{-1} g$$ with conjugate gradient.
   5. Line search for the smallest $$i$$ that improves the surrogate and keeps the KL within $$\delta$$, and set $$\theta_{k+1}$$ as above.
   6. Fit the value network to the observed returns, as in actor–critic methods.

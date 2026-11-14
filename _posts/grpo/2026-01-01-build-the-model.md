---
title: Build the model
order: 3
tex: 'J(\theta'') - J(\theta) = \frac{1}{1-\gamma}\, \mathbb{E}_{s \sim \mathcal{V}^{\pi_{\theta''}}}\, \mathbb{E}_{a \sim \pi_{\theta''}(\cdot \mid s)} \bigl[A^{\pi_\theta}(s, a)\bigr]'
---
The objective is the expected value of the start state, $$J(\theta) = \mathbb{E}_{s_0}[V^{\pi_\theta}(s_0)]$$. To compare a new policy $$\theta'$$ with the old one $$\theta$$, write $$J(\theta)$$ as a telescoping sum along trajectories of the *new* policy. This works because $$s_0$$ does not depend on the policy:

$$J(\theta) = \mathbb{E}_{\pi_{\theta'}}\Bigl[\sum_{t=0}^\infty \gamma^t V^{\pi_\theta}(s_t) - \sum_{t=1}^\infty \gamma^t V^{\pi_\theta}(s_t)\Bigr] = -\mathbb{E}_{\pi_{\theta'}}\Bigl[\sum_{t=0}^\infty \gamma^t \bigl(\gamma V^{\pi_\theta}(s_{t+1}) - V^{\pi_\theta}(s_t)\bigr)\Bigr]$$

Subtracting this from $$J(\theta') = \mathbb{E}_{\pi_{\theta'}}[\sum_t \gamma^t r(s_t, a_t)]$$ gives

$$J(\theta') - J(\theta) = \mathbb{E}_{\pi_{\theta'}}\Bigl[\sum_{t=0}^\infty \gamma^t \bigl(r(s_t, a_t) + \gamma V^{\pi_\theta}(s_{t+1}) - V^{\pi_\theta}(s_t)\bigr)\Bigr]$$

The bracket is the temporal-difference error. Its expectation over $$s_{t+1}$$ is the **advantage** $$A^{\pi_\theta}(s, a) = Q^{\pi_\theta}(s, a) - V^{\pi_\theta}(s)$$: how much better action $$a$$ is than the policy's average in $$s$$.

Finally, regroup the sum by state. With $$P^\pi_t(s)$$ the probability of being in $$s$$ at time $$t$$, the **discounted state visitation distribution** is

$$\mathcal{V}^\pi(s) = (1-\gamma) \sum_{t=0}^\infty \gamma^t P^\pi_t(s)$$

and $$\sum_t \gamma^t \mathbb{E}_{s_t \sim P_t}[\,\cdot\,] = \frac{1}{1-\gamma} \mathbb{E}_{s \sim \mathcal{V}}[\,\cdot\,]$$, which gives the formula above (the performance difference lemma).

**The figure** builds $$\mathcal{V}^\pi$$ for the running example. Bar $$t$$ has height $$(1-\gamma)\gamma^t$$, split into the chance of being in B (blue) or A (gray) at time $$t$$. The blue parts add up to $$\mathcal{V}^\pi(B)$$. A larger $$\gamma$$ looks further ahead.

So $$J(\theta') \ge J(\theta)$$ whenever $$\mathbb{E}_{s \sim \mathcal{V}^{\pi_{\theta'}}} \mathbb{E}_{a \sim \pi_{\theta'}}[A^{\pi_\theta}(s, a)] \ge 0$$: the new policy should prefer actions that the old policy's advantage calls good.

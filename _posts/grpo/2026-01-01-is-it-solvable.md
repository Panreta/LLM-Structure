---
title: Is it solvable?
order: 4
tex: '\max_{\theta''} L_\theta(\theta'') \quad \text{s.t.} \quad \mathbb{E}_{s \sim \mathcal{V}^{\pi_\theta}}\bigl[D_{\text{KL}}(\pi_\theta(\cdot \mid s) \,\Vert\, \pi_{\theta''}(\cdot \mid s))\bigr] \le \delta'
---
Not directly. The states are drawn from $$\mathcal{V}^{\pi_{\theta'}}$$, the visitation of the policy we are still solving for, so we cannot collect samples from it. Replace it with the old policy's visitation, $$s \sim \mathcal{V}^{\pi_\theta}$$, and reweight the actions by **importance sampling**:

$$J(\theta') \approx L_\theta(\theta') = J(\theta) + \frac{1}{1-\gamma}\, \mathbb{E}_{s \sim \mathcal{V}^{\pi_\theta}}\, \mathbb{E}_{a \sim \pi_\theta(\cdot \mid s)}\Bigl[\frac{\pi_{\theta'}(a \mid s)}{\pi_\theta(a \mid s)} A^{\pi_\theta}(s, a)\Bigr]$$

Everything on the right can now be estimated from trajectories of the old policy.

**The figure** shows why the approximation needs a leash. $$L_\theta$$ (blue) touches the true $$J$$ (black) at $$\theta' = \theta$$ with the same slope, but it keeps rising while $$J$$ turns down. Maximizing $$L_\theta$$ without limits would overshoot badly. Hence the **trust region**: only move where the new policy stays close to the old one in KL divergence (the gray band). The blue dot is the best surrogate value inside the band, and the ring is the true $$J$$ there.

**Remark 2.** Both distances are Bregman divergences, $$B_\varphi(x, y) = \varphi(x) - \varphi(y) - \langle \nabla\varphi(y), x - y \rangle$$. With $$\varphi(x) = \tfrac12\lVert x \rVert^2$$ you get half the squared Euclidean distance. With the negative entropy $$\varphi(p) = \sum_a p_a \log p_a$$ you get $$D_{\text{KL}}(p \,\Vert\, q)$$. KL is to probability distributions what squared distance is to vectors.

**Question 1.** Why $$D_{\text{KL}}(\pi_\theta \,\Vert\, \pi_{\theta'})$$ and not $$D_{\text{KL}}(\pi_{\theta'} \,\Vert\, \pi_\theta)$$? Because $$D_{\text{KL}}(\pi_\theta \,\Vert\, \pi_{\theta'}) = \mathbb{E}_{a \sim \pi_\theta}[\log \pi_\theta(a \mid s) - \log \pi_{\theta'}(a \mid s)]$$ is an average over the *old* policy's actions, the ones we already sampled. It also matches the bound in the TRPO paper that makes the surrogate a guaranteed lower bound on $$J$$ (up to a penalty).

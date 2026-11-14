---
title: PPO-Penalty
order: 9
tex: '\theta_{k+1} = \arg\max_\theta\ \mathbb{E}_{s,\, a \sim \pi_{\theta_k}}\Bigl[\frac{\pi_\theta(a \mid s)}{\pi_{\theta_k}(a \mid s)} A^{\pi_{\theta_k}}(s, a) - \beta\, D_{\text{KL}}\bigl(\pi_{\theta_k}(\cdot \mid s) \,\Vert\, \pi_\theta(\cdot \mid s)\bigr)\Bigr]'
---
Turn the constraint into a penalty, as with a Lagrange multiplier. The right $$\beta$$ is not known in advance, so it adapts after each update. With $$d_k = \mathbb{E}_{s \sim \mathcal{V}^{\pi_{\theta_k}}}[D_{\text{KL}}(\pi_{\theta_k} \,\Vert\, \pi_{\theta_{k+1}})]$$:

1. If $$d_k < \delta / 1.5$$, the step was too timid: $$\beta_{k+1} = \beta_k / 2$$.
2. If $$d_k > 1.5\,\delta$$, the step was too bold: $$\beta_{k+1} = 2\beta_k$$.
3. Otherwise $$\beta_{k+1} = \beta_k$$.

**Remark 4.** The constants 1.5 and 2 are purely empirical; the algorithm is not sensitive to them.

**The figure** plots the penalized objective $$L - \beta\,\text{KL}$$ (brown) next to the surrogate $$L$$ (blue) and the true $$J$$ (black). A small $$\beta$$ barely bends $$L$$, and its maximizer runs off. A large $$\beta$$ pins the policy at $$\theta$$. The readout applies the rule above to the step you chose.

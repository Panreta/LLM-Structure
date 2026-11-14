---
title: KL divergence
order: 3
tex: 'B_\varphi(p, q) = \sum_i p_i \log \frac{p_i}{q_i} = \mathrm{KL}(p \,\Vert\, q)'
---
Put the negative entropy into the Bregman divergence:

$$\begin{aligned} B_\varphi(p, q) &= \sum_i p_i \log p_i - \sum_i q_i \log q_i - \sum_i (\log q_i + 1)(p_i - q_i) \\ &= \sum_i p_i \log p_i - \sum_i p_i \log q_i - \sum_i (p_i - q_i) \\ &= \sum_i p_i \log \frac{p_i}{q_i} \end{aligned}$$

In the second line the two $$\sum_i q_i \log q_i$$ terms cancel. The last sum is zero when $$p$$ and $$q$$ are probability vectors, since both sum to 1. The result is the **Kullback–Leibler divergence**. For general positive vectors that last term stays, and $$B_\varphi(p, q) = \sum_i p_i \log\frac{p_i}{q_i} - \sum_i p_i + \sum_i q_i$$, the generalized KL divergence.

**The figure** shows it as a tangent gap on the two-outcome simplex. The blue curve is $$\varphi$$, the dashed line its tangent at $$q$$, and the brown gap at $$p$$ matches $$\sum_i p_i \log(p_i/q_i)$$ computed directly. The readout also gives $$\mathrm{KL}(q \,\Vert\, p)$$, which is different: KL measures how badly $$q$$ stands in for $$p$$, not a symmetric distance.

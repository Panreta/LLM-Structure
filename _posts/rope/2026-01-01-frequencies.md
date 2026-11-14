---
title: Choosing θ
order: 5
tex: '\theta_i = 10000^{-2(i-1)/d}, \qquad i = 1, \dots, \tfrac d2'
---
One loose end: $$\theta = \Theta_g(q, k, 1) + \Theta(k) - \Theta(q)$$, but $$g$$ is still abstract. The derivation does not fix $$\theta$$. *Any* angle makes the score depend only on $$m - n$$, so $$\theta$$ is a design choice.

With $$d/2$$ pairs, each pair gets its own frequency, as in the sinusoidal position encoding of the original Transformer:

$$\theta_i = \frac{1}{10000^{2(i-1)/d}}, \qquad i \in \left[1, \tfrac d2\right], \qquad \text{token} \in \mathbb{R}^d$$

**The figure** has one dial per pair, turned to position $$m$$. Dial 1 turns a full radian per position and repeats every $$2\pi \approx 6.3$$ positions. The last dials turn so slowly that they need tens of thousands of positions for one turn. Together they work like the hands of a clock: the fast ones resolve neighbouring tokens, the slow ones tell far-apart tokens apart without repeating.

A useful consequence noted by Su: with these frequencies, the score between unrelated $$q$$ and $$k$$ tends to shrink as $$\lvert m - n \rvert$$ grows, a mild preference for nearby tokens.

The whole construction is just rotating vectors in the complex plane, but it works remarkably well. RoPE is the position encoding of LLaMA, Qwen, DeepSeek and most open language models. Context-extension methods such as NTK scaling and YaRN work by changing the base 10000 or rescaling the $$\theta_i$$.

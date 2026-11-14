---
title: Negative entropy
order: 2
tex: '\varphi(p) = \sum_i p_i \log p_i, \qquad \nabla\varphi(q) = \bigl(\log q_i + 1\bigr)_{i \in [n]}'
---
Choose $$\varphi(p) = \sum_i p_i \log p_i$$ for $$p \in \mathbb{R}^n$$ with positive entries. It is convex: its Hessian is $$\mathrm{diag}(1/p_i)$$, positive definite.

It is called the **negative Shannon entropy** because $$\varphi = -H$$, where $$H(p) = -\sum_i p_i \log p_i$$. The formula itself has no minus sign, so it can look like a "positive" quantity. But on probability vectors every $$p_i \le 1$$, so every $$\log p_i \le 0$$ and $$\varphi(p) \le 0$$. Its values really are negative, and the name refers to the sign of $$H$$.

Differentiating term by term, $$\partial_i (p_i \log p_i) = \log p_i + 1$$, which gives the gradient above.

**The figure** restricts to two outcomes, $$p = (p_1, 1 - p_1)$$. The blue curve is $$\varphi$$, convex with its minimum $$-\log 2$$ at the uniform distribution. The dashed curve is $$H = -\varphi$$, concave with its maximum $$\log 2$$ there: the uniform distribution is the most uncertain. The readout gives $$\nabla\varphi$$ at your $$p$$.

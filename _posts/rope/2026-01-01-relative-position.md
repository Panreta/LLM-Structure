---
title: Relative position
order: 1
tex: '\langle f(q, m),\ f(k, n) \rangle = g(q, k, m - n)'
---
The method is due to Jianlin Su; see his [paper and blog post](https://spaces.ac.cn/archives/8265). It solves the relative position embedding problem.

Attention compares a query $$q$$ at position $$m$$ with a key $$k$$ at position $$n$$. We want to write the positions into the vectors themselves:

$$\tilde q_m = f(q, m), \qquad \tilde k_n = f(k, n)$$

Here $$f$$ is the embedding function. Position 0 should change nothing, which is the boundary condition $$f(q, 0) = q$$, $$f(k, 0) = k$$.

What should $$f$$ achieve? The similarity of a query and a key should depend on *how far apart* they are, $$m - n$$, not on where they sit in the sequence:

$$\langle f(q, m), f(k, n) \rangle = g(q, k, m - n)$$

Here $$g$$ is only an abstract function that records this requirement. The derivation in the next chapters will find its structure.

**The figure** shows the goal, using the answer the derivation will reach. Cell $$(m, n)$$ is the score between $$q$$ placed at $$m$$ and $$k$$ placed at $$n$$. Every diagonal has a single color: moving both tokens by the same amount leaves their score unchanged. Change $$\theta$$ and the stripes change width, but they stay diagonal.

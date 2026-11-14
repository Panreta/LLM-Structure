---
title: Embedding form
order: 4
tex: 'f(q, m) = \begin{pmatrix} \cos m\theta & -\sin m\theta \\ \sin m\theta & \cos m\theta \end{pmatrix} \begin{pmatrix} \mathrm{Re}(q) \\ \mathrm{Im}(q) \end{pmatrix}'
---
Putting length and angle together:

$$f(q, m) = \lVert q \rVert\, e^{\hat i(\Theta(q) + m\theta)} = q\, e^{\hat i m\theta}$$

**The position embedding is a rotation by $$m\theta$$.** In real coordinates it is the rotation matrix above.

The requirement now holds by construction:

$$\langle f(q, m), f(k, n) \rangle = \mathrm{Re}\bigl(q e^{\hat i m\theta}\, k^\ast e^{-\hat i n\theta}\bigr) = \mathrm{Re}\bigl(q k^\ast e^{\hat i (m-n)\theta}\bigr)$$

which depends on the positions only through $$m - n$$.

**The figure** places $$q$$ at position $$m$$ and $$k$$ at position $$n$$. The score depends only on the angle between the rotated vectors (the arc), which is the original angle plus $$(m - n)\theta$$. Raise $$m$$ and $$n$$ together and the score stays put; change only one and it moves.

**In $$d$$ dimensions** split the vector into $$d/2$$ pairs, read each pair as a complex number, and rotate pair $$i$$ by its own angle $$m\theta_i$$. The matrix is block-diagonal with $$2 \times 2$$ rotation blocks, so the score is a sum of $$d/2$$ such terms. In practice it is applied elementwise with cosines and sines, never as a matrix product. Unlike absolute position embeddings, nothing is added to the token: RoPE rotates $$q$$ and $$k$$ inside every attention layer, and leaves the values alone.

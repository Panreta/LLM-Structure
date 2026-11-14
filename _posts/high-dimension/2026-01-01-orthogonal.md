---
title: Nearly orthogonal
order: 5
tex: 'P\bigl(\lvert \langle u, v \rangle \rvert \ge \varepsilon\bigr) \le 4\exp\!\left(-\frac{n\varepsilon^2}{8}\right)'
---
Draw two independent vectors $$u, v$$ with entries from $$\mathcal{N}(0, \tfrac1n)$$. In the plane a random angle is spread out, but in high dimensions they are almost always nearly perpendicular.

**Proof by polarization.**

$$\langle u, v \rangle = \left\lVert \frac{u+v}{2} \right\rVert^2 - \left\lVert \frac{u-v}{2} \right\rVert^2$$

and $$\frac{u \pm v}{\sqrt2}$$ again have independent $$\mathcal{N}(0, \tfrac1n)$$ entries. So $$\langle u, v \rangle \ge \varepsilon$$ forces one of them to have a squared norm off from 1 by at least $$\varepsilon$$. The unit-norm lemma bounds each case by $$e^{-n\varepsilon^2/8}$$, which gives $$2e^{-n\varepsilon^2/8}$$ for each sign and $$4e^{-n\varepsilon^2/8}$$ in total.

**The figure.** The direction $$u/\lVert u \rVert$$ of a Gaussian vector is uniform on the sphere, and the angle $$\theta$$ between two uniform directions has density proportional to $$\sin^{n-2}\theta$$. At $$n = 3$$ it is a broad hump; raise $$n$$ and it collapses onto $$90^\circ$$. The brown tails are the angles with $$\lvert\cos\theta\rvert \ge \varepsilon$$.

One consequence: a matrix with independent $$\mathcal{N}(0, \tfrac1n)$$ entries has columns of length about 1 that are nearly orthogonal to each other. It is almost an orthogonal matrix, with no Gram–Schmidt needed.

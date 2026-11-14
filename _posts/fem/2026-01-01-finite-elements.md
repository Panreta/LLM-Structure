---
title: Hat functions
order: 5
tex: 'V_h = \operatorname{span}\{\phi_1, \dots, \phi_{N-1}\}, \qquad \phi_i(x_j) = \delta_{ij}'
---
The **finite element** choice of $$V_h$$: cut $$[0, 1]$$ into $$N$$ elements with nodes $$x_i = ih$$, $$h = 1/N$$, and take the continuous functions that are linear on each element and zero at both ends.

A basis is given by the **hat functions** $$\phi_i$$, equal to 1 at node $$i$$ and 0 at every other node. Every $$v_h \in V_h$$ is $$v_h = \sum_i v_h(x_i)\, \phi_i$$: its coefficients are just its nodal values.

Two properties make the method work:

1. **Local support.** $$\phi_i$$ is nonzero on only two elements, so most pairs $$\phi_i, \phi_j$$ do not overlap. That makes the matrix in the next chapter sparse.
2. **Approximation.** The interpolant $$I_h u = \sum_i u(x_i)\, \phi_i$$ satisfies $$\lVert (u - I_h u)' \rVert \le C h \lVert u'' \rVert$$. With Céa's lemma, $$\lVert (u - u_h)' \rVert = O(h)$$.

Hat functions are in $$H^1_0$$ even though they have kinks: their derivatives are step functions, which is all the weak form needs. This is where weakening pays off.

**The figure** shows the hats (brown: the one you select), the exact $$u$$ (black) and its interpolant (blue). Refine the mesh and the interpolant hugs $$u$$.

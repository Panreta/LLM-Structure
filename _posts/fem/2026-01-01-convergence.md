---
title: Convergence
order: 8
tex: '\lVert (u - u_h)'' \rVert \le C h \lVert u'''' \rVert, \qquad \lVert u - u_h \rVert_{L^2} \le C h^2 \lVert u'''' \rVert'
---
The theory predicts how fast the error falls as the mesh is refined.

- **Energy norm.** Céa's lemma plus the interpolation estimate: $$\lVert (u - u_h)' \rVert \le \frac M\alpha \lVert (u - I_h u)' \rVert = O(h)$$.
- **$$L^2$$ norm.** One order better, by the **Aubin–Nitsche duality trick**. Solve an auxiliary problem with the error itself as the load, then use Galerkin orthogonality twice. The result is $$O(h^2)$$.

**The figure** plots the measured errors for $$N = 2, 4, \dots, 256$$ on log–log axes. The lines have slopes 1 (brown, energy) and 2 (blue, $$L^2$$): halving $$h$$ halves the energy error and quarters the $$L^2$$ error, as the readout confirms.

These rates need $$u'' \in L^2$$. When the solution is less smooth, for instance near a corner, the rates drop. The next chapter shows such a case.

Higher-degree elements (quadratics, cubics) raise both rates by one per degree when the solution is smooth enough. Adaptive refinement (smaller elements only where the error is large) recovers optimal rates for singular solutions.

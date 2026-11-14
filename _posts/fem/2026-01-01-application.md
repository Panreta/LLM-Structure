---
title: 'Application: a heated plate'
order: 9
tex: '\int_\Omega \nabla T \cdot \nabla v \, dx = \int_\Omega q\, v \, dx \quad \text{for all } v \in H^1_0(\Omega)'
---
Now the same steps on a real problem: the steady temperature $$T$$ in an L-shaped metal plate whose edges are cooled to $$T = 0$$, with a heat source $$q$$. The strong form is $$-\Delta T = q$$ (unit conductivity).

1. **Weak form:** multiply by $$v$$ and integrate by parts with the divergence theorem; the boundary term vanishes because $$v = 0$$ on the edges.
2. **Lax–Milgram:** $$a(T, v) = \int \nabla T \cdot \nabla v$$ is coercive on $$H^1_0(\Omega)$$ by the Poincaré inequality on $$\Omega$$, so there is exactly one temperature field.
3. **Galerkin with finite elements:** cut the plate into triangles and use continuous, piecewise-linear functions; the 2-D hat at a node is a tent over the triangles around it.
4. **Assembly:** each triangle contributes the $$3 \times 3$$ matrix $$\text{area} \cdot \nabla\phi_a \cdot \nabla\phi_b$$, scattered into a sparse, symmetric positive definite $$K$$.
5. **Solve:** with conjugate gradient, the method from the GRPO story. It needs only products $$KP$$, and converges because $$K$$ is SPD.

**The figure** solves all of this live in your browser at every change: drag the hot spot, or switch to a uniform source and refine the mesh.

**The re-entrant corner.** At the inner corner the solution behaves like $$r^{2/3} \sin(\tfrac23\vartheta)$$ in polar coordinates around it. The temperature is continuous, but its gradient (the heat flux) is infinite there. This is the same mathematics as the stress concentration at the inside corner of a bracket, where real parts crack. Because $$T'' \notin L^2$$ near the corner, uniform refinement converges only like $$h^{2/3}$$ in energy instead of $$h$$. Production codes refine the mesh toward such corners adaptively.

The same pipeline (weak form, coercivity, elements, assembly, sparse solve) drives structural analysis, heat transfer, electromagnetics and fluid flow in tools such as FEniCS, deal.II, Abaqus and COMSOL.

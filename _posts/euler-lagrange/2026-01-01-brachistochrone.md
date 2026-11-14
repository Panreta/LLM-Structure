---
title: Brachistochrone
order: 4
tex: 'T[y] = \int_0^b \frac{\sqrt{1 + y''^2}}{\sqrt{2 g y}}\, dx, \qquad y\,(1 + y''^2) = 2R \;\Longrightarrow\; \begin{cases} x = R(\theta - \sin\theta) \\ y = R(1 - \cos\theta) \end{cases}'
---
The second example, posed by Johann Bernoulli in 1696: a bead slides without friction from rest at $$A$$ to a lower point $$B$$. Which curve gets it there fastest?

**The functional.** Measure $$y$$ downward from $$A$$. Energy conservation gives the speed $$v = \sqrt{2gy}$$ at depth $$y$$, and the time to cover the arc $$ds = \sqrt{1 + y'^2}\, dx$$ is $$ds / v$$, so

$$T[y] = \int_0^b \frac{\sqrt{1 + y'^2}}{\sqrt{2gy}}\, dx, \qquad L(y, y') = \frac{\sqrt{1 + y'^2}}{\sqrt{2gy}}$$

**Beltrami identity.** $$L$$ does not depend on $$x$$ explicitly. Then $$H = y'\frac{\partial L}{\partial y'} - L$$ is constant along solutions:

$$\frac{dH}{dx} = y''L_{y'} + y'\frac{d}{dx}L_{y'} - L_y y' - L_{y'} y'' = y'\Bigl(\frac{d}{dx}L_{y'} - L_y\Bigr) = 0$$

by the Euler–Lagrange equation. This is the first integral that the Hamiltonian blocks will meet again as conserved energy. Here

$$y'\frac{\partial L}{\partial y'} - L = \frac{y'^2}{\sqrt{1 + y'^2}\sqrt{2gy}} - \frac{\sqrt{1 + y'^2}}{\sqrt{2gy}} = -\frac{1}{\sqrt{1 + y'^2}\sqrt{2gy}}$$

so $$y\,(1 + y'^2) = 2R$$ for a constant $$R$$.

**Solving.** Substitute $$y = R(1 - \cos\theta)$$. Then $$y' = \sqrt{2R/y - 1} = \cot(\theta/2)$$, and

$$dx = \frac{dy}{y'} = R\sin\theta \tan(\theta/2)\, d\theta = R(1 - \cos\theta)\, d\theta$$

so $$x = R(\theta - \sin\theta)$$. The curve is a **cycloid**, traced by a point on a rolling circle of radius $$R$$. $$R$$ and the end parameter $$\theta_B$$ are fixed by passing through $$B$$. The travel time is $$T = \theta_B\sqrt{R/g}$$.

**The figure** races three beads from $$A$$ to $$B$$: the straight line (shortest, but slow to gain speed), a curve that dives steeply (fast at first, then too long), and the cycloid, which wins. The cycloid starts vertically to gain speed at once. When $$B$$ is far enough to the side ($$b/h > \pi/2$$), it even dips below $$B$$ and climbs back. Drag $$B$$ to try.

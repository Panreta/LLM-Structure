---
title: Shortest path is a line
order: 3
tex: 'J(y) = \int_a^b \sqrt{1 + y''^2}\, dx \;\Longrightarrow\; \frac{d}{dx}\frac{y''}{\sqrt{1 + y''^2}} = 0 \;\Longrightarrow\; y = c_1 x + c_2'
---
The first example: among all curves $$y(x)$$ from $$A = (a, y_a)$$ to $$B = (b, y_b)$$, which is shortest? The length is $$J(y) = \int_a^b \sqrt{1 + y'^2}\, dx$$, so

$$L(x, y, y') = \sqrt{1 + y'^2}, \qquad \frac{\partial L}{\partial y} = 0, \qquad \frac{\partial L}{\partial y'} = \frac{y'}{\sqrt{1 + y'^2}}$$

**Euler–Lagrange.** $$0 - \frac{d}{dx}\frac{y'}{\sqrt{1 + y'^2}} = 0$$, so $$\frac{y'}{\sqrt{1 + y'^2}} = C$$ is constant. The map $$s \mapsto s/\sqrt{1 + s^2}$$ is strictly increasing, so $$y' = c_1$$ is constant and $$y = c_1 x + c_2$$, **a straight line**. The two boundary values fix $$c_1, c_2$$: it is the segment $$AB$$.

**It really is the minimum.** $$L$$ is strictly convex in $$y'$$ ($$\partial^2 L / \partial y'^2 = (1 + y'^2)^{-3/2} > 0$$), and for a convex Lagrangian a solution of the Euler–Lagrange equation is a global minimizer. Directly: for any $$\eta$$ vanishing at the ends, $$J(y + \eta) - J(y) \ge DJ(y)[\eta] = 0$$ by convexity, with equality only for $$\eta = 0$$.

Geometrically, $$\frac{y'}{\sqrt{1 + y'^2}} = \sin\phi$$, where $$\phi$$ is the angle of the tangent with the vertical. The Euler–Lagrange equation says that angle never changes.

**The figure** lets you drag the control point of a smooth curve from $$A$$ to $$B$$. The readout compares its length with $$\sqrt2$$; the excess is zero only when the control point lies on the line.

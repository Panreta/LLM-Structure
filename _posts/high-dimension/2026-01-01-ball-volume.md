---
title: Volume of the ball
order: 2
tex: 'V_n = \frac{\pi^{n/2}}{\left(\frac n2\right)!}, \qquad V_n = \frac{2\pi}{n}\,V_{n-2}'
---
Write $$V_n$$ for the volume of the unit ball $$B^n$$; a ball of radius $$r$$ has volume $$V_n r^n$$.

**Recurrence by fibers.** Split a point of $$B^n$$ into its first two coordinates $$(x_1, x_2)$$, at distance $$\rho$$ from the origin, and the remaining $$n - 2$$. Over each point of the unit disk, the fiber is an $$(n-2)$$-ball of radius $$\sqrt{1 - \rho^2}$$, so

$$\begin{aligned} V_n &= \int_0^1 V_{n-2}\,(1 - \rho^2)^{\frac{n-2}{2}}\; 2\pi\rho\, d\rho \\ &= \frac{2\pi}{n}\, V_{n-2} \end{aligned}$$

The brown arc in the figure is this factor.

**Starting values.** $$V_0 = 1$$: the "ball" in $$\mathbb{R}^0$$ is a single point, and choosing zero numbers whose squares sum to at most 1 always succeeds. $$V_1 = 2$$, the segment $$[-1, 1]$$. The even dimensions then give

$$V_n = \frac{\pi^{n/2}}{(n/2)!}$$

and the odd ones fit the same formula exactly when $$\left(\tfrac12\right)! = \tfrac{\sqrt\pi}{2}$$, which is $$\Gamma\!\left(\tfrac32\right)$$.

**The surprise.** The volume peaks at $$n = 5$$, where $$V_5 \approx 5.26$$, and then falls to 0, because $$(n/2)!$$ outgrows $$\pi^{n/2}$$. The unit ball becomes a vanishing sliver of the cube $$[-1, 1]^n$$, whose volume $$2^n$$ grows.

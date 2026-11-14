---
title: Black–Scholes formula
order: 8
tex: 'C(t, S) = S\,\Phi(d_1) - K e^{-r\tau}\,\Phi(d_2), \qquad d_{1,2} = \frac{\ln(S/K) + (r \pm \tfrac12\sigma^2)\tau}{\sigma\sqrt{\tau}}, \quad \tau = T - t'
---
**Reduction to the heat equation.** Set

$$S = K e^x, \qquad \tau' = \tfrac12\sigma^2 (T - t), \qquad k = \frac{2r}{\sigma^2}$$

and

$$V(t, S) = K \exp\!\Bigl(-\tfrac12(k - 1)x - \tfrac14(k + 1)^2\tau'\Bigr)\, u(x, \tau')$$

A direct computation turns the Black–Scholes PDE into

$$u_{\tau'} = u_{xx}, \qquad u(x, 0) = \bigl(e^{(k+1)x/2} - e^{(k-1)x/2}\bigr)^+$$

The time reversal makes it an initial-value problem, and the exponential factor removes the first-order and zero-order terms. The solution is the convolution with the heat kernel,

$$u(x, \tau') = \frac{1}{\sqrt{4\pi\tau'}} \int_{-\infty}^{\infty} u(y, 0)\, e^{-(x - y)^2/4\tau'}\, dy$$

Evaluating the two Gaussian integrals and undoing the substitution gives the formula above, with $$\Phi$$ the standard normal CDF.

**Sensitivities ("Greeks").**

- Delta: $$\partial_S C = \Phi(d_1)$$, the hedge ratio from the previous block.
- Gamma: $$\partial_{SS} C = \dfrac{\varphi(d_1)}{S\sigma\sqrt\tau} > 0$$, so $$C$$ is convex in $$S$$.
- Vega: $$\partial_\sigma C = S\varphi(d_1)\sqrt\tau > 0$$, so more volatility means a dearer option.

**Checks.** $$(S - Ke^{-r\tau})^+ \le C \le S$$. As $$\tau \to 0$$, $$C \to (S - K)^+$$. The put follows from **put–call parity** $$C - P = S - Ke^{-r\tau}$$, which holds by a static no-arbitrage argument.

**The figure** plots $$C$$ against $$S$$ for three maturities. Longer maturity or larger $$\sigma$$ lifts the curve above the payoff kink; the readout gives the at-the-money price, delta and gamma.

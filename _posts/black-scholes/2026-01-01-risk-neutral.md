---
title: Risk-neutral pricing
order: 9
tex: 'V(t, S) = e^{-r(T - t)}\, \mathbb{E}^{\mathbb{Q}}\bigl[(S_T - K)^+ \mid S_t = S\bigr], \qquad dS = rS\, dt + \sigma S\, dW^{\mathbb{Q}}'
---
**Feynman–Kac.** Under growth conditions on the payoff, the solution of the Black–Scholes PDE with terminal value $$g(S)$$ is

$$V(t, S) = e^{-r(T - t)}\, \mathbb{E}\bigl[g(\tilde S_T) \mid \tilde S_t = S\bigr]$$

where $$\tilde S$$ solves $$d\tilde S = r\tilde S\, dt + \sigma \tilde S\, d\tilde W$$. To check it, apply Itô's lemma to $$e^{-rs}V(s, \tilde S_s)$$. The PDE kills the $$ds$$ term, so the process is a martingale, and its expectation at $$s = T$$ equals its value at $$s = t$$.

**Change of measure.** $$\tilde S$$ is the real stock seen under a different probability measure. Let $$\theta = (\mu - r)/\sigma$$ be the market price of risk, and define $$\mathbb{Q}$$ by

$$\frac{d\mathbb{Q}}{dP} = \exp\!\Bigl(-\theta W_T - \tfrac12\theta^2 T\Bigr)$$

By **Girsanov's theorem**, $$W^{\mathbb{Q}}_t = W_t + \theta t$$ is a Brownian motion under $$\mathbb{Q}$$. In terms of it, $$dS = rS\, dt + \sigma S\, dW^{\mathbb{Q}}$$. Under $$\mathbb{Q}$$ the discounted price $$e^{-rt}S_t$$ is a martingale: every asset earns the riskless rate on average, hence "risk-neutral". The fundamental theorem of asset pricing says that the absence of arbitrage is essentially equivalent to the existence of such an equivalent martingale measure.

**Closing the loop.** Under $$\mathbb{Q}$$, $$\ln S_T \sim \mathcal{N}\bigl(\ln S_0 + (r - \tfrac12\sigma^2)T, \sigma^2 T\bigr)$$. Computing $$e^{-rT}\mathbb{E}^{\mathbb{Q}}(S_T - K)^+$$ with this lognormal law gives the Black–Scholes formula again, $$S_0\Phi(d_1) - Ke^{-rT}\Phi(d_2)$$.

**The figure** prices by simulation: $$N$$ draws of $$S_T$$ under $$\mathbb{Q}$$ (histogram, with the exact lognormal density in blue), averaging the discounted payoff. The 95% interval is $$\pm 1.96$$ standard errors, shrinking like $$1/\sqrt N$$, and contains the formula's value. Monte Carlo is how options are priced when no formula exists: path-dependent payoffs, several assets, stochastic volatility.

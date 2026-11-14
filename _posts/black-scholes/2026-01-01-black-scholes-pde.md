---
title: Black–Scholes equation
order: 7
tex: '\partial_t V + \tfrac12 \sigma^2 S^2\, \partial_{SS} V + r S\, \partial_S V - r V = 0, \qquad V(T, S) = (S - K)^+'
---
**Assumptions.**

1. The stock follows geometric Brownian motion with constants $$\mu$$ and $$\sigma > 0$$, and pays no dividends.
2. A bank account grows at a constant rate $$r$$: $$dB_t = rB_t\, dt$$.
3. The market is frictionless: trading is continuous, shares are divisible, short selling is allowed, and there are no transaction costs or taxes.
4. There is no arbitrage: no self-financing strategy turns zero initial wealth into a nonnegative final wealth that is positive with positive probability.

A **European call** pays $$(S_T - K)^+$$ at time $$T$$. Suppose its price is $$V(t, S_t)$$ for some $$V \in C^{1,2}$$.

**Self-financing portfolio.** Hold $$\Delta_t$$ shares and keep the rest of the wealth $$X_t$$ in the bank. No money is added or withdrawn, so

$$dX_t = \Delta_t\, dS_t + r\,(X_t - \Delta_t S_t)\, dt$$

**Matching.** By Itô's lemma,

$$dV = \bigl(V_t + \mu S V_S + \tfrac12\sigma^2 S^2 V_{SS}\bigr)dt + \sigma S V_S\, dW$$

while $$dX = \bigl(r X + (\mu - r)\Delta S\bigr)dt + \sigma \Delta S\, dW$$. For $$X_t = V(t, S_t)$$ at all times, the $$dW$$ terms must agree, which forces

$$\Delta_t = \partial_S V(t, S_t)$$

the **delta hedge**. Then the $$dt$$ terms must agree. Substituting $$\Delta = V_S$$ and $$X = V$$, the $$\mu S V_S$$ terms cancel on both sides and leave the PDE above, for $$t < T$$, $$S > 0$$.

**Why the price must be $$V$$.** The portfolio starting from $$X_0 = V(0, S_0)$$ ends at exactly the payoff. If the option traded above $$V(0, S_0)$$, you could sell it, run the portfolio, and keep the difference at no risk; if below, do the reverse. Either is an arbitrage.

**The drift $$\mu$$ disappeared.** Investors who disagree about the stock's expected return still agree on the option's price, because the risk is hedged away rather than priced.

**The figure** runs the hedge in discrete time along one path with real drift $$\mu = 8\%$$. Rebalancing only $$n$$ times leaves a hedging error. The readout measures its root-mean-square size over 200 paths: 2.33, 1.27, 0.64 and 0.32 for 8, 32, 128 and 512 trades, falling like $$n^{-1/2}$$.

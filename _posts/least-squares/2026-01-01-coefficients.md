---
title: Fitted line
order: 2
tex: '\hat y = \hat\beta_0 + \hat\beta_1 x'
---
The blue line. Its slope and intercept are

$$\hat\beta_1 = \frac{\sum_i (x_i - \bar x)(y_i - \bar y)}{\sum_i (x_i - \bar x)^2}, \qquad \hat\beta_0 = \bar y - \hat\beta_1 \bar x$$

so it always passes through the mean point $$(\bar x, \bar y)$$. Example: $$\hat\beta_1 = \tfrac{8}{10} = 0.8$$ and $$\hat\beta_0 = 2.6 - 1.6 = 1$$.

Probabilistic view: if $$y_i = \beta_0 + \beta_1 x_i + \varepsilon_i$$ with Gaussian noise, the least-squares line is also the maximum-likelihood fit.

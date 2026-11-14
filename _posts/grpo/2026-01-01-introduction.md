---
title: Introduction
order: 1
tex: '\begin{aligned} \mathcal{J}_{\text{GRPO}}(\theta) = \mathbb{E} & \frac1G \sum_{i=1}^G \frac{1}{\lvert o_i \rvert} \sum_{t=1}^{\lvert o_i \rvert} \Bigl\{ \min\bigl[ \rho_{i,t} \hat A_{i,t},\ \\ & \text{clip}(\rho_{i,t}, 1-\epsilon, 1+\epsilon)\, \hat A_{i,t} \bigr] \\ & - \beta\, \mathbb{D}_{\text{KL}}[\pi_\theta \,\Vert\, \pi_{\text{ref}}] \Bigr\} \end{aligned}'
---
DeepSeek-R1 learned to reason with reinforcement learning, using an objective called **GRPO** (Group Relative Policy Optimization). The expectation is over questions $$q \sim P(Q)$$ and, for each, a group of $$G$$ answers $$\{o_i\}_{i=1}^G \sim \pi_{\theta_{\text{old}}}(O \mid q)$$ sampled from the old policy. The ratio

$$\rho_{i,t} = \frac{\pi_\theta(o_{i,t} \mid q, o_{i,<t})}{\pi_{\theta_{\text{old}}}(o_{i,t} \mid q, o_{i,<t})}$$

is how much more (or less) likely the new policy makes token $$t$$ of answer $$i$$.

**The figure** shows where the advantages $$\hat A_{i,t}$$ come from. Each answer gets a reward $$r_i$$, for example 1 if its final answer is correct and 0 if not (the dots). GRPO compares every answer only with its own group:

$$\hat A_{i,t} = \frac{r_i - \operatorname{mean}(r_1, \dots, r_G)}{\operatorname{std}(r_1, \dots, r_G)}$$

for every token $$t$$ of answer $$i$$. Better-than-average answers are pushed up, worse ones down. When the whole group is right, or the whole group is wrong, every advantage is 0 and the question teaches nothing. Try a success rate of 0% or 100%.

The formula looks terrifying. The chapters build it piece by piece: the reinforcement-learning objective, why it needs a trust region, how TRPO solves it, how PPO simplifies TRPO, and finally what GRPO changes in PPO.

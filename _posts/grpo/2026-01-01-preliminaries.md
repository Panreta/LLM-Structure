---
title: Preliminaries
order: 2
tex: 'G_t = \sum_{k=0}^{\infty} \gamma^k R_{t+k}, \qquad V^\pi(s) = \mathbb{E}_\pi[G_t \mid S_t = s]'
---
A **Markov reward process** $$\langle \mathcal{S}, \mathcal{P}, r, \gamma \rangle$$ becomes a **Markov decision process** $$\langle \mathcal{S}, \mathcal{A}, \mathcal{P}, r, \gamma \rangle$$ once an agent chooses actions.

- $$r(s) = \mathbb{E}[R_t \mid S_t = s]$$ is the expected reward for being in state $$s$$.
- A policy $$\pi(a \mid s) = P(A_t = a \mid S_t = s)$$ is **deterministic** if it picks one action in each state and **stochastic** if it gives a distribution over actions.

The **return** is the discounted sum of rewards from time $$t$$ on, $$G_t = \sum_k \gamma^k R_{t+k}$$, with $$\gamma \in (0, 1]$$; an infinite horizon needs $$\gamma < 1$$ for the sum to converge. The **state-value function** $$V^\pi(s) = \mathbb{E}_\pi[G_t \mid S_t = s]$$ is the expected return when starting from $$s$$ and following $$\pi$$.

Under a stationary policy, state–action pairs form a Markov chain with transition matrix

$$P^\pi_{(s,a),(s',a')} = P(s' \mid s, a)\, \pi(a' \mid s')$$

**The running example** in the figure is used for the rest of the story. There are two states. Staying in B earns 1, and moving from A to B costs 0.1. One parameter controls the policy in both states, $$\pi(\text{move} \mid s) = p = \sigma(\theta)$$. That makes a trade-off: moving is good in A and bad in B. The circles show $$V^\pi$$, which you can compute exactly here by solving $$V = r^\pi + \gamma P^\pi V$$.

**Remark 1.** Always ask which symbol is a number and which is a random variable. $$G_t$$, $$S_t$$ and $$R_t$$ are random variables. $$V^\pi(s)$$, $$r(s)$$ and $$\pi(a \mid s)$$ are numbers.

---
title: Tokenization
kind: layer
order: 6
---

Turns the configuration $$\mathbf{s}$$ into a sequence of $$L$$ discrete tokens the transformer can read.

A common choice (check the paper for the exact scheme): one token per site carrying its local state $$(n_{i\uparrow}, n_{i\downarrow})$$, which has 4 possible values, plus tokens for the extra spin variables $$S_1^z, S_2^z$$.

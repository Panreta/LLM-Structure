---
title: Optimal coding
order: 6
tex: '\sum_i p_i \log p_i \ \ge\ \sum_i p_i \log q_i \quad \Longleftrightarrow \quad H(p) \le \mathrm{CE}(p, q)'
---
Nonnegativity of KL, written out, is **Gibbs' inequality** above. It says Shannon entropy is the best possible average code length.

**Codes and probabilities.** A prefix-free binary code gives symbol $$i$$ a codeword of $$\ell_i$$ bits, and by Kraft's inequality the lengths must satisfy $$\sum_i 2^{-\ell_i} \le 1$$. So every code corresponds to a distribution $$q_i = 2^{-\ell_i}$$, and conversely a guess $$q$$ suggests lengths $$\ell_i \approx -\log_2 q_i$$: frequent symbols get short codewords.

**The cost of a wrong guess.** If symbols really occur with probabilities $$p$$, the expected length is

$$\sum_i p_i \ell_i = -\sum_i p_i \log_2 q_i = \mathrm{CE}(p, q) = H(p) + \mathrm{KL}(p \,\Vert\, q) \ \ge\ H(p)$$

No code beats $$H(p)$$ bits per symbol on average. This is Shannon's source coding theorem. The best code is built for the true distribution, $$q = p$$, and every bit of KL divergence is a bit wasted per symbol.

**The figure** has a four-symbol source with $$p = (\tfrac12, \tfrac14, \tfrac18, \tfrac18)$$ (blue), so $$H(p) = 1.75$$ bits. The brown bars are the distribution the code was built for, from a badly mismatched $$r$$ to the true $$p$$. Above each brown bar is its codeword length. At $$q = p$$ the lengths are 1, 2, 3 and 3 bits, which is exactly the Huffman code A = 0, B = 10, C = 110, D = 111, and the waste is zero.

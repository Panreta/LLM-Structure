---
title: Wavefunction
kind: plain
order: 1
tex: '\Psi_\theta(\mathbf{s}) = \det\left[\mathbf{n}\star\Phi(\mathbf{s})\right]'
---

The output: one number, the amplitude of configuration $$\mathbf{s}$$. $$\theta$$ stands for every trainable parameter (embedding, transformer layers, output projection).

Why a determinant: swapping two electrons swaps two rows of the matrix, and for a single row swap $$P$$,

$$\det(PA) = -\det A$$

So $$\Psi_\theta$$ automatically changes sign under exchange, which fermions require. If two occupied rows were identical, $$\det = 0$$: the Pauli principle comes for free.

Training (typical for neural quantum states): variational Monte Carlo, minimizing

$$E(\theta) = \frac{\langle\Psi_\theta|H|\Psi_\theta\rangle}{\langle\Psi_\theta|\Psi_\theta\rangle}$$

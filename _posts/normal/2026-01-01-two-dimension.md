---
title: Two dimensions
order: 2
tex: 'p(\mathbf{x}) = \frac{1}{2\pi\sqrt{\det\Sigma}} \exp\!\left(-\tfrac12 (\mathbf{x} - \boldsymbol{\mu})^\top \Sigma^{-1} (\mathbf{x} - \boldsymbol{\mu})\right)'
---
Take two independent standard normals $$Z_1, Z_2$$. Their joint density is the product

$$\varphi(z_1)\,\varphi(z_2) = \frac{1}{2\pi} e^{-(z_1^2 + z_2^2)/2}$$

which depends only on the distance $$\lVert \mathbf{z} \rVert$$ from the origin. The standard 2-D normal is **rotationally symmetric**, and its level sets are circles.

A general 2-D normal is a linear image of it, $$\mathbf{X} = \boldsymbol{\mu} + L\mathbf{Z}$$, with **covariance matrix** $$\Sigma = LL^\top$$:

$$\Sigma = \begin{pmatrix} \sigma_1^2 & \rho\sigma_1\sigma_2 \\ \rho\sigma_1\sigma_2 & \sigma_2^2 \end{pmatrix}$$

where $$\rho$$ is the correlation. The circles become **ellipses**, the level sets of the Mahalanobis distance $$(\mathbf{x} - \boldsymbol{\mu})^\top \Sigma^{-1} (\mathbf{x} - \boldsymbol{\mu}) = c$$. Their axes point along the eigenvectors of $$\Sigma$$, with half-lengths $$\sqrt{\lambda_i}$$ per unit of $$c$$: the brown arrows.

**The figure** shows 1200 samples (gray) and the ellipses at Mahalanobis radius 1, 2 and 3. In 2-D they contain 39.3%, 86.5% and 98.9% of the probability, from $$P(r \le c) = 1 - e^{-c^2/2}$$, less than the 1-D 68–95–99.7. With one more dimension there is more room outside, a trend the next blocks follow. Change $$\rho$$ to tilt the cloud. At $$\rho = \pm 0.9$$ it collapses toward a line.

---
title: Squared error
order: 4
tex: '\sum_i r_i^2 = \lVert \mathbf{y} - X\beta \rVert^2'
---
The brown squares, one per residual, with area $$r_i^2$$. Least squares picks the line with the smallest total area. In the example the total is $$0.8$$, and every other line does worse.

Squaring punishes big misses heavily. Drag one point far away and watch the line swing toward it: least squares is sensitive to outliers.

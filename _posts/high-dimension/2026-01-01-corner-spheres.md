---
title: Spheres in a box
order: 4
tex: 'r_n = \sqrt{n} - 1'
---
The probability blocks showed that high-dimensional vectors behave strangely. Now the geometry behind it, starting with a puzzle from [3Blue1Brown's talk on spheres](https://www.3blue1brown.com/?v=spheres-talk). Put $$2^n$$ unit spheres at the corners $$(\pm 1, \dots, \pm 1)$$ of the box $$[-2, 2]^n$$, so each one touches its neighbours and the box. Then fit one more sphere in the middle, touching all of them.

The corner centers are at distance $$\sqrt{1 + \dots + 1} = \sqrt{n}$$ from the origin, so the inner sphere has radius $$\sqrt{n} - 1$$.

- $$n = 2$$: radius $$0.41$$, small, as the picture suggests.
- $$n = 4$$: radius $$1$$, as big as the corner spheres.
- $$n = 9$$: radius $$2$$, touching the faces of the box.
- $$n \ge 10$$: the inner sphere pokes out of the box that surrounds every sphere in the picture.

The figure keeps the 2-D drawing and draws the inner sphere at its true $$n$$-dimensional radius. Nothing is wrong with the arithmetic. The box's corners run off to distance $$2\sqrt{n}$$ while its faces stay at distance 2, and our 3-D intuition has no picture for that. The last two blocks measure it: how big the ball is, and where its volume sits.

# LLM-Structure
The visualization of large language model structure based on intuitive mathematical understanding.

## Adding a new diagram

The site is built by GitHub Pages (Jekyll), so adding a diagram means adding files. No build step is needed.

1. **Add an entry to `_data/diagrams.yml`.** List order is the order on the home page:

   ```yaml
   - id: group-theory
     title: Group theory
     labels: [Algebra]
     description: "Sets with an associative operation, an identity and inverses."
   ```

   `id` is the URL (`…/LLM-Structure/#group-theory`) and the folder name. `labels` become the filter chips on the home page.

2. **Add a folder `_posts/<id>/` with one Markdown file per block.** File names need Jekyll's date prefix (`2026-01-01-<slug>.md`). The slug is the block's id, used in links like `#group-theory/group` and in a rail's `from`/`to`. Slugs only need to be unique within a diagram. For example, `_posts/group-theory/2026-01-01-group.md`:

   ```markdown
   ---
   title: Group
   kind: core
   order: 1
   tex: '(G,\cdot)'
   ---

   A set $$G$$ with an associative operation, an identity $$e$$ and inverses:

   $$g\cdot g^{-1} = e$$
   ```

   Front matter:
   - `title`: the block's label.
   - `kind`: `plain`, `tensor`, `core`, `layer` (the default) or `rail`.
   - `order`: position from the top, starting at 1.
   - `tex`: optional formula shown on the block. Keep it in single quotes.
   - `from`/`to`: for `kind: rail` only. These are the slugs of the blocks the left-hand skip connection joins.
   - `diagram`: optional. It puts the block in a different diagram than its folder.

   The notes below the front matter are shown in the details panel. Use `$$...$$` for math.

### Flow diagrams and figures

By default a diagram is drawn as a flow of blocks, like the transformer. A diagram can instead be drawn as a classical, interactive figure (a graph, a plane, a contour plot) by adding `figure: <name>` to its `diagrams.yml` entry. `<name>` is one of the figures in `assets/figures.js`: `riemann-integral`, `diagonalization`, `bayes-rule`, `gradient-descent` or `least-squares`.

The block files then describe the parts of the figure. Each figure tags parts of its drawing with block slugs: tapping a part opens that block's notes, and a row of chips under the figure lists every block. `kind`, `from` and `to` are ignored for figures. A figure spec with `story: true` (like `gradient-descent`) reads its blocks as numbered blocks instead: the chips become a table of contents, the details panel gets previous/next buttons, and opening a block redraws the figure for it. To draw a new kind of figure, add an entry to `specs` in `assets/figures.js`.

A folder with no `diagrams.yml` entry still appears on the home page, titled from the folder name. A `diagrams.yml` entry with no folder appears as an empty diagram.

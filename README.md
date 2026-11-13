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

A folder with no `diagrams.yml` entry still appears on the home page, titled from the folder name. A `diagrams.yml` entry with no folder appears as an empty diagram.

# HaskIt Đ (Preview) - Haskell Software, Fast Iterations

> Quality from Haskell, Speed-to-Market from Đ (Edh)

## Features

### Đ Terminal Sessions

The **Edh: New Đ Terminal** command is used to start a new terminal session
running specific **Đ** interpreter by `epm x`.

You can run an executable of pre-built interpreter, or run an ad-hoc built
interpreter by using `stack run [xxx]` or `cabal run xxx` as the command
line.

- You need to [install](https://github.com/e-wrks/epm#installation) and use
  [EPM](https://github.com/e-wrks/epm) to manage Đ packages, the package(s)
  you develop with vscode + this extension should reside within an **EPM**
  home.

- Hierarchical **EPM** homes and multi-root workspaces should just work.

### Code Lens for Interactive Đ Sessions

In any of your `.edh` files, define **IPython** like code cells by inserting
delimiter lines (i.e. starting with `# %%`), then code lens will appear to run
`Above|Below|Cell` acccordingly by a single click.

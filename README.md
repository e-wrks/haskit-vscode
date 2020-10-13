# HaskIt Đ (Preview) - Haskell Software, Fast Iterations

> Get Quality from
> [Haskell](https://haskell.org),
> Get Bullshit Done Quickly with
> [Đ (Edh)](https://github.com/e-wrks/edh)

- [Features](#features)
  - [Interactive Execution of Đ cells / blocks / files](#interactive-execution-of-đ-cells--blocks--files)
  - [Đ Terminal Sessions](#đ-terminal-sessions)
- [Requirements](#requirements)
  - [Note](#note)

## Features

### Interactive Execution of Đ cells / blocks / files

In any of your `.edh` files, define **IPython** style code cells (i.e.
delimited by \``# %%`\` lines), then code lens will appear to run
`Cell|Above|Below` acccordingly with a single click.

\``# %{`\` and \``# %}`\` can be used to group multiple cells into a block,
run as a whole.

The whole file can also be run by clicking `All` code lens at the top.

### Đ Terminal Sessions

You'll be prompted to start a new Đ terminal session if no one open atm
you click a code lens. Each workspace root can contain a `haskit.json`
to specify plenty different command lines for various Đ sessions, e.g.:

```json
{
  "edh.terminal.cmdl": ["stack run hski", "cabal run haskit:hski"]
}
```

All candidates will be listed as options, even for a multi-root workspace.

Also the **Edh: New Đ Terminal** command can be used to start as many Đ
terminal sessions as you wish.

You can run an executable of pre-built Đ interpreter in production-like
scenarios, or for development-like scenarios, you'd use command lines like
`stack run xxx` or `cabal run xxx` to run an ad-hoc built Đ interpreter
after changed some source code.

## Requirements

You need to [install](https://github.com/e-wrks/epm#installation) and use
[EPM](https://github.com/e-wrks/epm) to manage Đ packages.

### Note

- Packages under development need to reside within an **EPM** home too.

- Hierarchical **EPM** homes and multi-root workspaces are the norm.

# Shareable build

This directory builds the **public copy** of this repository — the version that
can be forked by people outside the company, in the spirit of a framework repo
rather than a company repo.

The private repository carries real products, CEO briefs, live audit trails,
customer names and a founder's laptop path. None of that can be published. The
public copy carries the operating system only: agents, protocols, quality gates,
scripts, the constitution, shared packages, and one demo product.

```
tools/shareable/
  make-shareable.sh     the generator
  config/
    copy-manifest.txt   allow-list of paths copied from the private repo
    exclude.txt         patterns removed from those paths
    scrub.sed           text substitutions (real names → fictional ones)
    banned-terms.txt    verification: if any of these survive, the build fails
  overlay/              files unique to the public repo, copied over the top
shareable/              ← generated output, committed, ready to push
```

## Build it

```bash
tools/shareable/make-shareable.sh              # rebuild ./shareable
tools/shareable/make-shareable.sh --dry-run    # list what would be copied
tools/shareable/make-shareable.sh --verify     # re-check an existing build
tools/shareable/make-shareable.sh --out /tmp/x # build somewhere else
```

The pipeline is: **copy → scrub → overlay → verify**. Verification fails the
build if any banned term survives, if a product other than `taskflow` appears,
or if anything matching a credential shape is present. A failed verification
means the config needs fixing — never publish past it.

## The two rules

1. **`copy-manifest.txt` is an allow-list.** Nothing reaches the public copy
   unless a path in that file names it. A new private directory therefore cannot
   leak by being forgotten — it can only leak by being added deliberately.
2. **`overlay/` is the source of truth for anything public-only.** The README,
   LICENSE, the reset registries and memory seeds, the demo product and
   `tools/rename-company.sh` live there, not in `shareable/`. Editing
   `shareable/` directly loses the change on the next build.

## When the private repo changes

Agents, protocols, gates and packages are copied live from the private repo, so
they refresh on every build:

```bash
tools/shareable/make-shareable.sh
git add shareable tools/shareable
git commit -m "chore(shareable): refresh public copy"
```

If a new private product appears, nothing needs doing — the allow-list ignores
`products/` entirely. If a **new framework directory** appears under `.claude/`,
add it to `copy-manifest.txt` deliberately, and check what it contains first.

## Publishing

`shareable/` is a complete repository tree. Create an empty repository on GitHub
— no README, no .gitignore, no licence, since this tree brings its own — then:

```bash
tools/shareable/publish.sh git@github.com:<you>/<repo>.git
```

`publish.sh` rebuilds, verifies, initialises `shareable/` as its own git
repository on first run, commits and pushes. Run it again after any change to
the private repo to refresh the public one; it commits only what actually
differs.

Doing it by hand is four commands (`git init -b main`, `add`, `commit`,
`remote add` + `push`) — but run `make-shareable.sh --verify` first either way.
The public repo has no second line of defence.

## Name mapping

Real products map to a fictional portfolio so that examples contrasting two
products still read correctly. `taskflow` is the only one that ships as code;
the others (`riskdesk`, `contentiq`, `postpilot`, `acme-portal`, …) appear in
examples only, which the public README explains. The full map is
`config/scrub.sed`.

## Adding a new banned term

When something private acquires a name worth protecting, add it to
`banned-terms.txt` (case-insensitive by default; prefix with `cs:` for a
case-sensitive match) and add its replacement to `scrub.sed`. Then rebuild — the
verifier will tell you every file that still mentions it.

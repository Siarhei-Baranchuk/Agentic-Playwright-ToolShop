#!/usr/bin/env bash
# check-skill-references-drift.sh
#
# Lints structural drift between each skill / instruction file and its
# `references/` siblings. Catches three failure modes:
#   1. Broken pointer  -- file links to references/foo.md but the file is missing.
#   2. Orphan reference -- references/foo.md exists but no link references it.
#   3. Broken anchor   -- "references/foo.md#bar" with no matching "## bar" heading.
#
# Walks the Claude Code rule tree:
#
#   .claude/skills/<name>/SKILL.md                 -- folder form
#
# Semantic drift (a rule contradicted by an example) needs an LLM and is out
# of scope for this lint.
#
# Exits non-zero on any drift so CI can gate.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Slugify a heading for GFM anchor matching: lowercase, drop most punctuation,
# keep alphanumeric + hyphens, collapse spaces to hyphens.
slugify() {
    printf '%s' "$1" \
        | tr '[:upper:]' '[:lower:]' \
        | sed -E 's/[^a-z0-9 _-]//g; s/[ _]+/-/g; s/^-+//; s/-+$//'
}

# Collect every "## heading" in a markdown file as slugs (one per line).
collect_anchors() {
    local file="$1"
    awk '/^## +/ { sub(/^## +/, ""); print }' "${file}" | while IFS= read -r heading; do
        slugify "${heading}"
    done
}

# Extract every references/<path>(#anchor)? token from a file. We deliberately
# look only for the bare `references/...md` shape -- cross-tree pointers like
# `../skills/.../references/foo.md` are intentionally excluded (each tree is
# self-contained per the v2.1 policy, so any link that can't be resolved
# locally should not look like a sibling-references link).
extract_reference_links() {
    local file="$1"
    grep -oE '(^|[^/])references/[A-Za-z0-9._/-]+(#[A-Za-z0-9._-]+)?' "${file}" \
        | sed -E 's/^[^r]//' || true
}

errors=0
checked_skills=0
checked_links=0

# Run the three drift checks for one skill. Args:
#   $1 = path to the SKILL.md / .instructions.md file
#   $2 = directory whose `references/` sibling holds the linked .md files
#   $3 = display name (e.g. ".claude :: api-testing")
check_skill_file() {
    local skill_md="$1"
    local skill_dir="$2"
    local display="$3"
    local refs_dir="${skill_dir}/references"

    checked_skills=$((checked_skills + 1))

    local mentioned_paths=""

    while IFS= read -r link; do
        [[ -z "${link}" ]] && continue
        checked_links=$((checked_links + 1))

        local path="${link%%#*}"
        local anchor=""
        if [[ "${link}" == *"#"* ]]; then
            anchor="${link#*#}"
        fi

        local target="${skill_dir}/${path}"

        if [[ ! -f "${target}" ]]; then
            echo "DRIFT ${display} :: broken pointer -- file links to ${path} but file is missing"
            errors=$((errors + 1))
            continue
        fi

        mentioned_paths="${mentioned_paths}
${path}"

        if [[ -n "${anchor}" ]]; then
            local target_anchors
            target_anchors="$(collect_anchors "${target}")"
            if ! printf '%s\n' "${target_anchors}" | grep -F -x -q -- "${anchor}"; then
                echo "DRIFT ${display} :: broken anchor -- ${path}#${anchor} (no matching ## heading)"
                errors=$((errors + 1))
            fi
        fi
    done < <(extract_reference_links "${skill_md}")

    # Orphan check: every references/*.md file should be linked from the SKILL.md.
    # README.md inside references/ is exempt -- directory-level index.
    [[ -d "${refs_dir}" ]] || return 0

    while IFS= read -r ref_file; do
        local nested_rel="${ref_file#${skill_dir}/}"
        local base
        base="$(basename "${ref_file}")"
        if [[ "${base}" == "README.md" ]]; then
            continue
        fi
        if ! printf '%s' "${mentioned_paths}" | grep -F -x -q -- "${nested_rel}"; then
            echo "DRIFT ${display} :: orphan reference -- ${nested_rel} exists but file does not link to it"
            errors=$((errors + 1))
        fi
    done < <(find "${refs_dir}" -type f -name '*.md')
}

# --- Folder-form skills: <root>/<name>/SKILL.md ---
for root in "${REPO_ROOT}/.claude/skills"; do
    [[ -d "$root" ]] || continue
    tree_label="$(echo "$root" | sed -E "s|${REPO_ROOT}/||")"
    while IFS= read -r skill_md; do
        skill_dir="$(dirname "${skill_md}")"
        skill_name="$(basename "${skill_dir}")"
        check_skill_file "${skill_md}" "${skill_dir}" "${tree_label} :: ${skill_name}"
    done < <(find "$root" -mindepth 2 -maxdepth 2 -name SKILL.md -type f 2>/dev/null)
done

echo
echo "Checked ${checked_skills} skill(s) and ${checked_links} reference link(s); ${errors} drift(s)."
[[ "${errors}" -eq 0 ]] || exit 1

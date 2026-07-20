import { Octokit } from "@octokit/rest";
import { isReadableSiteText, MAX_CONTEXT_BYTES } from "./safety.js";

function splitRepository(repository) {
  const [owner, repo, extra] = repository.split("/");
  if (!owner || !repo || extra) throw new Error("GITHUB_REPOSITORY must use owner/repo format");
  return { owner, repo };
}

export class GitHubSite {
  constructor({ token, repository, defaultBranch }) {
    this.octokit = new Octokit({ auth: token });
    this.repo = splitRepository(repository);
    this.defaultBranch = defaultBranch;
  }

  async readSite() {
    const ref = await this.octokit.rest.git.getRef({ ...this.repo, ref: `heads/${this.defaultBranch}` });
    const baseSha = ref.data.object.sha;
    const commit = await this.octokit.rest.git.getCommit({ ...this.repo, commit_sha: baseSha });
    const tree = await this.octokit.rest.git.getTree({
      ...this.repo,
      tree_sha: commit.data.tree.sha,
      recursive: "true",
    });

    const files = [];
    let totalBytes = 0;
    for (const item of tree.data.tree) {
      if (item.type !== "blob" || !item.path || !item.sha || !isReadableSiteText(item.path, item.size)) continue;
      if (totalBytes + (item.size || 0) > MAX_CONTEXT_BYTES) break;
      const blob = await this.octokit.rest.git.getBlob({ ...this.repo, file_sha: item.sha });
      if (blob.data.encoding !== "base64") continue;
      const content = Buffer.from(blob.data.content, "base64").toString("utf8");
      totalBytes += Buffer.byteLength(content, "utf8");
      files.push({ path: item.path, content });
    }
    return { baseSha, baseTreeSha: commit.data.tree.sha, files };
  }

  async publishProposal({ baseSha, baseTreeSha, changes, title, summary, requestedBy }) {
    const branch = `site-agent/${Date.now()}-${requestedBy}`;
    await this.octokit.rest.git.createRef({ ...this.repo, ref: `refs/heads/${branch}`, sha: baseSha });

    const blobs = await Promise.all(
      changes.map(async (change) => {
        const blob = await this.octokit.rest.git.createBlob({
          ...this.repo,
          content: change.content,
          encoding: "utf-8",
        });
        return { path: change.path, mode: "100644", type: "blob", sha: blob.data.sha };
      }),
    );
    const tree = await this.octokit.rest.git.createTree({
      ...this.repo,
      base_tree: baseTreeSha,
      tree: blobs,
    });
    const commit = await this.octokit.rest.git.createCommit({
      ...this.repo,
      message: `${title}\n\nRequested by Discord user ${requestedBy}`,
      tree: tree.data.sha,
      parents: [baseSha],
    });
    await this.octokit.rest.git.updateRef({
      ...this.repo,
      ref: `heads/${branch}`,
      sha: commit.data.sha,
    });
    const pull = await this.octokit.rest.pulls.create({
      ...this.repo,
      head: branch,
      base: this.defaultBranch,
      title: title.replace(/[\r\n]+/g, " ").trim(),
      body: `${summary}\n\nGenerated from an authorized Discord request by user \`${requestedBy}\`.`,
    });
    return pull.data;
  }

  async mergePull(number) {
    return this.octokit.rest.pulls.merge({ ...this.repo, pull_number: number, merge_method: "squash" });
  }
}

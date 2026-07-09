import fs from "fs";
import { graphql } from "@octokit/graphql";

const github = graphql.defaults({
  headers: {
    authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  },
});

async function main() {
  const { viewer } = await github(`
    {
      viewer {
        pullRequests {
          totalCount
        }

        issues {
          totalCount
        }

        repositories(first: 100, ownerAffiliations: OWNER) {
          totalCount

          nodes {
            stargazerCount
          }
        }
      }
    }
  `);

  const prs = viewer.pullRequests.totalCount;
  const issues = viewer.issues.totalCount;
  const repos = viewer.repositories.totalCount;

  const stars = viewer.repositories.nodes.reduce(
    (sum, repo) => sum + repo.stargazerCount,
    0
  );

  const stats = `<!--START_SECTION:stats-->
🔀 **${prs}** PRs • 🐛 **${issues}** Issues • ⭐ **${stars}** Stars • 📦 **${repos}** Repositories
<!--END_SECTION:stats-->`;

  const readme = fs.readFileSync("README.md", "utf8");

  const updated = readme.replace(
    /<!--START_SECTION:stats-->[\s\S]*<!--END_SECTION:stats-->/,
    stats
  );

  fs.writeFileSync("README.md", updated);

  console.log("README updated successfully!");
}

main().catch(console.error);
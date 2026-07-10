import fs from "fs";
import { graphql } from "@octokit/graphql";

const data = await graphql(
  `
  {
    user(login: "yuvrajsingh2428") {
      pullRequests(first: 1) {
        totalCount
      }

      issues(first: 1) {
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
  `,
  {
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  }
);

const user = data.user;

const prs = user.pullRequests.totalCount;
const issues = user.issues.totalCount;
const repos = user.repositories.totalCount;

const stars = user.repositories.nodes.reduce(
  (sum, repo) => sum + repo.stargazerCount,
  0
);

const stats = `<!--START_SECTION:stats-->
🔀 ${prs} PRs • 🐛 ${issues} Issues • ⭐ ${stars} Stars • 📦 ${repos} Repositories
<!--END_SECTION:stats-->`;

const readme = fs.readFileSync("README.md", "utf8");

const updated = readme.replace(
  /<!--START_SECTION:stats-->[\s\S]*<!--END_SECTION:stats-->/,
  stats
);

fs.writeFileSync("README.md", updated);

console.log("README updated successfully!");
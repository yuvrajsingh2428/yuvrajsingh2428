import fs from "fs";
import { graphql } from "@octokit/graphql";
import { generateActivityGraph } from "./generateGraph.js";

const envContent = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const match = envContent.match(/GITHUB_TOKEN=["']?([^"'\r\n]+)/);
const token = process.env.GITHUB_TOKEN || (match ? match[1] : "");

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
      authorization: `Bearer ${token}`,
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

await generateActivityGraph(token, "yuvrajsingh2428");
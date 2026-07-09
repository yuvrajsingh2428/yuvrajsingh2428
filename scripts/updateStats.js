import { graphql } from "@octokit/graphql";

const data = await graphql(
  `
  {
    viewer {
      login
      repositories(first: 5) {
        totalCount
        nodes {
          name
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

console.log(JSON.stringify(data, null, 2));
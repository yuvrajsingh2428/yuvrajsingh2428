import fs from "fs";
import { graphql } from "@octokit/graphql";

export async function generateActivityGraph(token = process.env.GITHUB_TOKEN, username = "yuvrajsingh2428") {
  const query = `
    query($login: String!) {
      user(login: $login) {
        name
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphql(query, {
    login: username,
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const weeks = data.user.contributionsCollection.contributionCalendar.weeks;
  const allDays = weeks.flatMap((w) => w.contributionDays);
  const last31Days = allDays.slice(-31);

  const values = last31Days.map((d) => d.contributionCount);
  const labels = last31Days.map((d) => {
    const parts = d.date.split("-");
    const m = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ][parseInt(parts[1], 10) - 1];
    return `${m} ${parseInt(parts[2], 10)}`;
  });

  const width = 890;
  const height = 400;
  const padding = { top: 80, right: 40, bottom: 50, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...values, 4);
  const yStep = Math.ceil(maxVal / 4);
  const maxY = yStep * 4;

  const points = values.map((val, i) => {
    const x = padding.left + (i / (values.length - 1)) * graphWidth;
    const y = padding.top + graphHeight - (val / maxY) * graphHeight;
    return { x, y, val, label: labels[i] };
  });

  // Calculate smooth cubic bezier path
  function getBezierPath(pts) {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return d;
  }

  const linePath = getBezierPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)},${(padding.top + graphHeight).toFixed(2)} L ${points[0].x.toFixed(2)},${(padding.top + graphHeight).toFixed(2)} Z`;

  // Grid lines Y
  const gridY = [];
  for (let i = 0; i <= 4; i++) {
    const val = i * yStep;
    const y = padding.top + graphHeight - (val / maxY) * graphHeight;
    gridY.push(`
      <line x1="${padding.left}" y1="${y.toFixed(2)}" x2="${(width - padding.right).toFixed(2)}" y2="${y.toFixed(2)}" stroke="#5bcdec" stroke-opacity="0.15" stroke-dasharray="3,3" />
      <text x="${padding.left - 12}" y="${(y + 4).toFixed(2)}" text-anchor="end" fill="#5bcdec" font-size="12" font-family="'Segoe UI', Ubuntu, sans-serif" opacity="0.8">${val}</text>
    `);
  }

  // Grid lines X (every 5 days)
  const gridX = [];
  points.forEach((pt, i) => {
    if (i % 5 === 0 || i === points.length - 1) {
      gridX.push(`
        <line x1="${pt.x.toFixed(2)}" y1="${padding.top}" x2="${pt.x.toFixed(2)}" y2="${(padding.top + graphHeight).toFixed(2)}" stroke="#5bcdec" stroke-opacity="0.1" stroke-dasharray="3,3" />
        <text x="${pt.x.toFixed(2)}" y="${(padding.top + graphHeight + 22).toFixed(2)}" text-anchor="middle" fill="#5bcdec" font-size="11" font-family="'Segoe UI', Ubuntu, sans-serif" opacity="0.8">${pt.label}</text>
      `);
    }
  });

  // Data points circles
  const circles = points
    .map(
      (pt) => `
      <circle cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="3.5" fill="#ffffff" stroke="#5bcdec" stroke-width="2">
        <title>${pt.label}: ${pt.val} contribution${pt.val === 1 ? "" : "s"}</title>
      </circle>`
    )
    .join("");

  const title = "Yuvraj Singh's Contribution Graph";

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5bcdec" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#5bcdec" stop-opacity="0.02"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" rx="6" fill="#0d1117" />

  <!-- Title -->
  <text x="${width / 2}" y="42" text-anchor="middle" fill="#5bcdec" font-size="19" font-weight="600" font-family="'Segoe UI', Ubuntu, -apple-system, sans-serif" letter-spacing="0.5">
    ${title}
  </text>

  <!-- Y Grid -->
  ${gridY.join("")}

  <!-- X Grid -->
  ${gridX.join("")}

  <!-- Area Fill -->
  <path d="${areaPath}" fill="url(#areaGradient)" />

  <!-- Line Chart -->
  <path d="${linePath}" fill="none" stroke="#5bcdec" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />

  <!-- Points -->
  ${circles}
</svg>`;

  fs.writeFileSync("activity-graph.svg", svg);
  console.log("activity-graph.svg generated successfully!");
}

if (process.argv[1]?.includes("generateGraph")) {
  const envContent = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
  const match = envContent.match(/GITHUB_TOKEN=["']?([^"'\r\n]+)/);
  const token = process.env.GITHUB_TOKEN || (match ? match[1] : "");
  await generateActivityGraph(token);
}

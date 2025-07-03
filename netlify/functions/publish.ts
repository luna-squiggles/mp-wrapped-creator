import type { Handler } from "@netlify/functions";
import slugify from "slugify";
import { z } from "zod";

// Define the exact schema for validation
const mpSchema = z.object({
  mpName: z.string().min(2),
  constituency: z.string(),
  musicSelect: z.number().int().min(1).max(8),
  surgeryHours: z.number().int().nonnegative(),
  casesClosed: z.number().int().nonnegative(),
  parliamentContributions: z.number().int().nonnegative(),
  parliamentVotes: z.number().int().nonnegative(),
  communityVisits: z.object({
    totalEngagements: z.number().int().nonnegative(),
    category1: z.object({ number: z.number(), label: z.string() }),
    category2: z.object({ number: z.number(), label: z.string() }),
    category3: z.object({ number: z.number(), label: z.string() })
  }),
  contributionPriorities: z.array(z.string()).max(3),
  votePriorities: z.array(z.string()).max(3),
  localProject: z.object({ name: z.string(), achievement: z.string() }),
  quote: z.string().max(120)
});

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  try {
    // Parse and validate the request body
    if (!event.body) {
      throw new Error("Request body is required");
    }

    const body = mpSchema.parse(JSON.parse(event.body));

    // Generate a slug from the MP name
    const slug = slugify(body.mpName, { lower: true, strict: true });

    // Check if GITHUB_PAT is available
    if (!process.env.GITHUB_PAT) {
      throw new Error("GitHub Personal Access Token not configured");
    }

    // List all files in the repo root to find existing wraps for this slug
    const listRes = await fetch(
      `https://api.github.com/repos/luna-squiggles/wrapped-data/contents`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_PAT}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!listRes.ok) {
      throw new Error("Failed to list repo contents");
    }
    const files = await listRes.json();
    // Find all files matching the pattern slug.json, slug-1.json, slug-2.json, etc.
    const basePattern = new RegExp(`^${slug}(?:-(\\d+))?\\.json$`);
    let maxIndex = -1;
    files.forEach((file: any) => {
      const match = file.name.match(basePattern);
      if (match) {
        if (match[1]) {
          const idx = parseInt(match[1], 10);
          if (idx > maxIndex) maxIndex = idx;
        } else {
          // The base file (no number) counts as index 0
          if (maxIndex < 0) maxIndex = 0;
        }
      }
    });
    // Next available index
    const nextIndex = maxIndex + 1;
    const filename = nextIndex === 0 ? `${slug}.json` : `${slug}-${nextIndex}.json`;
    const path = filename;

    // Prepare the content for GitHub
    const content = Buffer.from(JSON.stringify(body, null, 2)).toString("base64");

    // Create the file via GitHub REST API (never update, always add new)
    const requestBody: any = {
      message: `Add wrap for ${body.mpName}`,
      content: content
    };

    const response = await fetch(
      `https://api.github.com/repos/luna-squiggles/wrapped-data/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub API error:", errorText);
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: `/${filename.replace(/\.json$/, "")}` })
    };

  } catch (error: any) {
    console.error("Error in publish function:", error);
    
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        details: error.errors || null
      })
    };
  }
};
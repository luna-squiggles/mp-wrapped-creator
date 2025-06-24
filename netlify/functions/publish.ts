import type { Handler } from "@netlify/functions";
import slugify from "slugify";
import { z } from "zod";

// Define the exact schema for validation
const mpSchema = z.object({
  mpName: z.string().min(2),
  constituency: z.string(),
  musicSelect: z.number().int().min(1).max(3),
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

    // Prepare the content for GitHub
    const content = Buffer.from(JSON.stringify(body, null, 2)).toString("base64");
    const path = `${slug}.json`;

    // Check if GITHUB_PAT is available
    if (!process.env.GITHUB_PAT) {
      throw new Error("GitHub Personal Access Token not configured");
    }

    // Try to get existing file SHA for updates
    let sha: string | undefined;
    try {
      const existingFile = await fetch(
        `https://api.github.com/repos/luna-squiggles/wrapped-data/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_PAT}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (existingFile.ok) {
        const fileData = await existingFile.json();
        sha = fileData.sha;
      }
    } catch (error) {
      // File doesn't exist, which is fine for new files
      console.log("File doesn't exist yet, creating new file");
    }

    // Create or update the file via GitHub REST API
    const requestBody: any = {
      message: `${sha ? 'Update' : 'Add'} wrap for ${body.mpName}`,
      content: content
    };

    if (sha) {
      requestBody.sha = sha;
    }

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
      body: JSON.stringify({ url: `/${slug}` })
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
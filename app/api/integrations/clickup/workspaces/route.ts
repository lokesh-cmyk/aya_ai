import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClickUpConnectionId, ClickUpClient } from "@/lib/integrations/clickup";

/**
 * GET - Fetch ClickUp workspaces for the authenticated user.
 * Used by the workspace picker dialog after connecting ClickUp.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectionId = await getClickUpConnectionId(session.user.id);
    if (!connectionId) {
      return NextResponse.json(
        { error: "ClickUp is not connected. Please connect ClickUp first." },
        { status: 400 }
      );
    }

    const client = new ClickUpClient(connectionId);
    const workspaces = await client.getWorkspaces();

    return NextResponse.json({
      workspaces: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        color: w.color,
        membersCount: w.members?.length ?? 0,
      })),
    });
  } catch (error) {
    console.error("[clickup/workspaces]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch workspaces",
      },
      { status: 500 }
    );
  }
}

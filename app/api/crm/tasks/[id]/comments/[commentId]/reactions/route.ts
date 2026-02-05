import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Get reactions for a comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;

    const reactions = await prisma.taskCommentReaction.findMany({
      where: { commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const likes = reactions.filter((r) => r.type === "like");
    const dislikes = reactions.filter((r) => r.type === "dislike");
    const userReaction = reactions.find((r) => r.userId === session.user.id);

    return NextResponse.json({
      likes: likes.length,
      dislikes: dislikes.length,
      userReaction: userReaction?.type || null,
      likedBy: likes.map((r) => r.user),
      dislikedBy: dislikes.map((r) => r.user),
    });
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}

// POST - Add/update reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;
    const body = await request.json();
    const { type } = body;

    if (!type || !["like", "dislike"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid reaction type" },
        { status: 400 }
      );
    }

    // Check if user already has a reaction
    const existingReaction = await prisma.taskCommentReaction.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: session.user.id,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Same reaction type - remove it (toggle off)
        await prisma.taskCommentReaction.delete({
          where: { id: existingReaction.id },
        });
        return NextResponse.json({
          success: true,
          action: "removed",
          userReaction: null,
        });
      } else {
        // Different reaction type - update it
        await prisma.taskCommentReaction.update({
          where: { id: existingReaction.id },
          data: { type },
        });
        return NextResponse.json({
          success: true,
          action: "updated",
          userReaction: type,
        });
      }
    }

    // Create new reaction
    await prisma.taskCommentReaction.create({
      data: {
        type,
        commentId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      action: "created",
      userReaction: type,
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}

// DELETE - Remove reaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;

    await prisma.taskCommentReaction.deleteMany({
      where: {
        commentId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      userReaction: null,
    });
  } catch (error) {
    console.error("Error removing reaction:", error);
    return NextResponse.json(
      { error: "Failed to remove reaction" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Check if user is watching the task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const watcher = await prisma.taskWatcher.findUnique({
      where: {
        taskId_userId: {
          taskId: id,
          userId: session.user.id,
        },
      },
    });

    // Also get count of all watchers
    const watcherCount = await prisma.taskWatcher.count({
      where: { taskId: id },
    });

    return NextResponse.json({
      isWatching: !!watcher,
      watcherCount,
    });
  } catch (error) {
    console.error("Error checking watch status:", error);
    return NextResponse.json(
      { error: "Failed to check watch status" },
      { status: 500 }
    );
  }
}

// POST - Watch a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create watcher (upsert to handle duplicates)
    await prisma.taskWatcher.upsert({
      where: {
        taskId_userId: {
          taskId: id,
          userId: session.user.id,
        },
      },
      update: {},
      create: {
        taskId: id,
        userId: session.user.id,
      },
    });

    const watcherCount = await prisma.taskWatcher.count({
      where: { taskId: id },
    });

    return NextResponse.json({
      success: true,
      isWatching: true,
      watcherCount,
    });
  } catch (error) {
    console.error("Error watching task:", error);
    return NextResponse.json(
      { error: "Failed to watch task" },
      { status: 500 }
    );
  }
}

// DELETE - Unwatch a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.taskWatcher.deleteMany({
      where: {
        taskId: id,
        userId: session.user.id,
      },
    });

    const watcherCount = await prisma.taskWatcher.count({
      where: { taskId: id },
    });

    return NextResponse.json({
      success: true,
      isWatching: false,
      watcherCount,
    });
  } catch (error) {
    console.error("Error unwatching task:", error);
    return NextResponse.json(
      { error: "Failed to unwatch task" },
      { status: 500 }
    );
  }
}

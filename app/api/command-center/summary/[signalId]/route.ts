// app/api/command-center/summary/[signalId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Anthropic } from "@anthropic-ai/sdk";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ signalId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const { signalId } = await params;

    // Parse signal ID: "task:123:blocked" or "contact:456:comm_gap"
    const [entityType, entityId, signalType] = signalId.split(":");

    if (!entityType || !entityId || !signalType) {
      return NextResponse.json(
        { error: "Invalid signal ID format" },
        { status: 400 }
      );
    }

    let contextData: string = "";
    let impactData: string = "";

    if (entityType === "task") {
      const task = await prisma.task.findUnique({
        where: { id: entityId },
        include: {
          assignee: { select: { name: true } },
          creator: { select: { name: true } },
          taskList: {
            include: {
              space: { select: { name: true } },
              tasks: {
                where: {
                  status: { name: { notIn: ["CLOSED", "Done"] } },
                },
                select: { id: true, name: true },
                take: 5,
              },
            },
          },
          comments: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { author: { select: { name: true } } },
          },
        },
      });

      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      const daysSinceCreation = Math.floor(
        (Date.now() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceUpdate = Math.floor(
        (Date.now() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      contextData = `Task "${task.name}" in ${task.taskList.space?.name || "Unknown Space"}.
Created ${daysSinceCreation} days ago by ${task.creator?.name || "Unknown"}.
Assigned to ${task.assignee?.name || "Unassigned"}.
Current progress: ${task.progress || 0}%.
Priority: ${task.priority}.
Last updated ${daysSinceUpdate} days ago.
${task.comments.length > 0 ? `Recent comments: ${task.comments.map(c => `${c.author?.name}: "${c.content?.slice(0, 100)}"`).join("; ")}` : "No recent comments."}`;

      const otherTasksInList = task.taskList.tasks.filter(t => t.id !== task.id);
      impactData = otherTasksInList.length > 0
        ? `This task is in a list with ${otherTasksInList.length} other open tasks: ${otherTasksInList.map(t => `"${t.name}"`).slice(0, 3).join(", ")}${otherTasksInList.length > 3 ? "..." : ""}.`
        : "This is the only open task in its list.";

    } else if (entityType === "contact") {
      const contact = await prisma.contact.findUnique({
        where: { id: entityId },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              content: true,
              direction: true,
              createdAt: true,
              channel: true,
            },
          },
        },
      });

      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      const lastInbound = contact.messages.find(m => m.direction === "INBOUND");
      const daysSinceInbound = lastInbound
        ? Math.floor((Date.now() - lastInbound.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      contextData = `Contact: ${contact.name || contact.email || "Unknown"}.
${contact.email ? `Email: ${contact.email}` : ""}
${contact.phone ? `Phone: ${contact.phone}` : ""}
Last ${contact.messages.length} messages: ${contact.messages.map(m => `[${m.direction}] "${m.content?.slice(0, 50)}..."`).join("; ")}
${daysSinceInbound !== null ? `Last inbound message ${daysSinceInbound} days ago.` : ""}`;

      impactData = `This contact may be waiting for a response. Delayed responses can impact customer satisfaction and relationship.`;
    } else {
      // For user/bottleneck or velocity signals, provide generic context
      contextData = `Signal type: ${signalType}. Entity: ${entityType} (${entityId}).`;
      impactData = "Review this signal to understand its impact on your team's workflow.";
    }

    // Generate AI summary using Claude
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are an assistant helping project managers understand the context and impact of a ${signalType} signal. Be concise and actionable.

Context data:
${contextData}

Impact data:
${impactData}

Generate a JSON response with exactly two fields:
1. "context": A 2-3 sentence summary of the timeline and current state (what happened, when, who's involved)
2. "impact": A 1-2 sentence analysis of what's at risk or what this affects

Respond ONLY with valid JSON, no markdown.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const summary = JSON.parse(content.text);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("AI summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

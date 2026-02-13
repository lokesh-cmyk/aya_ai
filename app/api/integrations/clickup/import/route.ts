import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  getClickUpConnectionId,
  ClickUpClient,
  mapClickUpPriority,
  generateTaskId,
  type ClickUpSpace,
  type ClickUpFolder,
  type ClickUpList,
  type ClickUpTask,
  type ClickUpStatus,
} from "@/lib/integrations/clickup";

// Allow up to 5 minutes for large workspace imports (serverless timeout)
export const maxDuration = 300;

const importSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

/**
 * POST - Import all ClickUp data from a workspace into the CRM.
 * Creates Spaces, Folders, TaskLists, StatusColumns, and Tasks.
 * Supports deduplication via metadata.clickupId fields.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId } = importSchema.parse(body);

    // Get user's team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, teamId: true, role: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: "You must belong to a team to import data" },
        { status: 400 }
      );
    }

    // Get ClickUp connection ID for Composio proxy
    const connectionId = await getClickUpConnectionId(session.user.id);
    if (!connectionId) {
      return NextResponse.json(
        { error: "ClickUp is not connected. Please reconnect ClickUp." },
        { status: 400 }
      );
    }

    const client = new ClickUpClient(connectionId);

    // -----------------------------------------------------------------------
    // Phase 1: Fetch all ClickUp data (parallelized per space)
    // -----------------------------------------------------------------------
    const clickUpSpaces = await client.getSpaces(workspaceId);

    // Collect all folders, lists, and tasks
    const allFolders: Array<ClickUpFolder & { _spaceId: string }> = [];
    const allLists: Array<
      ClickUpList & { _spaceId: string; _folderId: string | null }
    > = [];
    const allTasks: Array<ClickUpTask & { _listId: string }> = [];

    // Fetch data for all spaces in parallel
    await Promise.all(
      clickUpSpaces.map(async (space) => {
        try {
          // Fetch folders and folderless lists for this space in parallel
          const [folders, folderlessLists] = await Promise.all([
            client.getFolders(space.id).catch((err) => {
              console.error(`[clickup/import] Failed to fetch folders for space "${space.name}":`, err);
              return [] as ClickUpFolder[];
            }),
            client.getFolderlessLists(space.id).catch((err) => {
              console.error(`[clickup/import] Failed to fetch folderless lists for space "${space.name}":`, err);
              return [] as ClickUpList[];
            }),
          ]);

          // Process folders and their lists in parallel
          await Promise.all(
            folders.map(async (folder) => {
              allFolders.push({ ...folder, _spaceId: space.id });

              const lists = await client.getLists(folder.id).catch((err) => {
                console.error(`[clickup/import] Failed to fetch lists for folder "${folder.name}":`, err);
                return [] as ClickUpList[];
              });

              // Fetch tasks for all lists in this folder in parallel
              await Promise.all(
                lists.map(async (list) => {
                  allLists.push({ ...list, _spaceId: space.id, _folderId: folder.id });

                  const tasks = await client.getTasks(list.id).catch((err) => {
                    console.error(`[clickup/import] Failed to fetch tasks for list "${list.name}":`, err);
                    return [] as ClickUpTask[];
                  });
                  for (const task of tasks) {
                    allTasks.push({ ...task, _listId: list.id });
                  }
                })
              );
            })
          );

          // Process folderless lists and their tasks in parallel
          await Promise.all(
            folderlessLists.map(async (list) => {
              allLists.push({ ...list, _spaceId: space.id, _folderId: null });

              const tasks = await client.getTasks(list.id).catch((err) => {
                console.error(`[clickup/import] Failed to fetch tasks for list "${list.name}":`, err);
                return [] as ClickUpTask[];
              });
              for (const task of tasks) {
                allTasks.push({ ...task, _listId: list.id });
              }
            })
          );
        } catch (err) {
          console.error(`[clickup/import] Failed to process space "${space.name}":`, err);
        }
      })
    );

    console.log(
      `[clickup/import] Fetched ${clickUpSpaces.length} spaces, ${allFolders.length} folders, ${allLists.length} lists, ${allTasks.length} tasks`
    );

    // -----------------------------------------------------------------------
    // Phase 2: Create CRM records
    // -----------------------------------------------------------------------
    const summary = { spaces: 0, folders: 0, lists: 0, statuses: 0, tasks: 0 };
    const errors: string[] = [];

    // Maps from ClickUp ID → CRM ID
    const spaceMap = new Map<string, string>();
    const folderMap = new Map<string, string>();
    const listMap = new Map<string, string>();
    // Map from (listCrmId, statusName) → statusColumnCrmId
    const statusMap = new Map<string, string>();

    // --- Spaces ---
    for (const cuSpace of clickUpSpaces) {
      try {
        const crmSpace = await findOrCreateSpace(
          cuSpace,
          user.teamId,
          session.user.id
        );
        spaceMap.set(cuSpace.id, crmSpace.id);
        summary.spaces++;
      } catch (err) {
        console.error(`[clickup/import] Failed to create space "${cuSpace.name}":`, err);
        errors.push(`Space "${cuSpace.name}"`);
      }
    }

    // --- Folders ---
    for (const cuFolder of allFolders) {
      const crmSpaceId = spaceMap.get(cuFolder._spaceId);
      if (!crmSpaceId) continue;

      try {
        const crmFolder = await findOrCreateFolder(cuFolder, crmSpaceId);
        folderMap.set(cuFolder.id, crmFolder.id);
        summary.folders++;
      } catch (err) {
        console.error(`[clickup/import] Failed to create folder "${cuFolder.name}":`, err);
        errors.push(`Folder "${cuFolder.name}"`);
      }
    }

    // --- Lists + Status Columns ---
    for (const cuList of allLists) {
      const crmSpaceId = spaceMap.get(cuList._spaceId);
      if (!crmSpaceId) continue;
      const crmFolderId = cuList._folderId
        ? folderMap.get(cuList._folderId) ?? null
        : null;

      try {
        const crmList = await findOrCreateTaskList(
          cuList,
          crmSpaceId,
          crmFolderId
        );
        listMap.set(cuList.id, crmList.id);
        summary.lists++;

        // Create status columns from ClickUp list statuses
        const statuses = cuList.statuses ?? [];

        if (statuses.length > 0) {
          for (let i = 0; i < statuses.length; i++) {
            const cuStatus = statuses[i];
            try {
              const crmStatus = await findOrCreateStatusColumn(
                cuStatus,
                crmList.id,
                i
              );
              statusMap.set(`${crmList.id}:${cuStatus.status.toLowerCase()}`, crmStatus.id);
              summary.statuses++;
            } catch (err) {
              console.error(`[clickup/import] Failed to create status "${cuStatus.status}":`, err);
            }
          }
        } else {
          // Fallback: create default status columns so the kanban board isn't blank
          const defaultStatuses = [
            { status: "To Do", color: "#d3d3d3", type: "open", orderindex: 0 },
            { status: "In Progress", color: "#4194f6", type: "custom", orderindex: 1 },
            { status: "Done", color: "#6bc950", type: "closed", orderindex: 2 },
          ];
          for (let i = 0; i < defaultStatuses.length; i++) {
            const ds = defaultStatuses[i];
            try {
              const crmStatus = await findOrCreateStatusColumn(
                ds as ClickUpStatus,
                crmList.id,
                i
              );
              statusMap.set(`${crmList.id}:${ds.status.toLowerCase()}`, crmStatus.id);
              summary.statuses++;
            } catch (err) {
              console.error(`[clickup/import] Failed to create default status "${ds.status}":`, err);
            }
          }
        }
      } catch (err) {
        console.error(`[clickup/import] Failed to create list "${cuList.name}":`, err);
        errors.push(`List "${cuList.name}"`);
      }
    }

    // --- Tasks ---
    for (const cuTask of allTasks) {
      const crmListId = listMap.get(cuTask._listId);
      if (!crmListId) continue;

      try {
        // Safely resolve status (guard against null/missing status object)
        const taskStatusName = cuTask.status?.status;
        const statusKey = taskStatusName
          ? `${crmListId}:${taskStatusName.toLowerCase()}`
          : null;
        const statusId = statusKey ? statusMap.get(statusKey) ?? null : null;

        await findOrCreateTask(cuTask, crmListId, statusId, session.user.id);
        summary.tasks++;
      } catch (err) {
        console.error(`[clickup/import] Failed to create task "${cuTask.name}":`, err);
        errors.push(`Task "${cuTask.name}"`);
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      message: `Imported ${summary.spaces} spaces, ${summary.folders} folders, ${summary.lists} lists, ${summary.statuses} statuses, and ${summary.tasks} tasks from ClickUp.`,
      ...(errors.length > 0 && { warnings: `${errors.length} items had errors and were skipped.` }),
    });
  } catch (error) {
    console.error("[clickup/import]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import from ClickUp",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers: find-or-create with deduplication via metadata
// ---------------------------------------------------------------------------

async function findOrCreateSpace(
  cuSpace: ClickUpSpace,
  teamId: string,
  userId: string
) {
  // Check if already imported by looking for ClickUp ID marker in description
  const existing = await prisma.space.findFirst({
    where: {
      teamId,
      description: { contains: `[clickup:${cuSpace.id}]` },
    },
  });

  if (existing) {
    // Update name/color if changed
    return prisma.space.update({
      where: { id: existing.id },
      data: {
        name: cuSpace.name,
        color: cuSpace.color || existing.color,
      },
    });
  }

  // Create new space
  const space = await prisma.space.create({
    data: {
      name: cuSpace.name,
      description: `Imported from ClickUp [clickup:${cuSpace.id}]`,
      color: cuSpace.color || null,
      teamId,
      createdBy: userId,
    },
  });

  // Add creator as ADMIN member
  await prisma.spaceMember.create({
    data: {
      spaceId: space.id,
      userId,
      role: "ADMIN",
    },
  });

  return space;
}

async function findOrCreateFolder(
  cuFolder: ClickUpFolder,
  crmSpaceId: string
) {
  const marker = `[clickup:${cuFolder.id}]`;

  const existing = await prisma.folder.findFirst({
    where: {
      spaceId: crmSpaceId,
      description: { contains: marker },
    },
  });

  if (existing) {
    return prisma.folder.update({
      where: { id: existing.id },
      data: { name: cuFolder.name, order: cuFolder.orderindex },
    });
  }

  return prisma.folder.create({
    data: {
      name: cuFolder.name,
      description: `Imported from ClickUp ${marker}`,
      order: cuFolder.orderindex,
      spaceId: crmSpaceId,
    },
  });
}

async function findOrCreateTaskList(
  cuList: ClickUpList,
  crmSpaceId: string,
  crmFolderId: string | null
) {
  const marker = `[clickup:${cuList.id}]`;

  const existing = await prisma.taskList.findFirst({
    where: {
      spaceId: crmSpaceId,
      description: { contains: marker },
    },
  });

  if (existing) {
    return prisma.taskList.update({
      where: { id: existing.id },
      data: {
        name: cuList.name,
        order: cuList.orderindex,
        folderId: crmFolderId,
      },
    });
  }

  return prisma.taskList.create({
    data: {
      name: cuList.name,
      type: "DEV_ROADMAP",
      description: `Imported from ClickUp ${marker}`,
      order: cuList.orderindex,
      spaceId: crmSpaceId,
      folderId: crmFolderId,
    },
  });
}

async function findOrCreateStatusColumn(
  cuStatus: ClickUpStatus,
  crmListId: string,
  order: number
) {
  const existing = await prisma.taskStatusColumn.findFirst({
    where: {
      taskListId: crmListId,
      name: cuStatus.status,
    },
  });

  if (existing) {
    return prisma.taskStatusColumn.update({
      where: { id: existing.id },
      data: { color: cuStatus.color || existing.color, order },
    });
  }

  return prisma.taskStatusColumn.create({
    data: {
      name: cuStatus.status,
      color: cuStatus.color || null,
      order,
      taskListId: crmListId,
    },
  });
}

async function findOrCreateTask(
  cuTask: ClickUpTask,
  crmListId: string,
  statusId: string | null,
  userId: string
) {
  // Check by clickupTaskId in metadata
  const existing = await prisma.task.findFirst({
    where: {
      taskListId: crmListId,
      metadata: { path: ["clickupTaskId"], equals: cuTask.id },
    },
  });

  const tags = cuTask.tags?.map((t) => t.name) ?? [];
  const priority = mapClickUpPriority(cuTask.priority);
  const description = cuTask.description || cuTask.text_content || null;

  // Safely parse due_date - ClickUp sends epoch ms as a string
  let dueDate: Date | null = null;
  if (cuTask.due_date && cuTask.due_date !== "") {
    const epoch = Number(cuTask.due_date);
    if (!isNaN(epoch) && epoch > 0) {
      dueDate = new Date(epoch);
      // Guard against Invalid Date
      if (isNaN(dueDate.getTime())) {
        dueDate = null;
      }
    }
  }

  if (existing) {
    return prisma.task.update({
      where: { id: existing.id },
      data: {
        name: cuTask.name,
        description,
        priority,
        dueDate,
        tags,
        statusId,
        metadata: { clickupTaskId: cuTask.id },
      },
    });
  }

  return prisma.task.create({
    data: {
      name: cuTask.name,
      description,
      taskId: generateTaskId(),
      taskListId: crmListId,
      statusId,
      priority,
      progress: 0,
      dueDate,
      tags,
      metadata: { clickupTaskId: cuTask.id },
      createdById: userId,
    },
  });
}

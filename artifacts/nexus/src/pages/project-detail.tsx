import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useListProjectTasks, getListProjectTasksQueryKey,
  useCreateTask,
  useUpdateTask,
  useUpdateProject,
  useDeleteProject,
  getListProjectsQueryKey,
  Task
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Plus, GripVertical, MoreHorizontal, Settings, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { ProjectMembersSheet } from "@/components/project-members-sheet";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { format } from "date-fns";

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "in_review", title: "In Review" },
  { id: "done", title: "Done" },
];

export function ProjectDetail() {
  const { id } = useParams();
  const projectId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, { 
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } 
  });
  
  const { data: tasks, isLoading: isTasksLoading } = useListProjectTasks(projectId, undefined, {
    query: { enabled: !!projectId, queryKey: getListProjectTasksQueryKey(projectId) }
  });

  const updateTask = useUpdateTask();
  const deleteProject = useDeleteProject();

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("taskId", taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData("taskId"), 10);
    if (!taskId || isNaN(taskId)) return;

    const task = tasks?.find(t => t.id === taskId);
    if (task && task.status !== statusId) {
      // Optimistic update
      qc.setQueryData(getListProjectTasksQueryKey(projectId), (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === taskId ? { ...t, status: statusId as any } : t);
      });
      
      updateTask.mutate({ id: taskId, data: { status: statusId as any } }, {
        onError: () => {
          qc.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) });
        }
      });
    }
  };

  const handleDeleteProject = () => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    deleteProject.mutate({ id: projectId }, {
      onSuccess: () => {
        toast({ title: "Project deleted" });
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setLocation("/projects");
      }
    });
  };

  if (isProjectLoading || !projectId) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-[600px] w-full" /></div>;
  }

  if (!project) return <div className="p-12 text-center text-muted-foreground">Project not found</div>;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/projects")} className="shrink-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm" 
              style={{ backgroundColor: project.color || '#4f46e5' }}
            >
              {project.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-xl leading-tight">{project.name}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="capitalize">{project.status}</span>
                <span>•</span>
                <span>{project.taskCount} tasks</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="secondary" size="sm" onClick={() => setMembersSheetOpen(true)} className="flex-1 sm:flex-none">
            <Users className="w-4 h-4 mr-2" />
            Members ({project.memberCount})
          </Button>
          
          {project.myRole === 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" /> Project Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={handleDeleteProject}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 relative">
        <div className="absolute inset-0 bg-muted/5 pointer-events-none" />
        <div className="flex gap-6 h-full min-w-max pb-4 relative">
          {COLUMNS.map(col => {
            const columnTasks = tasks?.filter(t => t.status === col.id) || [];
            
            return (
              <div 
                key={col.id} 
                className="w-[320px] flex flex-col max-h-full rounded-xl bg-card border border-border shadow-sm"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="p-3 font-medium flex items-center justify-between border-b border-border/50 shrink-0 bg-muted/20 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{col.title}</h3>
                    <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                      {columnTasks.length}
                    </span>
                  </div>
                  <CreateTaskDialog projectId={projectId} defaultStatus={col.id} />
                </div>
                
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {isTasksLoading ? (
                    <><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></>
                  ) : columnTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                  {columnTasks.length === 0 && !isTasksLoading && (
                    <div className="h-24 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center text-muted-foreground text-xs opacity-50 bg-muted/10">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ProjectMembersSheet 
        projectId={projectId} 
        open={membersSheetOpen} 
        onOpenChange={setMembersSheetOpen} 
        myRole={project.myRole} 
      />

      <TaskDetailSheet 
        taskId={selectedTaskId} 
        projectId={projectId}
        open={!!selectedTaskId} 
        onOpenChange={(open) => !open && setSelectedTaskId(null)} 
      />

      <ProjectSettingsDialog projectId={projectId} project={project} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function TaskCard({ task, onDragStart, onClick }: { task: Task, onDragStart: (e: React.DragEvent) => void, onClick: () => void }) {
  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-background border border-border rounded-lg p-3 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group relative active:cursor-grabbing"
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
        <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing" />
      </div>
      <div className="flex gap-2 mb-2">
        <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0 ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </Badge>
      </div>
      <h4 className="font-semibold text-sm mb-1 pr-6 leading-snug">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 mt-1 leading-relaxed">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          {task.assigneeName ? (
            <Avatar className="w-6 h-6 border border-border shadow-sm">
              <AvatarImage src={task.assigneeAvatarUrl || ""} />
              <AvatarFallback className="text-[10px] font-medium">{task.assigneeName.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted border border-dashed flex items-center justify-center text-[10px] font-medium text-muted-foreground">
              Un
            </div>
          )}
          {task.commentCount > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 rounded-sm">
              {task.commentCount} 💬
            </span>
          )}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground">
          {format(new Date(task.createdAt), "MMM d")}
        </div>
      </div>
    </div>
  );
}

const taskSchema = z.object({
  title: z.string().min(1, "Title required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "in_review", "done"])
});

function CreateTaskDialog({ projectId, defaultStatus }: { projectId: number, defaultStatus: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const createTask = useCreateTask();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      priority: "medium",
      status: defaultStatus as any,
    }
  });

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    createTask.mutate(
      { id: projectId, data: { title: values.title, priority: values.priority, status: values.status } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) });
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          setOpen(false);
          form.reset();
          toast({ title: "Task added" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background shadow-sm">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl><Input autoFocus {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending}>Add Task</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const projectSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(["active", "archived", "completed"])
});

function ProjectSettingsDialog({ projectId, project, open, onOpenChange }: { projectId: number, project: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const updateProject = useUpdateProject();
  const qc = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || "active",
    }
  });

  const onSubmit = (values: z.infer<typeof projectSchema>) => {
    updateProject.mutate({ id: projectId, data: values }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        onOpenChange(false);
        toast({ title: "Project updated" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={updateProject.isPending}>Save Changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useListMyTasks, getListMyTasksQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare } from "lucide-react";

export function Tasks() {
  const [status, setStatus] = useState<string>("all");
  
  const { data: tasks, isLoading } = useListMyTasks(
    status !== "all" ? { status: status as any } : undefined,
    { query: { queryKey: [...getListMyTasksQueryKey(), status] } }
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground mt-1">Everything assigned to you across all projects.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : tasks?.length ? (
          <div className="divide-y divide-border">
            {tasks.map(task => (
              <div key={task.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.status === 'done' ? 'bg-green-500' :
                    task.status === 'in_progress' ? 'bg-blue-500' :
                    task.status === 'in_review' ? 'bg-amber-500' : 'bg-gray-300'
                  }`} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Link href={`/projects/${task.projectId}`} className="hover:text-primary hover:underline truncate max-w-[150px]">
                        {task.projectName}
                      </Link>
                      <span>•</span>
                      <span>{task.status.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="capitalize text-xs hidden sm:inline-flex">
                    {task.priority}
                  </Badge>
                  <Link href={`/projects/${task.projectId}`}>
                    <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <CheckSquare className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm max-w-sm mt-1">You're all caught up or no tasks match your current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
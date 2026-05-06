import { useState, useEffect, useRef } from "react";
import { 
  useGetTask, 
  useUpdateTask, 
  useDeleteTask, 
  useListTaskComments, 
  useCreateTaskComment, 
  useListProjectMembers, 
  getGetTaskQueryKey, 
  getListTaskCommentsQueryKey, 
  getListProjectTasksQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, CalendarIcon, Trash2, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

export function TaskDetailSheet({ 
  taskId, 
  projectId,
  open, 
  onOpenChange 
}: { 
  taskId: number | null; 
  projectId: number;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const { data: task, isLoading } = useGetTask(taskId || 0, {
    query: { enabled: open && !!taskId, queryKey: getGetTaskQueryKey(taskId || 0) }
  });
  
  const { data: comments, isLoading: isCommentsLoading } = useListTaskComments(taskId || 0, {
    query: { enabled: open && !!taskId, queryKey: getListTaskCommentsQueryKey(taskId || 0) }
  });
  
  const { data: members } = useListProjectMembers(projectId, {
    query: { enabled: open && !!projectId }
  });

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createComment = useCreateTaskComment();

  const [commentContent, setCommentContent] = useState("");
  
  // Local state for optimistic UI during debounced updates
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  
  const initRef = useRef<number | null>(null);

  useEffect(() => {
    if (task && initRef.current !== task.id) {
      setLocalTitle(task.title);
      setLocalDescription(task.description || "");
      initRef.current = task.id;
    }
  }, [task]);

  const handleUpdateTask = (data: any) => {
    if (!taskId) return;
    updateTask.mutate(
      { id: taskId, data },
      {
        onSuccess: (updated) => {
          qc.setQueryData(getGetTaskQueryKey(taskId), updated);
          qc.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) });
        }
      }
    );
  };

  const handleDeleteTask = () => {
    if (!taskId) return;
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    deleteTask.mutate(
      { id: taskId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) });
          toast({ title: "Task deleted" });
          onOpenChange(false);
        }
      }
    );
  };

  const handleAddComment = () => {
    if (!taskId || !commentContent.trim()) return;
    
    createComment.mutate(
      { id: taskId, data: { content: commentContent } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
          qc.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) }); // to update comment count
          setCommentContent("");
        }
      }
    );
  };

  if (!open || !taskId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 h-[100dvh]">
        {isLoading || !task ? (
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <div className="flex gap-4"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-32" /></div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 border-b border-border shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs uppercase">{task.projectId}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Input 
                    value={localTitle} 
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={() => { if (localTitle !== task.title) handleUpdateTask({ title: localTitle }); }}
                    className="text-xl font-semibold px-0 border-transparent shadow-none focus-visible:ring-0 focus-visible:border-input -ml-3" 
                  />
                </div>
                <Button variant="ghost" size="icon" className="text-destructive opacity-50 hover:opacity-100 shrink-0" onClick={handleDeleteTask}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/50">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</label>
                  <Select value={task.status} onValueChange={(val) => handleUpdateTask({ status: val })}>
                    <SelectTrigger className="w-36 h-8 text-xs bg-muted/30">
                      <div className="flex items-center gap-2">
                        {task.status === 'done' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Circle className="w-3 h-3 text-muted-foreground" />}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Priority</label>
                  <Select value={task.priority} onValueChange={(val) => handleUpdateTask({ priority: val })}>
                    <SelectTrigger className="w-32 h-8 text-xs bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assignee</label>
                  <Select 
                    value={task.assigneeClerkUserId || "unassigned"} 
                    onValueChange={(val) => handleUpdateTask({ assigneeClerkUserId: val === "unassigned" ? null : val })}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs bg-muted/30">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members?.map(m => (
                        <SelectItem key={m.id} value={m.clerkUserId}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-4 h-4"><AvatarImage src={m.avatarUrl || ""} /><AvatarFallback>{m.name.charAt(0)}</AvatarFallback></Avatar>
                            <span>{m.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2">
                  Description
                </label>
                <Textarea 
                  placeholder="Add a more detailed description..."
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => { if (localDescription !== (task.description || "")) handleUpdateTask({ description: localDescription }); }}
                  className="min-h-[120px] resize-y bg-muted/10"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b border-border pb-2">Activity & Comments</h3>
                
                {isCommentsLoading ? (
                  <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
                ) : comments?.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8 border shrink-0">
                      <AvatarImage src={comment.authorAvatarUrl || ""} />
                      <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/30 border border-border/50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">{comment.authorName}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(comment.createdAt), "MMM d, h:mm a")}</span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-card shrink-0">
              <div className="flex gap-3">
                <Textarea 
                  placeholder="Write a comment..." 
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="min-h-[40px] h-[40px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button size="icon" className="shrink-0" onClick={handleAddComment} disabled={!commentContent.trim() || createComment.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
import { useGetDashboardSummary, useGetRecentActivity, useGetOverdueTasks } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, Clock, Folder, AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: isActivityLoading } = useGetRecentActivity({ limit: 5 });
  const { data: overdue, isLoading: isOverdueLoading } = useGetOverdueTasks();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Command center for your tasks and projects.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Active Projects" 
          value={summary?.totalProjects} 
          icon={<Folder className="w-4 h-4 text-muted-foreground" />} 
          loading={isSummaryLoading} 
        />
        <StatCard 
          title="Active Tasks" 
          value={summary?.activeTasks} 
          icon={<Activity className="w-4 h-4 text-muted-foreground" />} 
          loading={isSummaryLoading} 
        />
        <StatCard 
          title="Completed Tasks" 
          value={summary?.completedTasks} 
          icon={<CheckCircle2 className="w-4 h-4 text-muted-foreground" />} 
          loading={isSummaryLoading} 
        />
        <StatCard 
          title="Overdue Tasks" 
          value={summary?.overdueTasks} 
          icon={<AlertCircle className="w-4 h-4 text-destructive" />} 
          loading={isSummaryLoading} 
          valueClassName={summary?.overdueTasks ? "text-destructive" : ""}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>What happened recently across your projects</CardDescription>
          </CardHeader>
          <CardContent>
            {isActivityLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activity?.length ? (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                      {item.actorAvatarUrl ? (
                        <img src={item.actorAvatarUrl} alt={item.actorName} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold">{item.actorName.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold">{item.actorName}</span>{' '}
                        <span className="text-muted-foreground">{item.description}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.createdAt), "MMM d, h:mm a")}
                        {item.projectName && (
                          <>
                            <span className="mx-1">•</span>
                            <Link href={`/projects/${item.projectId}`} className="hover:underline hover:text-primary transition-colors">
                              {item.projectName}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Tasks by Status</CardTitle>
              <CardDescription>Snapshot of your workload</CardDescription>
            </CardHeader>
            <CardContent>
              {isSummaryLoading ? (
                <Skeleton className="h-[150px] w-full" />
              ) : summary ? (
                <div className="space-y-4">
                  <StatusRow label="To Do" value={summary.tasksByStatus.todo} total={summary.activeTasks + summary.completedTasks} color="bg-slate-300 dark:bg-slate-600" />
                  <StatusRow label="In Progress" value={summary.tasksByStatus.in_progress} total={summary.activeTasks + summary.completedTasks} color="bg-blue-500" />
                  <StatusRow label="In Review" value={summary.tasksByStatus.in_review} total={summary.activeTasks + summary.completedTasks} color="bg-amber-500" />
                  <StatusRow label="Done" value={summary.tasksByStatus.done} total={summary.activeTasks + summary.completedTasks} color="bg-green-500" />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Overdue Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isOverdueLoading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : overdue?.length ? (
                <div className="space-y-3">
                  {overdue.slice(0, 3).map(task => (
                    <div key={task.id} className="text-sm">
                      <Link href={`/projects/${task.projectId}`} className="font-medium hover:underline hover:text-primary block truncate">
                        {task.title}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5 flex justify-between">
                        <span>{task.projectName}</span>
                        <span className="text-destructive font-medium">{task.dueDate ? format(new Date(task.dueDate), "MMM d") : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You have no overdue tasks. Great job!</p>
              )}
            </CardContent>
            {overdue && overdue.length > 3 && (
              <CardFooter className="pt-0">
                <Link href="/tasks" className="text-xs text-primary font-medium hover:underline flex items-center">
                  View all overdue ({overdue.length}) <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading, valueClassName = "" }: { title: string; value?: number; icon: React.ReactNode; loading?: boolean; valueClassName?: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-3xl font-bold tracking-tight ${valueClassName}`}>{value || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
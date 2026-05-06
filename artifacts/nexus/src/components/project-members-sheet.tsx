import { useState } from "react";
import { 
  useListProjectMembers, 
  useAddProjectMember, 
  useUpdateProjectMember, 
  useRemoveProjectMember, 
  getListProjectMembersQueryKey,
  getGetProjectQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, User, Trash2, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const addMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "member"])
});

export function ProjectMembersSheet({ 
  projectId, 
  open, 
  onOpenChange,
  myRole
}: { 
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myRole?: string | null;
}) {
  const { data: members, isLoading } = useListProjectMembers(projectId, {
    query: { enabled: open && !!projectId, queryKey: getListProjectMembersQueryKey(projectId) }
  });
  
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const addMember = useAddProjectMember();
  const updateMember = useUpdateProjectMember();
  const removeMember = useRemoveProjectMember();
  
  const isAdmin = myRole === "admin";

  const form = useForm<z.infer<typeof addMemberSchema>>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "member" }
  });

  const onAddMember = (values: z.infer<typeof addMemberSchema>) => {
    addMember.mutate(
      { id: projectId, data: values },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          form.reset();
          toast({ title: "Member added" });
        },
        onError: (err: any) => {
          const errorMessage = err?.response?.data?.error || err?.message || "Failed to add member";
          toast({ title: "Error", description: errorMessage, variant: "destructive" });
        }
      }
    );
  };

  const handleRoleChange = (memberId: number, newRole: "admin" | "member") => {
    updateMember.mutate(
      { id: projectId, memberId, data: { role: newRole } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          toast({ title: "Role updated" });
        }
      }
    );
  };

  const handleRemove = (memberId: number) => {
    removeMember.mutate(
      { id: projectId, memberId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListProjectMembersQueryKey(projectId) });
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          toast({ title: "Member removed" });
        }
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Project Members</SheetTitle>
        </SheetHeader>
        
        {isAdmin && (
          <div className="mt-6 p-4 bg-muted/30 border border-border rounded-lg">
            <h4 className="text-sm font-medium mb-3">Add New Member</h4>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddMember)} className="flex gap-2">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl><Input placeholder="Email address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem className="w-24 shrink-0">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <Button type="submit" size="icon" disabled={addMember.isPending}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </form>
            </Form>
          </div>
        )}

        <div className="mt-6 flex-1 overflow-y-auto">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Team ({members?.length || 0})</h4>
          <div className="space-y-4">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                </div>
              ))
            ) : members?.map(member => {
              const isPending = (member as any).pending === true;
              return (
                <div key={member.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Avatar className={isPending ? "opacity-50" : ""}>
                      <AvatarImage src={member.avatarUrl || ""} />
                      <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">{member.name}</p>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-2.5 h-2.5" /> Invite pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      {member.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                      <span className="capitalize">{member.role}</span>
                    </div>
                    
                    {isAdmin && !isPending && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="sr-only">Open menu</span>
                            <Shield className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRoleChange(member.id, member.role === 'admin' ? 'member' : 'admin')}>
                            Make {member.role === 'admin' ? 'Member' : 'Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleRemove(member.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {isAdmin && isPending && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleRemove(Math.abs(member.id))}
                        title="Cancel invite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
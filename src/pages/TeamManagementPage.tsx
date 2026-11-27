import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createFarmTask,
  createTeamMember,
  deleteFarmTask,
  deleteTeamMember,
  subscribeCollection,
  updateFarmTaskStatus,
  where
} from '../services/firestoreService';
import type { FarmTask, FarmTeamMember } from '../types';
import { EmptyState, FeedbackBanner, PageHeader, SectionCard, StatusLabel } from '../components/UI';

export function TeamManagementPage() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid;

  const [members, setMembers] = useState<FarmTeamMember[]>([]);
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Member form
  const [memberName, setMemberName] = useState('');
  const [roleTitle, setRoleTitle] = useState('Field Supervisor');
  const [memberPhone, setMemberPhone] = useState('');
  const [assignedArea, setAssignedArea] = useState('');

  // Task form
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assignedMemberName, setAssignedMemberName] = useState('');
  const [priority, setPriority] = useState<FarmTask['priority']>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeCollection<FarmTeamMember>('farm_teams', [where('farmerId', '==', uid)], (list) => {
      setMembers(list);
      if (list.length > 0) setAssignedMemberName((prev) => prev || list[0].memberName);
    });
    const u2 = subscribeCollection<FarmTask>('farm_tasks', [where('farmerId', '==', uid)], setTasks);
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createTeamMember({
        memberName,
        roleTitle,
        phone: memberPhone,
        assignedArea,
        status: 'active'
      });
      setMemberName('');
      setMemberPhone('');
      setAssignedArea('');
      setFeedback({ type: 'success', message: 'Team member added.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add member.' });
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createFarmTask({
        taskName,
        description: taskDesc,
        assignedMemberName: assignedMemberName || 'Unassigned',
        priority,
        dueDate,
        status: 'todo'
      });
      setTaskName('');
      setTaskDesc('');
      setFeedback({ type: 'success', message: 'Task assigned and notification logged.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create task.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Farm Team & Tasks"
        subtitle="Manage field workers, assign agricultural responsibilities, set deadlines, and track task completion."
      />

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-5">
          <SectionCard title="Add Team Member">
            <form onSubmit={handleAddMember} className="space-y-3">
              <input required value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Member full name *" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <input required value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Role (e.g. Irrigation Operator)" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                <input value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} placeholder="Phone (optional)" className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <input value={assignedArea} onChange={(e) => setAssignedArea(e.target.value)} placeholder="Assigned plot / responsibility" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg">
                Add Member
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-7">
          <SectionCard title={`Farm Team (${members.length})`}>
            {members.length === 0 ? (
              <EmptyState title="No team members added" description="Register farm workers and supervisors to assign field tasks." />
            ) : (
              <div className="divide-y divide-[#EEF0EB]">
                {members.map((m) => (
                  <div key={m.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#1C1F1D]">{m.memberName}</p>
                      <p className="text-xs text-[#525B56]">
                        {m.roleTitle} {m.assignedArea ? `· ${m.assignedArea}` : ''} {m.phone ? `· ${m.phone}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={() => void deleteTeamMember(m.id)} className="p-1.5 text-[#525B56] hover:text-[#B91C1C]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <SectionCard title="Assign Farm Task">
            <form onSubmit={handleAddTask} className="space-y-3">
              <input required value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Task name (e.g. Inspect drip lines in Plot B) *" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              <textarea rows={2} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Detailed task notes (optional)" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              <div>
                <label className="block text-xs font-semibold text-[#37413C] mb-1">Assign To *</label>
                {members.length > 0 ? (
                  <select value={assignedMemberName} onChange={(e) => setAssignedMemberName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                    {members.map((m) => (
                      <option key={m.id} value={m.memberName}>{m.memberName} ({m.roleTitle})</option>
                    ))}
                  </select>
                ) : (
                  <input required value={assignedMemberName} onChange={(e) => setAssignedMemberName(e.target.value)} placeholder="Assignee name" className="w-full px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={priority} onChange={(e) => setPriority(e.target.value as FarmTask['priority'])} className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg bg-white">
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="px-3 py-2 text-sm border border-[#D3D9CE] rounded-lg" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-medium rounded-lg">
                Create & Assign Task
              </button>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-7">
          <SectionCard title={`Task Board (${tasks.length})`}>
            {tasks.length === 0 ? (
              <EmptyState title="No tasks assigned" description="Create tasks with priorities and due dates to coordinate daily farm work." />
            ) : (
              <div className="divide-y divide-[#EEF0EB]">
                {tasks.map((task) => (
                  <div key={task.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-semibold text-[#1C1F1D]">{task.taskName}</p>
                        <StatusLabel status={task.priority} />
                      </div>
                      <p className="text-xs text-[#525B56] mt-0.5 tabular-nums">
                        Assigned to {task.assignedMemberName} · Due {task.dueDate}
                      </p>
                      {task.description && <p className="text-xs text-[#37413C] mt-1">{task.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        aria-label="Task status"
                        value={task.status}
                        onChange={(e) => void updateFarmTaskStatus(task.id, e.target.value as FarmTask['status'])}
                        className="px-2.5 py-1.5 text-xs border border-[#D3D9CE] rounded-md bg-white"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button type="button" onClick={() => void deleteFarmTask(task.id)} className="p-1.5 text-[#525B56] hover:text-[#B91C1C]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

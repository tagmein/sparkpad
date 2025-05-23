"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Title, Text, Button, Group, Card, Stack, TextInput, ActionIcon, Menu, Badge, Tooltip, Modal, Textarea, Select, MultiSelect, SegmentedControl, Paper, Input, SimpleGrid, RingProgress, Center, Box } from "@mantine/core";
import { IconPlus, IconDotsVertical, IconEdit, IconTrash, IconShare, IconUsers, IconCalendar, IconTag, IconSearch, IconFilter, IconSortAscending, IconSortDescending, IconChartBar, IconChartPie, IconChartLine } from "@tabler/icons-react";
import { NavigationBar } from "@/components/NavigationBar";
import { showNotification } from "@mantine/notifications";

interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    status: 'active' | 'archived' | 'completed';
    members: number;
    tags: string[];
}

interface ProjectStats {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    archivedProjects: number;
    totalMembers: number;
    averageMembersPerProject: number;
    mostUsedTags: { tag: string; count: number }[];
    recentActivity: { type: string; project: string; time: string }[];
    projectGrowth: { date: string; count: number }[];
    memberDistribution: { project: string; members: number }[];
    statusTrend: { date: string; active: number; completed: number; archived: number }[];
    averageProjectAge: number;
    mostActiveProjects: { name: string; activityCount: number }[];
}

export default function ProjectsPage() {
    const router = useRouter();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpened, setModalOpened] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDescription, setNewProjectDescription] = useState("");
    const [newProjectStatus, setNewProjectStatus] = useState<'active' | 'archived' | 'completed'>('active');
    const [newProjectTags, setNewProjectTags] = useState("");
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [shareModalOpened, setShareModalOpened] = useState(false);
    const [shareEmail, setShareEmail] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [tagFilter, setTagFilter] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'members'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showStats, setShowStats] = useState(false);
    const [creatingProject, setCreatingProject] = useState(false);

    useEffect(() => {
        if (searchParams && searchParams.get('showStats') === '1') {
            setShowStats(true);
        }
    }, []);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const userEmail = localStorage.getItem("user:username");
                if (!userEmail) {
                    router.push("/");
                    return;
                }
                const res = await fetch(
                    `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`
                );
                if (!res.ok) throw new Error("Failed to fetch projects");
                const text = await res.text();
                const data = text ? JSON.parse(text) : [];
                setProjects(Array.isArray(data) ? data : []);
            } catch (err: any) {
                setError(err.message);
                showNotification({
                    title: "Error",
                    message: "Failed to load projects. Please try again.",
                    color: "red",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [router]);

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        setCreatingProject(true);
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) {
                router.replace("/login");
                return;
            }
            const res = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`);
            let projects = [];
            if (res.ok) {
                const text = await res.text();
                projects = text ? JSON.parse(text) : [];
            }
            const newProject = {
                id: Date.now().toString(),
                name: newProjectName.trim(),
                description: newProjectDescription.trim(),
                status: newProjectStatus,
                tags: newProjectTags.split(",").map(tag => tag.trim()).filter(Boolean),
                createdAt: new Date().toISOString(),
                members: [userEmail],
            };
            projects.push(newProject);
            const saveRes = await fetch(`http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(projects),
            });
            if (!saveRes.ok) throw new Error("Failed to create project");
            setProjects(projects);
            setModalOpened(false);
            setNewProjectName("");
            setNewProjectDescription("");
            setNewProjectStatus("active");
            setNewProjectTags("");
            showNotification({ title: "Success", message: "Project created!", color: "green" });

            // Dispatch project notification event
            window.dispatchEvent(new CustomEvent('projectNotification', {
                detail: {
                    type: 'project',
                    projectName: newProject.name,
                    projectId: newProject.id,
                    message: `New project "${newProject.name}" has been created`
                }
            }));
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to create project", color: "red" });
        } finally {
            setCreatingProject(false);
        }
    };

    const handleEditProject = async (project: Project) => {
        setEditingProject(project);
        setNewProjectName(project.name);
        setNewProjectDescription(project.description);
        setNewProjectStatus(project.status);
        setNewProjectTags(project.tags.join(', '));
        setModalOpened(true);
    };

    const handleUpdateProject = async () => {
        if (!editingProject) return;
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) throw new Error("User not found");
            const updatedProject: Project = {
                ...editingProject,
                name: newProjectName,
                description: newProjectDescription,
                status: newProjectStatus,
                tags: newProjectTags.split(',').map(tag => tag.trim()).filter(Boolean),
            };
            const updatedProjects = projects.map(p => p.id === editingProject.id ? updatedProject : p);
            const res = await fetch(
                `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`,
                {
                    method: "POST",
                    body: JSON.stringify(updatedProjects),
                }
            );
            if (!res.ok) throw new Error("Failed to update project");
            setProjects(updatedProjects);
            setModalOpened(false);
            setEditingProject(null);
            setNewProjectName("");
            setNewProjectDescription("");
            setNewProjectStatus('active');
            setNewProjectTags("");

            // Add notification for project update
            window.dispatchEvent(new CustomEvent('projectNotification', {
                detail: {
                    type: 'update',
                    projectName: newProjectName,
                    projectId: editingProject.id,
                    message: `Project "${newProjectName}" has been updated`
                }
            }));

            showNotification({
                title: "Success",
                message: "Project updated successfully!",
                color: "green",
            });
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Failed to update project",
                color: "red",
            });
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) throw new Error("User not found");
            const project = projects.find(p => p.id === projectId);
            if (!project) throw new Error("Project not found");
            const updatedProjects = projects.filter(p => p.id !== projectId);
            const res = await fetch(
                `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`,
                {
                    method: "POST",
                    body: JSON.stringify(updatedProjects),
                }
            );
            if (!res.ok) throw new Error("Failed to delete project");
            setProjects(updatedProjects);

            // Add notification for project deletion
            window.dispatchEvent(new CustomEvent('projectNotification', {
                detail: {
                    type: 'system',
                    projectName: project.name,
                    projectId: projectId,
                    message: `Project "${project.name}" has been deleted`
                }
            }));

            showNotification({
                title: "Success",
                message: "Project deleted successfully!",
                color: "green",
            });
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Failed to delete project",
                color: "red",
            });
        }
    };

    const handleShareProject = async (projectId: string) => {
        try {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) throw new Error("User not found");
            const project = projects.find(p => p.id === projectId);
            if (!project) throw new Error("Project not found");
            const updatedProject = {
                ...project,
                members: project.members + 1,
            };
            const updatedProjects = projects.map(p => p.id === projectId ? updatedProject : p);
            const res = await fetch(
                `http://localhost:3333/projects?mode=disk&key=${encodeURIComponent(userEmail)}`,
                {
                    method: "POST",
                    body: JSON.stringify(updatedProjects),
                }
            );
            if (!res.ok) throw new Error("Failed to share project");
            setProjects(updatedProjects);
            setShareModalOpened(false);
            setShareEmail("");

            // Add notification for project sharing
            window.dispatchEvent(new CustomEvent('projectNotification', {
                detail: {
                    type: 'project',
                    projectName: project.name,
                    projectId: projectId,
                    message: `Project "${project.name}" has been shared with ${shareEmail}`
                }
            }));

            showNotification({
                title: "Success",
                message: "Project shared successfully!",
                color: "green",
            });
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Failed to share project",
                color: "red",
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green';
            case 'archived':
                return 'gray';
            case 'completed':
                return 'blue';
            default:
                return 'gray';
        }
    };

    // Get unique tags from all projects
    const safeProjects = Array.isArray(projects) ? projects : [];
    const allTags = Array.from(new Set(safeProjects.flatMap(project => project.tags)));

    // Filter and sort projects
    const filteredAndSortedProjects = safeProjects
        .filter(project => {
            const matchesSearch = (project.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (project.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(project.status);
            const matchesTags = tagFilter.length === 0 || tagFilter.some(tag => project.tags.includes(tag));
            return matchesSearch && matchesStatus && matchesTags;
        })
        .sort((a, b) => {
            if (sortBy === 'name') {
                return sortOrder === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else if (sortBy === 'date') {
                return sortOrder === 'asc'
                    ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else {
                return sortOrder === 'asc'
                    ? a.members - b.members
                    : b.members - a.members;
            }
        });

    // Calculate project statistics
    const projectStats: ProjectStats = {
        totalProjects: safeProjects.length,
        activeProjects: safeProjects.filter(p => p.status === 'active').length,
        completedProjects: safeProjects.filter(p => p.status === 'completed').length,
        archivedProjects: safeProjects.filter(p => p.status === 'archived').length,
        totalMembers: safeProjects.reduce((sum, p) => sum + p.members, 0),
        averageMembersPerProject: safeProjects.length ? Math.round(safeProjects.reduce((sum, p) => sum + p.members, 0) / safeProjects.length) : 0,
        mostUsedTags: Object.entries(
            safeProjects.flatMap(p => p.tags).reduce((acc, tag) => {
                acc[tag] = (acc[tag] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        )
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        recentActivity: safeProjects
            .map(p => [
                { type: 'created', project: p.name, time: p.createdAt },
                ...(p.members > 1 ? [{ type: 'shared', project: p.name, time: p.createdAt }] : [])
            ])
            .flat()
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 5),
        projectGrowth: safeProjects
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .reduce((acc, project) => {
                const date = new Date(project.createdAt).toLocaleDateString();
                const lastCount = acc.length > 0 ? acc[acc.length - 1].count : 0;
                acc.push({ date, count: lastCount + 1 });
                return acc;
            }, [] as { date: string; count: number }[]),
        memberDistribution: safeProjects
            .map(p => ({ project: p.name, members: p.members }))
            .sort((a, b) => b.members - a.members)
            .slice(0, 5),
        statusTrend: safeProjects
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .reduce((acc, project) => {
                const date = new Date(project.createdAt).toLocaleDateString();
                const lastStatus = acc.length > 0 ? acc[acc.length - 1] : { date, active: 0, completed: 0, archived: 0 };
                const newStatus = { ...lastStatus, date };
                newStatus[project.status]++;
                acc.push(newStatus);
                return acc;
            }, [] as { date: string; active: number; completed: number; archived: number }[]),
        averageProjectAge: safeProjects.length
            ? Math.round(safeProjects.reduce((sum, p) => {
                const age = Date.now() - new Date(p.createdAt).getTime();
                return sum + age;
            }, 0) / safeProjects.length / (1000 * 60 * 60 * 24)) // Convert to days
            : 0,
        mostActiveProjects: safeProjects
            .map(p => ({
                name: p.name,
                activityCount: p.members + (p.tags?.length || 0) + (p.status === 'active' ? 1 : 0)
            }))
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, 5)
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <NavigationBar showBackButton />
            <Container size="lg" py="xl">
                <Group justify="space-between" mb="xl">
                    <div>
                        <Title order={2}>Projects</Title>
                        <Text c="dimmed" size="sm">Manage your projects and collaborate with your team</Text>
                    </div>
                    <Group>
                        <Button
                            variant="light"
                            color="violet"
                            leftSection={<IconChartBar size={16} />}
                            onClick={() => setShowStats(!showStats)}
                            style={{ borderWidth: 2 }}
                        >
                            {showStats ? 'Hide Statistics' : 'Show Statistics'}
                        </Button>
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={() => {
                                setEditingProject(null);
                                setNewProjectName("");
                                setNewProjectDescription("");
                                setNewProjectStatus('active');
                                setNewProjectTags("");
                                setModalOpened(true);
                            }}
                        >
                            New Project
                        </Button>
                    </Group>
                </Group>

                {showStats && (
                    <Paper withBorder p="md" mb="xl" radius="md" style={{ borderWidth: 2, borderColor: 'var(--mantine-color-violet-6)' }}>
                        <Stack>
                            <Group justify="space-between" align="center">
                                <Title order={3}>Project Statistics</Title>
                                <Button
                                    variant="subtle"
                                    color="violet"
                                    size="sm"
                                    onClick={() => setShowStats(false)}
                                >
                                    Hide Statistics
                                </Button>
                            </Group>
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                                <Card withBorder p="md" radius="md">
                                    <Stack align="center" gap="xs">
                                        <RingProgress
                                            size={80}
                                            thickness={8}
                                            sections={[
                                                { value: (projectStats.activeProjects / projectStats.totalProjects) * 100, color: 'green' },
                                                { value: (projectStats.completedProjects / projectStats.totalProjects) * 100, color: 'blue' },
                                                { value: (projectStats.archivedProjects / projectStats.totalProjects) * 100, color: 'gray' }
                                            ]}
                                            label={
                                                <Center>
                                                    <Text size="xs" fw={700}>
                                                        {projectStats.totalProjects}
                                                    </Text>
                                                </Center>
                                            }
                                        />
                                        <Text size="sm" fw={500}>Total Projects</Text>
                                        <Group gap="xs">
                                            <Badge color="green">{projectStats.activeProjects} Active</Badge>
                                            <Badge color="blue">{projectStats.completedProjects} Completed</Badge>
                                            <Badge color="gray">{projectStats.archivedProjects} Archived</Badge>
                                        </Group>
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack align="center" gap="xs">
                                        <IconUsers size={40} color="var(--mantine-color-blue-6)" />
                                        <Text size="xl" fw={700}>{projectStats.totalMembers}</Text>
                                        <Text size="sm" fw={500}>Total Members</Text>
                                        <Text size="xs" c="dimmed">
                                            {projectStats.averageMembersPerProject} members per project
                                        </Text>
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Most Used Tags</Text>
                                        {(projectStats.mostUsedTags || []).map(({ tag, count }) => (
                                            <Group key={tag} justify="space-between">
                                                <Badge variant="light">{tag}</Badge>
                                                <Text size="sm">{count} projects</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Recent Activity</Text>
                                        {(projectStats.recentActivity || []).map((activity, index) => (
                                            <Group key={index} gap="xs">
                                                <IconCalendar size={16} />
                                                <Text size="sm" style={{ flex: 1 }}>
                                                    {activity.type === 'created' ? 'Created' : 'Shared'} project "{activity.project}"
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {new Date(activity.time).toLocaleDateString()}
                                                </Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Card>
                            </SimpleGrid>

                            <Title order={4} mt="xl" mb="md">Detailed Analytics</Title>
                            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                <Card withBorder p="md" radius="md">
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Project Growth</Text>
                                        <Group gap="xs" wrap="nowrap" style={{ overflowX: 'auto', padding: '8px 0' }}>
                                            {(projectStats.projectGrowth || []).map((point, index) => (
                                                <Box key={index} style={{ minWidth: 100 }}>
                                                    <Text size="xs" c="dimmed">{point.date}</Text>
                                                    <Text size="sm" fw={500}>{point.count} projects</Text>
                                                </Box>
                                            ))}
                                        </Group>
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Member Distribution</Text>
                                        {(projectStats.memberDistribution || []).map((dist, index) => (
                                            <Group key={index} justify="space-between">
                                                <Text size="sm" style={{ flex: 1 }} truncate>{dist.project}</Text>
                                                <Badge variant="light" color="blue">{dist.members} members</Badge>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack gap="xs">
                                        <Text size="sm" fw={500}>Status Trend</Text>
                                        <Group gap="xs" wrap="nowrap" style={{ overflowX: 'auto', padding: '8px 0' }}>
                                            {(projectStats.statusTrend || []).map((point, index) => (
                                                <Box key={index} style={{ minWidth: 120 }}>
                                                    <Text size="xs" c="dimmed">{point.date}</Text>
                                                    <Group gap={4}>
                                                        <Badge size="xs" color="green">{point.active}</Badge>
                                                        <Badge size="xs" color="blue">{point.completed}</Badge>
                                                        <Badge size="xs" color="gray">{point.archived}</Badge>
                                                    </Group>
                                                </Box>
                                            ))}
                                        </Group>
                                    </Stack>
                                </Card>
                                <Card withBorder p="md" radius="md">
                                    <Stack gap="xs">
                                        <Group justify="space-between">
                                            <Text size="sm" fw={500}>Most Active Projects</Text>
                                            <Text size="xs" c="dimmed">Avg. Age: {projectStats.averageProjectAge} days</Text>
                                        </Group>
                                        {(projectStats.mostActiveProjects || []).map((project, index) => (
                                            <Group key={index} justify="space-between">
                                                <Text size="sm" style={{ flex: 1 }} truncate>{project.name}</Text>
                                                <Badge variant="light" color="violet">{project.activityCount} activities</Badge>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Card>
                            </SimpleGrid>
                        </Stack>
                    </Paper>
                )}

                <Paper withBorder p="md" mb="xl" radius="md">
                    <Stack>
                        <Group>
                            <Input
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                                leftSection={<IconSearch size={16} />}
                                style={{ flex: 1 }}
                            />
                            <SegmentedControl
                                value={viewMode}
                                onChange={(value) => setViewMode(value as 'grid' | 'list')}
                                data={[
                                    { label: 'Grid', value: 'grid' },
                                    { label: 'List', value: 'list' },
                                ]}
                            />
                        </Group>
                        <Group>
                            <MultiSelect
                                placeholder="Filter by status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                data={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'archived', label: 'Archived' },
                                    { value: 'completed', label: 'Completed' },
                                ]}
                                leftSection={<IconFilter size={16} />}
                                style={{ width: 200 }}
                            />
                            <MultiSelect
                                placeholder="Filter by tags"
                                value={(tagFilter || []).filter((v): v is string => typeof v === 'string' && v)}
                                onChange={setTagFilter}
                                data={(allTags || []).filter((tag): tag is string => typeof tag === 'string' && tag).map(tag => ({ value: tag, label: tag }))}
                                leftSection={<IconTag size={16} />}
                                style={{ width: 200 }}
                            />
                            <Select
                                placeholder="Sort by"
                                value={sortBy}
                                onChange={(value) => setSortBy(value as 'name' | 'date' | 'members')}
                                data={[
                                    { value: 'name', label: 'Name' },
                                    { value: 'date', label: 'Date' },
                                    { value: 'members', label: 'Members' },
                                ]}
                                leftSection={<IconSortAscending size={16} />}
                                style={{ width: 150 }}
                            />
                            <ActionIcon
                                variant="light"
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                title={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
                            >
                                {sortOrder === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />}
                            </ActionIcon>
                        </Group>
                    </Stack>
                </Paper>

                {loading ? (
                    <Text>Loading projects...</Text>
                ) : error ? (
                    <Text c="red">{error}</Text>
                ) : filteredAndSortedProjects.length === 0 ? (
                    <Card withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
                        <Stack align="center" gap="md">
                            <Text size="lg" fw={500}>No projects found</Text>
                            <Text c="dimmed">
                                {searchQuery || statusFilter.length > 0 || tagFilter.length > 0
                                    ? "Try adjusting your filters or search query"
                                    : "Create your first project to get started"}
                            </Text>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                onClick={() => setModalOpened(true)}
                            >
                                Create Project
                            </Button>
                        </Stack>
                    </Card>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
                        gap: '1rem'
                    }}>
                        {(filteredAndSortedProjects || []).map((project) => (
                            <Card key={project.id} withBorder shadow="sm" radius="md" p="lg">
                                <Group justify="space-between" mb="md">
                                    <div>
                                        <Text fw={500} size="lg">{project.name}</Text>
                                        <Badge color={getStatusColor(project.status)} size="sm">
                                            {project.status}
                                        </Badge>
                                    </div>
                                    <Menu shadow="md" width={200}>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle" color="gray">
                                                <IconDotsVertical size={16} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item
                                                leftSection={<IconEdit size={16} />}
                                                onClick={() => handleEditProject(project)}
                                            >
                                                Edit
                                            </Menu.Item>
                                            <Menu.Item
                                                leftSection={<IconShare size={16} />}
                                                onClick={() => {
                                                    setEditingProject(project);
                                                    setShareModalOpened(true);
                                                }}
                                            >
                                                Share
                                            </Menu.Item>
                                            <Menu.Item
                                                leftSection={<IconTrash size={16} />}
                                                color="red"
                                                onClick={() => handleDeleteProject(project.id)}
                                            >
                                                Delete
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Group>
                                <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                                    {project.description}
                                </Text>
                                <Group gap="xs" mb="md">
                                    {(project.tags || []).map((tag, index) => (
                                        <Badge key={index} variant="light" color="violet" size="sm">
                                            {tag}
                                        </Badge>
                                    ))}
                                </Group>
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <Tooltip label="Members">
                                            <Group gap={4}>
                                                <IconUsers size={16} />
                                                <Text size="sm">{project.members}</Text>
                                            </Group>
                                        </Tooltip>
                                        <Tooltip label="Created">
                                            <Group gap={4}>
                                                <IconCalendar size={16} />
                                                <Text size="sm">
                                                    {new Date(project.createdAt).toLocaleDateString()}
                                                </Text>
                                            </Group>
                                        </Tooltip>
                                    </Group>
                                    <Button
                                        variant="light"
                                        size="sm"
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                    >
                                        View Details
                                    </Button>
                                </Group>
                            </Card>
                        ))}
                    </div>
                )}
            </Container>

            <Modal
                opened={modalOpened}
                onClose={() => {
                    setModalOpened(false);
                    setEditingProject(null);
                }}
                title={editingProject ? "Edit Project" : "New Project"}
                centered
            >
                <Stack>
                    <TextInput
                        label="Project Name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.currentTarget.value)}
                        required
                    />
                    <Textarea
                        label="Description"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.currentTarget.value)}
                        minRows={3}
                    />
                    <Select
                        label="Status"
                        value={newProjectStatus}
                        onChange={(value) => setNewProjectStatus(value as 'active' | 'archived' | 'completed')}
                        data={[
                            { value: 'active', label: 'Active' },
                            { value: 'archived', label: 'Archived' },
                            { value: 'completed', label: 'Completed' },
                        ]}
                    />
                    <TextInput
                        label="Tags (comma-separated)"
                        value={newProjectTags}
                        onChange={(e) => setNewProjectTags(e.currentTarget.value)}
                        placeholder="e.g. web, design, marketing"
                    />
                    <Button
                        onClick={editingProject ? handleUpdateProject : handleCreateProject}
                        fullWidth
                    >
                        {editingProject ? "Update Project" : "Create Project"}
                    </Button>
                </Stack>
            </Modal>

            <Modal
                opened={shareModalOpened}
                onClose={() => setShareModalOpened(false)}
                title="Share Project"
                centered
            >
                <Stack>
                    <TextInput
                        label="Email Address"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.currentTarget.value)}
                        placeholder="Enter email address to share with"
                        required
                    />
                    <Button
                        onClick={() => editingProject && handleShareProject(editingProject.id)}
                        fullWidth
                    >
                        Share Project
                    </Button>
                </Stack>
            </Modal>
        </div>
    );
} 
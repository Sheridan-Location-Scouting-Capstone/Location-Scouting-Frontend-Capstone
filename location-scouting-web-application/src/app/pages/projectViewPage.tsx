const projects: ProjectSchema[] = [];

const project1: ProjectSchema = {
    id: 0,
    name: "The Dark Knight",
    scenes: ['scene1,scene2,scene3'],
    locations: ['Toronto', 'Oakville', 'Mississauga']
}

const project2: ProjectSchema = {
    id:1,
    name: "The Dark Knight 2",
    scenes: ['scene1,scene2,scene3'],
    locations: ['Toronto', 'Oakville', 'Mississauga']
}

const project3: ProjectSchema = {
    id:3,
    name: "The Dark Knight 2",
    scenes: ['scene1,scene2,scene3'],
    locations: ['Toronto', 'Oakville', 'Mississauga']
}

const project4: ProjectSchema = {
    id:4,
    name: "The Dark Knight 2",
    scenes: ['scene1,scene2,scene3'],
    locations: ['Toronto', 'Oakville', 'Mississauga']
}

const project5: ProjectSchema = {
    id:5,
    name: "The Dark Knight 2",
    scenes: ['scene1,scene2,scene3'],
    locations: ['Toronto', 'Oakville', 'Mississauga']
}

const project6: ProjectSchema = {
    id:6,
    name: "The Dark Knight 2",
    scenes: ['scene1,scene2,scene3'],
    locations: ['Toronto', 'Oakville', 'Mississauga']
}

const project7: ProjectSchema = {
    id:7,
    name: "The Dark Knight 2",
    scenes: ['scene1,scene2,scene3'],
    locations: ['Toronto', 'Oakville', 'Mississauga']
}
const project8: ProjectSchema = {
    id:8,
    name: "The Dark Knight 2",
    scenes: ['scene1,scene2,scene3'],
    locations: ['Toronto', 'Oakville', 'Mississauga']
}


projects.push(project1, project2, project3, project4, project5, project6, project7, project8);

function getProjectById(id: string): ProjectSchema | undefined {
    const numericId = parseInt(id);
    console.log(`Project id wtv ${id}`)
    return projects.find(project => project.id === numericId);
}

export default function ProjectViewPage({ id }: {  id: string }) {
    console.log(`received id ${id}`)
    const project = getProjectById(id);

    if (!project) {
        return <div>Project not found</div>;
    }

    return (
        <div>
            <div>Project view page {project.id}</div>
            <div>{project.locations}</div>
            <div>{project.name}</div>
            <div>{project.scenes}</div>
        </div>
    );
}
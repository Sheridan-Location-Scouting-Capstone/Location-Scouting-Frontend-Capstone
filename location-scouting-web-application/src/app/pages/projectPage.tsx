// reference: https://react.dev/learn/rendering-lists

export function ProjectPage() {
    
    const projects :ProjectSchema[] = [];

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

    const listItems = projects.map(project =>
        <li key={project.id} className="p-10 bg-gray-800 mb-5">
            <div>{project.name}</div>
        </li>
    );
    return (
        <div className="grid grid-rows-[50px_1fr] h-full">
            <div className="text-2xl" col-span-1>
                Projects
            </div>
            <div className="overflow-y-auto">
                <ul>{listItems}</ul>
            </div>
        </div>
    );
}
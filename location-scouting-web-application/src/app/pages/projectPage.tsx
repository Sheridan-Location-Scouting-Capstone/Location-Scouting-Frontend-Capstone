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

    projects.push(project1, project2);

    const listItems = projects.map(project =>
        <li key={project.id} className="bg-gray-800 mb-5">
            <div>Name: {project.name}</div>
            <div>scenes: {project.scenes}</div>
            <div>locations: {project.locations}</div>
        </li>
    );
    return (

        <div className="grid grid-rows-[50px_1fr]">
            <div className="text-2xl" col-span-1>
                Projects
            </div>
            <div className="col-span-1">
                <ul>{listItems}</ul>
            </div>
            
        </div>
        
    );
}
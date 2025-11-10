// schemas are created as typescript interfaces, similar to how props are created and passed into a component
// we will need to implement zed later for api integration
// interface ProjectSchema {
//     id:         number;
//     name:       string;
//     scenes:     string[];
//     locations:  string[];
// }

interface ProjectSchema {
    id:         number;
    name:       string;
    street:     string;
    city:       string;
    province:   string;
    postal:     string;
}